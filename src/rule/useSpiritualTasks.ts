import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { defaultTasks, type SpiritualTask, type TaskCategory } from "./tasks";
import type { DailyLiturgy } from "../liturgy/types";

interface TaskRow {
  id: string;
  title: string;
  category: TaskCategory;
  cadence: "daily" | "weekly" | "monthly";
  time: string | null;
  required: boolean;
  done: boolean;
}

const iconFor = (category: TaskCategory) =>
  ({
    ofrecimiento: "🌅",
    laudes: "☀️",
    angelus: "🕊️",
    rosary: "📿",
    gospel: "📖",
    psalm: "🎵",
    first_reading: "📜",
    second_reading: "📜",
    silence: "🤫",
    mass: "⛪",
    examen: "🕯️",
    fasting: "🍞",
    confession: "🙏",
    vespers: "🌇",
    custom: "🙏",
  })[category] ?? "🙏";

const mapRow = (row: TaskRow): SpiritualTask => ({
  id: row.id,
  title: row.title,
  category: row.category,
  cadence: row.cadence,
  time: row.time ?? undefined,
  required: row.required,
  done: row.done,
  icon: iconFor(row.category),
});

export function useSpiritualTasks(liturgy: DailyLiturgy | null) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<SpiritualTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    let active = true;
    const today = new Date().toISOString().slice(0, 10);

    const load = async () => {
      // RPC idempotente: crea las tareas base del día si aún no existen.
      const dayOfWeek = new Date(`${today}T00:00:00`).getDay();
      const isSunday = dayOfWeek === 0;
      const isFastingDay = dayOfWeek === 3 || dayOfWeek === 5; // Wed, Fri
      await client.rpc("ensure_daily_spiritual_tasks", {
        p_date: today,
        p_is_sunday: isSunday,
        p_is_solemnity: Boolean(liturgy?.isSolemnity),
        p_is_fasting_day: isFastingDay,
        p_day_of_month: new Date(`${today}T00:00:00`).getDate(),
      });
      const { data } = await client
        .from("spiritual_tasks")
        .select("id,title,category,cadence,time,required,done")
        .eq("profile_id", user.id)
        .eq("task_date", today)
        .order("time");
      if (active) {
        setTasks(((data ?? []) as TaskRow[]).map(mapRow));
        setLoading(false);
      }
    };
    void load();

    const channel = client
      .channel(`spiritual-tasks-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spiritual_tasks", filter: `profile_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [user, liturgy?.isSolemnity]);

  const toggle = useCallback(async (id: string, done: boolean) => {
    if (!supabase || !user) return false;
    const { error } = await supabase
      .from("spiritual_tasks")
      .update({ done, completed_at: done ? new Date().toISOString() : null })
      .eq("id", id)
      .eq("profile_id", user.id);
    return !error;
  }, [user]);

  const add = useCallback(async (title: string) => {
    if (!supabase || !user || !title.trim()) return false;
    const { error } = await supabase.from("spiritual_tasks").insert({
      profile_id: user.id,
      title: title.trim(),
      category: "custom",
      cadence: "daily",
      task_date: new Date().toISOString().slice(0, 10),
      done: false,
    });
    return !error;
  }, [user]);

  return { tasks, loading, authenticated: !!user, toggle, add, templates: defaultTasks };
}
