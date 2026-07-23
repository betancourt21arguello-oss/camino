import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Candle, FruitBalance, SpiritualEvent } from "./types";
import { rewardFor } from "./rewards";
import {
  aggregateGardenState,
  gardenEventType,
  INITIAL_GARDEN_EVENTS,
} from "../garden/events";
import type { GardenEvent, GardenState } from "../garden/types";

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
  lightCandle: (intention: string) => Candle;
  prayForCandle: (id: string) => void;
  waterGarden: (intention: string) => boolean;
}

const Ctx = createContext<SpiritualState | null>(null);
const now = () => Date.now();

const seedCandles: Candle[] = [
  {
    id: "c-anna",
    intention: "Por la salud de mi madre",
    ownerName: "Ana",
    ownerHue: 340,
    litAt: now() - 3 * 3600_000,
    expiresAt: now() - 3 * 3600_000 + DAY_MS,
    prayedBy: ["u1", "u2", "u3"],
    mine: false,
  },
  {
    id: "c-jose",
    intention: "Por la conversión de un ser querido",
    ownerName: "José",
    ownerHue: 210,
    litAt: now() - 6 * 3600_000,
    expiresAt: now() - 6 * 3600_000 + DAY_MS,
    prayedBy: ["u4"],
    mine: false,
  },
  {
    id: "c-lucia",
    intention: "En acción de gracias",
    ownerName: "Lucía",
    ownerHue: 30,
    litAt: now() - 1 * 3600_000,
    expiresAt: now() - 1 * 3600_000 + DAY_MS,
    prayedBy: [],
    mine: false,
  },
  {
    id: "c-marta",
    intention: "Por las almas del purgatorio",
    ownerName: "Marta",
    ownerHue: 280,
    litAt: now() - 10 * 3600_000,
    expiresAt: now() - 10 * 3600_000 + DAY_MS,
    prayedBy: ["u5", "u6"],
    mine: false,
  },
];

export function SpiritualProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<FruitBalance>({
    vela: 3,
    semilla: 14,
    agua: 8,
  });
  const [candles, setCandles] = useState<Candle[]>(seedCandles);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [gardenEvents, setGardenEvents] = useState<GardenEvent[]>(
    INITIAL_GARDEN_EVENTS,
  );

  const applyFruits = useCallback(
    (fruits: Partial<FruitBalance>, note: string) => {
      setBalance((b: FruitBalance) => ({
        vela: b.vela + (fruits.vela ?? 0),
        semilla: b.semilla + (fruits.semilla ?? 0),
        agua: b.agua + (fruits.agua ?? 0),
      }));
      setHistory((h) => [
        { id: `${now()}-${h.length}`, note, at: now(), fruits },
        ...h,
      ]);
    },
    [],
  );

  const emit = useCallback(
    (e: SpiritualEvent) => {
      const r = rewardFor(e.type);
      if (!r) return;
      const { note, ...fruits } = r;
      applyFruits(fruits, note);
      setGardenEvents((events: GardenEvent[]) => {
        const at = now();
        const actionType = gardenEventType(e.type);
        return [
          ...events,
          { id: `garden-${at}-${events.length}`, type: actionType, value: 1, createdAt: at },
        ];
      });
    },
    [applyFruits],
  );

  const lightCandle = useCallback((intention: string): Candle => {
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
    return c;
  }, []);

  const prayForCandle = useCallback(
    (id: string) => {
      setCandles((cs) =>
        cs.map((c) =>
          c.id === id && !c.prayedBy.includes("me") ? { ...c, prayedBy: [...c.prayedBy, "me"] } : c,
        ),
      );
      emit({ type: "pray-for-other" });
    },
    [emit],
  );

  // Nueva mecánica: Riego con intención
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
      return true;
    },
    [],
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
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpiritual() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSpiritual must be used within SpiritualProvider");
  return ctx;
}
