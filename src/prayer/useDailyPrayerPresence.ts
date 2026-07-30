import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { caracasDate } from "../utils/caracas";

export type DailyPrayerKind = "laudes" | "angelus";

/**
 * Presencia real de oraciones diarias. Si la tabla aún no existe o hay
 * un error de permisos, se desactiva silenciosamente y el contador se oculta.
 */
export function useDailyPrayerPresence(kind: DailyPrayerKind, active = false) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!client || !available) return;
    let mounted = true;
    const date = caracasDate();

    const disable = () => {
      if (mounted) {
        setCount(0);
        setAvailable(false);
      }
    };

    const refresh = async () => {
      if (!mounted || !user) return;
      const { count: total, error } = await client
        .from("daily_prayer_presence")
        .select("profile_id", { count: "exact", head: true })
        .eq("prayer_kind", kind)
        .eq("prayer_date", date)
        .gte("last_seen", new Date(Date.now() - 60_000).toISOString());
      if (error) {
        disable();
        return;
      }
      if (mounted) setCount(total ?? 0);
    };

    const heartbeat = async () => {
      if (!active || !user) return;
      const { error } = await client.from("daily_prayer_presence").upsert(
        {
          profile_id: user.id,
          prayer_kind: kind,
          prayer_date: date,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "profile_id,prayer_kind,prayer_date" },
      );
      if (error) disable();
    };

    void heartbeat();
    void refresh();
    const heartbeatId = window.setInterval(heartbeat, 20_000);
    const refreshId = window.setInterval(refresh, 15_000);
    const channel = client
      .channel(`daily-presence-${kind}-${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_prayer_presence" },
        refresh,
      )
      .subscribe();

    return () => {
      mounted = false;
      window.clearInterval(heartbeatId);
      window.clearInterval(refreshId);
      void client.removeChannel(channel);
    };
  }, [kind, active, user, available]);

  return { count, hasPeople: available && count > 0 };
}
