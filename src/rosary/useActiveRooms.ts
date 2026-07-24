import { useEffect, useState } from "react";
import { DEVOTIONS } from "../engine/devotions";
import { supabase } from "../lib/supabase";

export type RoomKind = "devotion" | "hour";
export type HourKind = "laudes" | "vespers" | "compline";

export interface ActiveRoom {
  sessionId: string;
  /** id de devoción del motor, o "hour:laudes" / "hour:vespers" / "hour:compline" */
  devotionId: string;
  kind: RoomKind;
  hourKind?: HourKind;
  title: string;
  subtitle: string;
  icon: string;
  participants: number;
  startedAt: string;
}

const HOUR_META: Record<HourKind, { title: string; subtitle: string; icon: string }> = {
  laudes: { title: "Laudes", subtitle: "Oración de la mañana", icon: "🌅" },
  vespers: { title: "Vísperas", subtitle: "Oración de la tarde", icon: "🌇" },
  compline: { title: "Completas", subtitle: "Oración de la noche", icon: "🌙" },
};

function enrich(devotionId: string, sessionId: string, participants: number, startedAt: string): ActiveRoom | null {
  if (devotionId.startsWith("hour:")) {
    const hourKind = devotionId.slice(5) as HourKind;
    const meta = HOUR_META[hourKind];
    if (!meta) return null;
    return { sessionId, devotionId, kind: "hour", hourKind, participants, startedAt, ...meta };
  }
  const dev = DEVOTIONS[devotionId];
  if (!dev) return null;
  const isRosario = devotionId.startsWith("rosario-");
  return {
    sessionId,
    devotionId,
    kind: "devotion",
    title: dev.title,
    subtitle: dev.subtitle,
    icon: isRosario ? "📿" : "✨",
    participants,
    startedAt,
  };
}

/**
 * Salas de oración activas en este momento. En producción consulta la RPC
 * `active_prayer_rooms()` de Supabase y se suscribe por Realtime a `sessions`
 * y `participants`. Si Supabase no está disponible, el muro queda vacío: no
 * se inventan participantes ni salas.
 */
export function useActiveRooms(): { rooms: ActiveRoom[]; loading: boolean; total: number } {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setRooms([]);
      setLoading(false);
      return;
    }
    let active = true;
    const client = supabase;

    const load = async () => {
      const { data, error } = await client.rpc("active_prayer_rooms");
      if (!active) return;
      if (error || !Array.isArray(data)) {
        setRooms([]);
        setLoading(false);
        return;
      }
      const mapped = (data as Array<{ session_id: string; devotion_id: string; participants: number; started_at: string }>)
        .map((row) => enrich(row.devotion_id, row.session_id, row.participants ?? 0, row.started_at))
        .filter((r): r is ActiveRoom => Boolean(r))
        .sort((a, b) => b.participants - a.participants);
      setRooms(mapped);
      setLoading(false);
    };

    void load();
    const channel = client
      .channel("active-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, []);

  const total = rooms.reduce((sum, r) => sum + r.participants, 0);
  return { rooms, loading, total };
}
