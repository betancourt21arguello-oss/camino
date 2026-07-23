import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

export type DailyPrayerKind = "laudes" | "angelus";

/**
 * Presencia real de oraciones diarias. El contador proviene exclusivamente
 * de `daily_prayer_presence` en Supabase y se oculta cuando es cero.
 * Al entrar a un portal, `active=true` publica heartbeat cada 20 segundos.
 */
export function useDailyPrayerPresence(kind: DailyPrayerKind, active = false) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let mounted = true;
    const date = new Date().toISOString().slice(0, 10);

    const refresh = async () => {
      const { count: total } = await client
        .from("daily_prayer_presence")
        .select("profile_id", { count: "exact", head: true })
        .eq("prayer_kind", kind)
        .eq("prayer_date", date)
        .gte("last_seen", new Date(Date.now() - 60_000).toISOString());
      if (mounted) setCount(total ?? 0);
    };

    const heartbeat = async () => {
      if (!active || !user) return;
      await client.from("daily_prayer_presence").upsert(
        {
          profile_id: user.id,
          prayer_kind: kind,
          prayer_date: date,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "profile_id,prayer_kind,prayer_date" },
      );
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
  }, [kind, active, user]);

  return { count, hasPeople: count > 0 };
}
