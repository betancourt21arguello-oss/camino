import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { defaultTasks, type SpiritualTask, type TaskCategory } from "./tasks";
import type { DailyLiturgy } from "../liturgy/types";
import { caracasDate } from "../utils/caracas";

interface TaskRow {
  id: string;
  title: string;
  category: TaskCategory;
  cadence: "daily" | "weekly" | "monthly" | "once";
  time: string | null;
  required: boolean;
  done: boolean;
  task_date: string;
  days: number[] | null;
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
  task_date: row.task_date,
  days: row.days ?? undefined,
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
    const today = caracasDate();

    const load = async () => {
      // RPC idempotente: crea las tareas base del día si aún no existen.
      const dateObj = new Date(`${today}T00:00:00`);
      const dayOfWeek = dateObj.getDay();
      const isSunday = dayOfWeek === 0;
      const isFastingDay = dayOfWeek === 3 || dayOfWeek === 5;
      const dayOfMonth = dateObj.getDate();
      const isLastDayOfMonth = dayOfMonth === new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
      let tasksError: unknown = null;
      const sixParamPayload = {
        p_date: today,
        p_is_sunday: isSunday,
        p_is_solemnity: Boolean(liturgy?.isSolemnity),
        p_is_fasting_day: isFastingDay,
        p_day_of_month: dayOfMonth,
        p_is_last_day_of_month: isLastDayOfMonth,
      };
      const fiveParamPayload = {
        p_date: today,
        p_is_sunday: isSunday,
        p_is_solemnity: Boolean(liturgy?.isSolemnity),
        p_is_fasting_day: isFastingDay,
        p_day_of_month: dayOfMonth,
      };
      try {
        await client.rpc("ensure_daily_spiritual_tasks", sixParamPayload);
      } catch (err) {
        tasksError = err;
        try {
          await client.rpc("ensure_daily_spiritual_tasks", fiveParamPayload);
          tasksError = null;
        } catch (retryErr) {
          tasksError = retryErr;
        }
      }
      if (tasksError) {
        console.warn("[camino] ensure_daily_spiritual_tasks:", tasksError instanceof Error ? tasksError.message : String(tasksError));
      }
      try {
        await client.rpc("ensure_recurring_custom_tasks", { p_date: today });
      } catch (error) {
        console.warn("[camino] ensure_recurring_custom_tasks:", error instanceof Error ? error.message : String(error));
      }
      const { data } = await client
        .from("spiritual_tasks")
        .select("id,title,category,cadence,time,required,done,task_date,days")
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

  const add = useCallback(async (title: string, time?: string, taskDate?: string, cadence?: "daily" | "weekly" | "monthly" | "once") => {
    if (!supabase || !user || !title.trim()) return false;
    const date = taskDate || caracasDate();
    const finalCadence = cadence || "once";
    const { error } = await supabase.from("spiritual_tasks").insert({
      profile_id: user.id,
      title: title.trim(),
      category: "custom",
      cadence: finalCadence,
      time: time || null,
      task_date: date,
      days: null,
      required: false,
      done: false,
    });
    if (error) {
      console.warn("[camino] Failed to insert custom task:", error.message);
      return false;
    }
    if (finalCadence === "weekly" || finalCadence === "monthly") {
      await generateRecurringInstances(user.id, title.trim(), time, date, finalCadence);
    }
    return true;
  }, [user]);

  return { tasks, loading, authenticated: !!user, toggle, add, templates: defaultTasks };
}

function generateRecurringInstances(
  userId: string,
  title: string,
  time: string | undefined,
  startDate: string,
  cadence: "weekly" | "monthly",
) {
  if (!supabase) return;
  const start = new Date(`${startDate}T00:00:00`);
  const instances: Array<{
    p_profile_id: string;
    p_title: string;
    p_category: string;
    p_cadence: string;
    p_time: string | null;
    p_task_date: string;
    p_days: number[] | null;
    p_required: boolean;
    p_done: boolean;
  }> = [];
  if (cadence === "weekly") {
    for (let i = 7; i <= 28; i += 7) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      instances.push({
        p_profile_id: userId,
        p_title: title,
        p_category: "custom",
        p_cadence: cadence,
        p_time: time || null,
        p_task_date: dateStr,
        p_days: null,
        p_required: false,
        p_done: false,
      });
    }
  } else if (cadence === "monthly") {
    for (let m = 1; m <= 3; m++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + m);
      const dateStr = d.toISOString().slice(0, 10);
      instances.push({
        p_profile_id: userId,
        p_title: title,
        p_category: "custom",
        p_cadence: cadence,
        p_time: time || null,
        p_task_date: dateStr,
        p_days: null,
        p_required: false,
        p_done: false,
      });
    }
  }
  for (const instance of instances) {
    Promise.resolve(supabase.rpc("insert_spiritual_task", instance))
      .then(() => {})
      .catch((err: unknown) => {
        console.warn("[camino] Failed to insert recurring instance:", err instanceof Error ? err.message : String(err));
      });
  }
}
