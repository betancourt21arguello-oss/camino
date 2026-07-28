import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface RosaryLobbyData {
  roomActive: boolean;
  peopleNow: number;
  rosariesToday: number;
  usersToday: number;
  aveMariasToday: number;
}

const empty: RosaryLobbyData = {
  roomActive: false,
  peopleNow: 0,
  rosariesToday: 0,
  usersToday: 0,
  aveMariasToday: 0,
};

/** Datos exclusivamente desde Supabase. Sin fallback ficticio. */
export function useRosaryLobbyData() {
  const [data, setData] = useState<RosaryLobbyData>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }
    let active = true;

    const load = async () => {
      try {
        const { data: metrics, error } = await client.rpc("rosary_lobby_metrics");
      console.log("Fetching rosary lobby metrics", metrics);
      if (error) {
        console.error("Error fetching rosary lobby metrics:", error);
      }
        if (!active) return;
        if (error || !metrics) {
          console.error("Error fetching rosary lobby metrics:", error);
          setData(empty);
          setLoading(false);
          return;
        }
        const row = Array.isArray(metrics) ? metrics[0] : metrics;
        setData({
          roomActive: Boolean(row.room_active),
          peopleNow: Number(row.people_now ?? 0),
          rosariesToday: Number(row.rosaries_today ?? 0),
          usersToday: Number(row.users_today ?? 0),
          aveMariasToday: Number(row.ave_marias_today ?? 0),
        });
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error in rosary lobby metrics:", err);
        if (active) {
          setData(empty);
          setLoading(false);
        }
      }
    };

    void load();
    const channel = client
      .channel("rosary-lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "progress" }, load)
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, []);

  return { data, loading };
}
