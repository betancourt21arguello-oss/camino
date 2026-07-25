import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Candle, FruitBalance, SpiritualEvent } from "./types";
import { rewardFor } from "./rewards";
import { aggregateGardenState, gardenEventType } from "../garden/events";
import type { GardenEvent, GardenState } from "../garden/types";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface HistoryEntry {
  id: string;
  note: string;
  at: number;
  fruits: Partial<FruitBalance>;
}

interface SpiritualState {
  balance: FruitBalance;
  candles: Candle[];
  history: HistoryEntry[];
  activeIntentions: Candle[];
  gardenEvents: GardenEvent[];
  gardenState: GardenState;
  emit: (e: SpiritualEvent) => void;
  lightCandle: (intention: string) => Candle | null;
  prayForCandle: (id: string) => void;
  waterGarden: (intention: string) => boolean;
  bulkWaterGarden: (intention: string) => boolean;
}

const Ctx = createContext<SpiritualState | null>(null);
const now = () => Date.now();

export function SpiritualProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<FruitBalance>({ vela: 0, semilla: 0, agua: 0 });
  const [candles, setCandles] = useState<Candle[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [gardenEvents, setGardenEvents] = useState<GardenEvent[]>([]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) {
      setBalance({ vela: 0, semilla: 0, agua: 0 });
      setCandles([]);
      setGardenEvents([]);
      return;
    }
    let active = true;
    const load = async () => {
      const [fruitRes, candleRes, eventRes, prayedRes] = await Promise.all([
        client.from("fruits").select("vela,semilla,agua").eq("profile_id", user.id).maybeSingle(),
        client
          .from("candles")
          .select("id,intention,lit_at,expires_at,owner_id")
          .gt("expires_at", new Date().toISOString()),
        client
          .from("garden_events")
          .select("id,event_type,value,created_at,intention")
          .eq("user_id", user.id)
          .order("created_at"),
        client
          .from("intentions")
          .select("candle_id")
          .eq("pray_for_id", user.id)
          .gt("expires_at", new Date().toISOString()),
      ]);
      if (!active) return;

      if (!fruitRes.error) {
        const f = fruitRes.data;
        setBalance({ vela: f?.vela ?? 0, semilla: f?.semilla ?? 0, agua: f?.agua ?? 0 });
      }

      if (!candleRes.error) {
        const prayed = new Set((prayedRes.data ?? []).map((row: { candle_id: string }) => row.candle_id));
        setCandles(
          ((candleRes.data ?? []) as Array<{
            id: string;
            intention: string;
            lit_at: string;
            expires_at: string;
            owner_id: string;
          }>).map((row) => ({
            id: row.id,
            intention: row.intention,
            ownerName: row.owner_id === user.id ? "Tú" : "Comunidad",
            ownerHue: row.owner_id === user.id ? 45 : 210,
            litAt: new Date(row.lit_at).getTime(),
            expiresAt: new Date(row.expires_at).getTime(),
            prayedBy: prayed.has(row.id) ? ["me"] : [],
            mine: row.owner_id === user.id,
          })),
        );
      } else {
        setCandles([]);
      }

      if (!eventRes.error) {
        setGardenEvents(
          ((eventRes.data ?? []) as Array<{
            id: string;
            event_type: GardenEvent["type"];
            value: number;
            created_at: string;
            intention?: string | null;
          }>).map((row) => ({
            id: row.id,
            type: row.event_type,
            value: row.value,
            createdAt: new Date(row.created_at).getTime(),
            meta: row.intention ? { intention: row.intention } : undefined,
          })),
        );
      }
    };
    void load();
    const channel = client
      .channel(`spiritual-state-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fruits", filter: `profile_id=eq.${user.id}` },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "garden_events", filter: `user_id=eq.${user.id}` },
        load,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "candles" }, load)
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [user]);

  const applyFruits = useCallback((fruits: Partial<FruitBalance>, note: string) => {
    setBalance((b: FruitBalance) => ({
      vela: b.vela + (fruits.vela ?? 0),
      semilla: b.semilla + (fruits.semilla ?? 0),
      agua: b.agua + (fruits.agua ?? 0),
    }));
    setHistory((h) => [{ id: `${now()}-${h.length}`, note, at: now(), fruits }, ...h]);
  }, []);

  const emit = useCallback(
    (e: SpiritualEvent) => {
      const r = rewardFor(e.type);
      if (!r) return;
      const { note, ...fruits } = r;
      applyFruits(fruits, note);
      setGardenEvents((events: GardenEvent[]) => {
        const at = now();
        const actionType = gardenEventType(e.type);
        return [...events, { id: `garden-${at}-${events.length}`, type: actionType, value: 1, createdAt: at }];
      });
      if (supabase && user) {
        void supabase.rpc("record_spiritual_event", {
          p_event_type: gardenEventType(e.type),
          p_value: 1,
          p_meta: e.meta ?? {},
        });
      }
    },
    [applyFruits, user],
  );

  const lightCandle = useCallback(
    (intention: string): Candle | null => {
      // Encender una vela consume 1 del saldo de velas.
      let allowed = false;
      setBalance((b: FruitBalance) => {
        if (b.vela <= 0) return b;
        allowed = true;
        return { ...b, vela: b.vela - 1 };
      });
      if (!allowed) return null;

      const c: Candle = {
        id: `mine-${now()}`,
        intention: intention.trim() || "Intención personal",
        ownerName: "Tú",
        ownerHue: 45,
        litAt: now(),
        expiresAt: now() + DAY_MS,
        prayedBy: [],
        mine: true,
      };
      setCandles((cs) => [c, ...cs]);
      setGardenEvents((events: GardenEvent[]) => [
        ...events,
        { id: `garden-candle-${c.id}`, type: "CANDLE_LIT", value: 1, createdAt: c.litAt },
      ]);
      if (supabase && user) {
        void supabase.from("candles").insert({ owner_id: user.id, intention: c.intention });
      }
      return c;
    },
    [user],
  );

  const prayForCandle = useCallback(
    (id: string) => {
      // Regalar una vela requiere tener al menos 1 en inventario
      let allowed = false;
      setBalance((b) => {
        if (b.vela <= 0) return b;
        allowed = true;
        return { ...b, vela: b.vela - 1 };
      });
      if (!allowed) return;

      setCandles((cs) =>
        cs.map((c) => (c.id === id && !c.prayedBy.includes("me") ? { ...c, prayedBy: [...c.prayedBy, "me"] } : c)),
      );
      emit({ type: "pray-for-other" });
      if (supabase && user) {
        void supabase.from("intentions").insert({ candle_id: id, pray_for_id: user.id });
        // Opcional RPC para transferir vela al dueño: gift_candle(p_candle_id, p_amount)
        (supabase.rpc("gift_candle", { p_candle_id: id, p_amount: 1 }) as any)?.then?.(
          () => {},
          () => {},
        );
      }
    },
    [emit, user],
  );

  const waterGarden = useCallback(
    (intention: string): boolean => {
      let did = false;
      setBalance((b: FruitBalance) => {
        if (b.agua <= 0) return b;
        did = true;
        return { ...b, agua: b.agua - 1 };
      });
      if (!did) return false;
      setGardenEvents((events: GardenEvent[]) => [
        ...events,
        {
          id: `garden-water-${now()}`,
          type: "WATER_GARDEN",
          value: 1,
          createdAt: now(),
          meta: { intention: intention || "Paz" },
        },
      ]);
      setHistory((h) => [
        {
          id: `water-${now()}`,
          note: `Regaste tu jardín · ${intention || "Paz"}`,
          at: now(),
          fruits: { agua: -1 },
        },
        ...h,
      ]);
      if (supabase && user) {
        void supabase.rpc("water_garden", { p_intention: intention || "Paz" });
      }
      return true;
    },
    [user],
  );

  const bulkWaterGarden = useCallback(
    (intention: string): boolean => {
      const currentAgua = balance.agua;
      if (currentAgua <= 0) return false;
      setBalance((b: FruitBalance) => ({ ...b, agua: 0 }));
      setGardenEvents((events: GardenEvent[]) => [
        ...events,
        {
          id: `garden-bulkwater-${now()}`,
          type: "WATER_GARDEN",
          value: currentAgua,
          createdAt: now(),
          meta: { intention: intention || "Paz" },
        },
      ]);
      setHistory((h) => [
        {
          id: `bulkwater-${now()}`,
          note: `Riego completo · ${intention || "Paz"} (${currentAgua}💧)`,
          at: now(),
          fruits: { agua: -currentAgua },
        },
        ...h,
      ]);
      if (supabase && user) {
        void supabase.rpc("bulk_water_garden", {
          p_user_id: user.id,
          p_intention: intention || "Paz",
        });
      }
      return true;
    },
    [balance.agua, user],
  );

  const activeIntentions = useMemo(
    () => candles.filter((c) => c.expiresAt > now() && (c.mine || c.prayedBy.includes("me"))),
    [candles],
  );

  const gardenState = useMemo(
    () => aggregateGardenState(gardenEvents, activeIntentions.length),
    [gardenEvents, activeIntentions.length],
  );

  const value: SpiritualState = {
    balance,
    candles,
    history,
    activeIntentions,
    gardenEvents,
    gardenState,
    emit,
    lightCandle,
    prayForCandle,
    waterGarden,
    bulkWaterGarden,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpiritual() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSpiritual must be used within SpiritualProvider");
  return ctx;
}
