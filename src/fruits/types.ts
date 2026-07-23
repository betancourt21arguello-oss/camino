// ============================================================
//  SISTEMA DE FRUTOS ESPIRITUALES
//  NO es gamificación. NO hay XP, monedas, niveles, cofres.
// ============================================================

export type FruitKind = "vela" | "semilla" | "agua";

export interface FruitMeta {
  kind: FruitKind;
  symbol: string;
  name: string;
  meaning: string;
  earnedBy: string;
  tint: string;
}

export const FRUITS: Record<FruitKind, FruitMeta> = {
  vela: {
    kind: "vela",
    symbol: "🕯️",
    name: "Velas",
    meaning: "Una intención de oración ofrecida a Dios (dura 24 h).",
    earnedBy: "Rosarios, Coronillas, Novenas, rachas y oración comunitaria.",
    tint: "#e0b866",
  },
  semilla: {
    kind: "semilla",
    symbol: "🌱",
    name: "Semillas",
    meaning: "Alimento para la fauna del jardín. Atrae vida.",
    earnedBy: "Perseverancia: hábitos diarios y tiempos de silencio.",
    tint: "#7d9153",
  },
  agua: {
    kind: "agua",
    symbol: "💧",
    name: "Agua",
    meaning: "Caridad y cuidado. Riega el jardín con una intención.",
    earnedBy: "Rezar por los demás, Laudes, Ángelus, intenciones comunitarias.",
    tint: "#6fa8c9",
  },
};

export interface Candle {
  id: string;
  intention: string;
  ownerName: string;
  ownerHue: number;
  litAt: number;
  expiresAt: number;
  prayedBy: string[];
  mine: boolean;
}

export type SpiritualEventType =
  | "rosary-complete"
  | "coronilla-complete"
  | "novena-complete"
  | "community-join"
  | "pray-for-other"
  | "read-intention"
  | "reflection-finish"
  | "daily-streak"
  | "task-complete";

export interface SpiritualEvent {
  type: SpiritualEventType;
  meta?: Record<string, unknown>;
}

export interface FruitBalance {
  vela: number;
  semilla: number;
  agua: number;
}
