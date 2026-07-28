import {
  createContext, useContext, useEffect, useState, useCallback, useRef, useMemo,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { rewardFor, applyReward } from "./rewards";
import type { FruitBalance, SpiritualEvent, Candle, FruitMeta } from "./types";
import { aggregateGardenState, gardenEventType } from "@/garden/events";
import type { GardenEvent, GardenState } from "@/garden/types";
import type { RewardEntry } from "./rewards";

interface SpiritualCtx {
  balance: FruitBalance;
  candles: Candle[];
  history: FruitMeta[];
  gardenEvents: GardenEvent[];
  activeIntentions: Candle[];
  /** Estado agregado del jardín, listo para GardenSvg. */
  gardenState: GardenState;
  /** true durante unos segundos tras regar → dispara lluvia/pulso. */
  justWatered: boolean;
  loading: boolean;
  syncError: string | null;
  emit: (e: SpiritualEvent) => void;
  lightCandle: (intention: string) => Promise<void>;
  prayForCandle: (id: string) => Promise<void>;
  waterGarden: (intention: string) => Promise<void>;
  bulkWaterGarden: (intention: string) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<SpiritualCtx | null>(null);

const ZERO: FruitBalance = { vela: 0, semilla: 0, agua: 0 };

export function SpiritualProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const loadBalanceFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem("camino_balance_agua");
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  }, []);

  const [balance, setBalance] = useState<FruitBalance>(ZERO);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [history, setHistory] = useState<FruitMeta[]>([]);
  const [gardenEvents, setGardenEvents] = useState<GardenEvent[]>([]);
  const [justWatered, setJustWatered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const waterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cargar balance.agua desde localStorage
  useEffect(() => {
    try {
      const savedAgua = loadBalanceFromLocalStorage();
      if (savedAgua) {
        setBalance((p) => ({ ...p, agua: savedAgua }));
      }
    } catch {
      // ignore
    }
  }, [loadBalanceFromLocalStorage]);

  // Persistir balance.agua en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("camino_balance_agua", String(balance.agua));
    } catch {
      // ignore
    }
  }, [balance.agua]);

  const activeIntentions = useMemo(
    () => candles.filter((c) => new Date(c.expires_at).getTime() > Date.now()),
    [candles],
  );

  /* Estado agregado del jardín — se recalcula al cambiar eventos o velas */
  const gardenState = useMemo(
    () => aggregateGardenState(gardenEvents, activeIntentions.length),
    [gardenEvents, activeIntentions.length],
  );

  /* ── Carga inicial ─────────────────────────────────────────────────── */
  const reload = useCallback(async () => {
    if (!user || !supabase) { setLoading(false); return; }
    try {
      const [fruitsRes, candlesRes, gardenRes, histRes] = await Promise.all([
        supabase.from("fruits").select("vela, semilla, agua").eq("profile_id", user.id).maybeSingle(),
        supabase.from("candles").select("*").eq("owner_id", user.id).order("lit_at", { ascending: false }).limit(40),
        supabase.from("garden_events").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(500),
        supabase.from("fruit_history").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(30),
      ]);

      if (fruitsRes.data) {
        setBalance({
          vela: fruitsRes.data.vela ?? 0,
          semilla: fruitsRes.data.semilla ?? 0,
          agua: fruitsRes.data.agua ?? 0,
        });
      }
      if (candlesRes.data) setCandles(candlesRes.data as Candle[]);
      if (gardenRes.data) {
        setGardenEvents(
          (gardenRes.data as Array<Record<string, unknown>>).map((r) => {
            const rawType = (r.event_type ?? r.type) as string;
            // Normalize: DB stores both spiritual event types (e.g. "rosary-complete")
            // and garden event types (e.g. "ROSARY_COMPLETED"). Map to garden type.
            const EVENT_TYPE_MAP: Record<string, GardenEvent["type"]> = {
              "rosary-complete": "ROSARY_COMPLETED",
              "novena-complete": "NOVENA_COMPLETED",
              "coronilla-complete": "CORONILLA_COMPLETED",
              "task-complete": "TASK_COMPLETED",
              "gospel-read": "GOSPEL_READ",
              "daily-streak": "STREAK_MAINTAINED",
              "community-join": "COMMUNITY_PRAYER",
              "candle-lit": "CANDLE_LIT",
              "pray-for-other": "PRAY_FOR_OTHER",
              "water-garden": "WATER_GARDEN",
              "read-intention": "SILENCE_TIME",
              "reflection-finish": "SILENCE_TIME",
              "reflection-complete": "REFLECTION_COMPLETED",
              "seed-received": "SEED_RECEIVED",
              "water-received": "WATER_RECEIVED",
            };
            const gardenType = EVENT_TYPE_MAP[rawType] ?? (rawType as GardenEvent["type"]);
            return {
              id: String(r.id),
              type: gardenType,
              value: (r.value as number) ?? 1,
              intention: r.intention as string | undefined,
              created_at: String(r.created_at),
            };
          }),
        );
      }
      if (histRes.data) setHistory(histRes.data as FruitMeta[]);
      setSyncError(null);
    } catch (err) {
      setSyncError("No se pudo sincronizar el jardín");
      console.warn("[camino] sync error", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem("camino_balance_agua", String(balance.agua));
      } catch {
        // ignore
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    void reload();
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [reload, balance.agua]);

  /* ── Realtime ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user || !supabase) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase
      .channel(`spiritual-state-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fruits", filter: `profile_id=eq.${user.id}` }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_events", filter: `user_id=eq.${user.id}` }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "candles", filter: `owner_id=eq.${user.id}` }, () => void reload())
      .subscribe();

    channelRef.current = ch;
    return () => { if (supabase) supabase.removeChannel(ch); };
  }, [user, reload]);

  /* Marca el efecto de riego por ~6 s */
  const flagWatered = useCallback(() => {
    setJustWatered(true);
    if (waterTimer.current) clearTimeout(waterTimer.current);
    waterTimer.current = setTimeout(() => setJustWatered(false), 6000);
  }, []);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (waterTimer.current) clearTimeout(waterTimer.current);
    };
  }, []);

  const pushLocalEvent = useCallback((type: GardenEvent["type"], value: number, intention?: string) => {
    setGardenEvents((prev) => [
      ...prev,
      { id: `local-${type}-${Date.now()}`, type, value, intention, created_at: new Date().toISOString() },
    ]);
  }, []);

  /** Retorna la recompensa con vela=0 si ya se reclamó hoy. */
  const claimDailyReward = useCallback(async (
    eventType: string,
    reward: RewardEntry,
  ): Promise<RewardEntry> => {
    // Solo deduplicamos eventos que dan recompensa
    if (reward.vela === 0 && reward.semilla === 0 && reward.agua === 0) {
      return reward;
    }
    if (!user || !supabase) return reward;
    try {
      const { data: isFirst, error } = await supabase
        .rpc("claim_daily_completion", { p_event_type: eventType });
      if (error) {
        console.warn("[camino] claim_daily_completion:", error.message);
        return reward; // dar recompensa igual si falla la RPC
      }
      if (isFirst === false) {
        // Ya se completó hoy → no dar recompensa
        return { vela: 0, semilla: 0, agua: 0, note: reward.note };
      }
    } catch (err) {
      console.warn("[camino] claim_daily_completion error:", err);
    }
    return reward;
  }, [user]);

  /* ── emit ──────────────────────────────────────────────────────────── */
  const emit = useCallback(async (e: SpiritualEvent) => {
    const baseReward = rewardFor(e.type);
    const reward = await claimDailyReward(e.type, baseReward);

    setBalance((prev) => applyReward(prev, reward));

    const gType = gardenEventType(e.type);
    if (gType) pushLocalEvent(gType, e.value ?? 1, e.intention);

    if (user && gType && supabase) {
      void (async () => {
        try {
          const { error } = await supabase.rpc("emit_spiritual_event", {
            p_event_type: e.type,
            p_value: e.value ?? 1,
            p_intention: e.intention ?? null,
            p_vela: reward.vela,
            p_semilla: reward.semilla,
            p_agua: reward.agua,
            p_note: e.note ?? reward.note,
          });
          if (error) console.warn("[camino] emit_spiritual_event:", error.message);
        } catch (error) {
          console.warn("[camino] emit_spiritual_event:", error instanceof Error ? error.message : String(error));
        }
      })();
    }
  }, [user, pushLocalEvent, claimDailyReward]);

  /* ── Velas ─────────────────────────────────────────────────────────── */
  const lightCandle = useCallback(async (intention: string) => {
    if (balance.vela < 1) return;
    setBalance((p) => ({ ...p, vela: p.vela - 1 }));
    const localId = `local-candle-${Date.now()}`;
    setCandles((prev) => [{
      id: localId,
      owner_id: user?.id ?? "anon",
      intention,
      lit_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }, ...prev]);
    pushLocalEvent("CANDLE_LIT", 1, intention);

    if (user && supabase) {
      Promise.resolve(supabase.rpc("commit_candle", { p_intention: intention }))
        .then(({ data, error }) => {
          if (error) {
            console.warn("[camino] commit_candle:", error.message);
            setBalance((p) => ({ ...p, vela: p.vela + 1 }));
            setCandles((prev) => prev.filter((c) => c.id !== localId));
          } else if (data) {
            setCandles((prev) => prev.map((c) => (c.id === localId ? { ...c, id: String(data) } : c)));
          }
        })
        .catch((error: unknown) => {
          console.warn("[camino] commit_candle error:", error instanceof Error ? error.message : String(error));
          setBalance((p) => ({ ...p, vela: p.vela + 1 }));
          setCandles((prev) => prev.filter((c) => c.id !== localId));
        });
    }
  }, [balance.vela, user, pushLocalEvent]);

  const prayForCandle = useCallback(async (id: string) => {
    if (balance.vela < 1) return;
    setBalance((p) => ({ ...p, vela: p.vela - 1, semilla: p.semilla + 2 }));
    pushLocalEvent("PRAY_FOR_OTHER", 1);
    if (user && supabase) {
      const { error } = await supabase.rpc("commit_gift_candle", { p_candle_id: id, p_amount: 1 });
      if (error) {
        console.warn("[camino] commit_gift_candle:", error.message);
        setBalance((p) => ({ ...p, vela: p.vela + 1, semilla: p.semilla - 2 }));
      }
    }
  }, [balance.vela, user, pushLocalEvent]);

  /* ── Riego ─────────────────────────────────────────────────────────── */
  const waterGarden = useCallback(async (intention: string) => {
    if (balance.agua < 1) return;
    setBalance((p) => ({ ...p, agua: p.agua - 1 }));
    pushLocalEvent("WATER_GARDEN", 1, intention);
    flagWatered();
    if (user && supabase) {
      const { error } = await supabase.rpc("water_garden", { p_intention: intention });
      if (error) {
        console.warn("[camino] water_garden:", error.message);
        setBalance((p) => ({ ...p, agua: p.agua + 1 }));
        void reload();
      }
    }
  }, [balance.agua, user, pushLocalEvent, flagWatered, reload]);

  const bulkWaterGarden = useCallback(async (intention: string) => {
    const amount = balance.agua;
    if (amount < 1) return;
    setBalance((p) => ({ ...p, agua: 0 }));
    pushLocalEvent("WATER_GARDEN", amount, intention);
    flagWatered();
    if (user && supabase) {
      const { error } = await supabase.rpc("bulk_water_garden", {
        p_user_id: user.id, p_intention: intention,
      });
      if (error) {
        console.warn("[camino] bulk_water_garden:", error.message);
        setBalance((p) => ({ ...p, agua: amount }));
        void reload();
      }
    }
  }, [balance.agua, user, pushLocalEvent, flagWatered, reload]);

  const value: SpiritualCtx = {
    balance, candles, history, gardenEvents, activeIntentions,
    gardenState, justWatered, loading, syncError,
    emit, lightCandle, prayForCandle, waterGarden, bulkWaterGarden, reload,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpiritual(): SpiritualCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSpiritual debe usarse dentro de <SpiritualProvider>");
  return ctx;
}
