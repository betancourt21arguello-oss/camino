export type SpiritualEventType =
  | "rosary-complete"
  | "novena-complete"
  | "coronilla-complete"
  | "task-complete"
  | "gospel-read"
  | "daily-streak"
  | "community-join"
  | "candle-lit"
  | "pray-for-other"
  | "water-garden"
  | "read-intention"
  | "reflection-finish"
  | "reflection-complete"
  | "seed-received"
  | "water-received"
  | "laudes"
  | "angelus"
  | "vespers"
  | "compline"
  | "catechesis"
  | "harvest-fruit";

export interface SpiritualEvent {
  type: SpiritualEventType;
  value?: number;
  intention?: string;
  note?: string;
}

/** Balance de frutas espirituales. */
export interface FruitBalance {
  vela: number;    // 🕯️
  semilla: number; // 🌱
  agua: number;    // 💧
}

export interface Candle {
  id: string;
  owner_id: string;
  intention: string;
  lit_at: string;
  expires_at: string;
  prayedBy?: string[];
}

export interface FruitMeta {
  id: string;
  note: string;
  vela: number;
  semilla: number;
  agua: number;
  created_at: string;
}

/** Alias legado. */
export type SpiritualBalance = FruitBalance;
export type FruitHistoryEntry = FruitMeta;
