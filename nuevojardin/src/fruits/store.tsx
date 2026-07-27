import {
  createContext, useContext, useEffect, useState, useCallback, useRef, useMemo,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { rewardFor, applyReward } from "./rewards";
import type { FruitBalance, SpiritualEvent, Candle, FruitMeta } from "./types";
import { aggregateGardenState, gardenEventType } from "@/garden/events";
import type { GardenEvent, GardenState } from "@/garden/types";

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
  const [balance, setBalance] = useState<FruitBalance>(ZERO);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [history, setHistory] = useState<FruitMeta[]>([]);
  const [gardenEvents, setGardenEvents] = useState<GardenEvent[]>([]);
  const [justWatered, setJustWatered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const waterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!user) { setLoading(false); return; }
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
          (gardenRes.data as Array<Record<string, unknown>>).map((r) => ({
            id: String(r.id),
            type: r.type as GardenEvent["type"],
            value: (r.value as number) ?? 1,
            intention: r.intention as string | undefined,
            created_at: String(r.created_at),
          })),
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

  useEffect(() => { void reload(); }, [reload]);

  /* ── Realtime ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase
      .channel(`spiritual-state-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fruits", filter: `profile_id=eq.${user.id}` }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_events", filter: `user_id=eq.${user.id}` }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "candles", filter: `owner_id=eq.${user.id}` }, () => void reload())
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user, reload]);

  /* Marca el efecto de riego por ~6 s */
  const flagWatered = useCallback(() => {
    setJustWatered(true);
    if (waterTimer.current) clearTimeout(waterTimer.current);
    waterTimer.current = setTimeout(() => setJustWatered(false), 6000);
  }, []);

  const pushLocalEvent = useCallback((type: GardenEvent["type"], value: number, intention?: string) => {
    setGardenEvents((prev) => [
      ...prev,
      { id: `local-${type}-${Date.now()}`, type, value, intention, created_at: new Date().toISOString() },
    ]);
  }, []);

  /* ── emit ──────────────────────────────────────────────────────────── */
  const emit = useCallback((e: SpiritualEvent) => {
    const reward = rewardFor(e.type);
    setBalance((prev) => applyReward(prev, reward));

    const gType = gardenEventType(e.type);
    if (gType) pushLocalEvent(gType, e.value ?? 1, e.intention);

    if (user) {
      void supabase.rpc("emit_spiritual_event", {
        p_event_type: e.type,
        p_value: e.value ?? 1,
        p_intention: e.intention ?? null,
        p_vela: reward.vela,
        p_semilla: reward.semilla,
        p_agua: reward.agua,
        p_note: e.note ?? reward.note,
      }).then(({ error }) => {
        if (error) console.warn("[camino] emit_spiritual_event:", error.message);
      });
    }
  }, [user, pushLocalEvent]);

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

    if (user) {
      const { data, error } = await supabase.rpc("commit_candle", { p_intention: intention });
      if (error) console.warn("[camino] commit_candle:", error.message);
      else if (data) setCandles((prev) => prev.map((c) => (c.id === localId ? { ...c, id: String(data) } : c)));
    }
  }, [balance.vela, user, pushLocalEvent]);

  const prayForCandle = useCallback(async (id: string) => {
    if (balance.vela < 1) return;
    setBalance((p) => ({ ...p, vela: p.vela - 1, semilla: p.semilla + 2 }));
    pushLocalEvent("PRAY_FOR_OTHER", 1);
    if (user) {
      const { error } = await supabase.rpc("commit_gift_candle", { p_candle_id: id, p_amount: 1 });
      if (error) console.warn("[camino] commit_gift_candle:", error.message);
    }
  }, [balance.vela, user, pushLocalEvent]);

  /* ── Riego ─────────────────────────────────────────────────────────── */
  const waterGarden = useCallback(async (intention: string) => {
    if (balance.agua < 1) return;
    setBalance((p) => ({ ...p, agua: p.agua - 1 }));
    pushLocalEvent("WATER_GARDEN", 1, intention);
    flagWatered();
    if (user) {
      const { error } = await supabase.rpc("water_garden", { p_intention: intention });
      if (error) console.warn("[camino] water_garden:", error.message);
    }
  }, [balance.agua, user, pushLocalEvent, flagWatered]);

  const bulkWaterGarden = useCallback(async (intention: string) => {
    const amount = balance.agua;
    if (amount < 1) return;
    setBalance((p) => ({ ...p, agua: 0 }));
    pushLocalEvent("WATER_GARDEN", amount, intention);
    flagWatered();
    if (user) {
      const { error } = await supabase.rpc("bulk_water_garden", {
        p_user_id: user.id, p_intention: intention,
      });
      if (error) console.warn("[camino] bulk_water_garden:", error.message);
    }
  }, [balance.agua, user, pushLocalEvent, flagWatered]);

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
