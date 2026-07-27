import type { SpiritualEventType, FruitBalance } from "./types";

export interface RewardEntry {
  vela: number;
  semilla: number;
  agua: number;
  note: string;
}

/** Tabla transparente de recompensas. Cada acción → frutas ganadas. */
export const REWARD_TABLE: Record<SpiritualEventType, RewardEntry> = {
  "rosary-complete":    { vela: 1, semilla: 2, agua: 2, note: "Rosario completado" },
  "novena-complete":    { vela: 2, semilla: 3, agua: 2, note: "Novena completada" },
  "coronilla-complete": { vela: 1, semilla: 1, agua: 1, note: "Coronilla rezada" },
  "task-complete":      { vela: 0, semilla: 1, agua: 0, note: "Tarea de la Regla cumplida" },
  "daily-streak":       { vela: 0, semilla: 1, agua: 1, note: "Racha diaria mantenida" },
  "community-join":     { vela: 1, semilla: 1, agua: 1, note: "Oración en comunidad" },
  "candle-lit":         { vela: 0, semilla: 0, agua: 0, note: "Vela encendida" },
  "pray-for-other":     { vela: 0, semilla: 2, agua: 0, note: "Oración por otro" },
  "water-garden":       { vela: 0, semilla: 0, agua: 0, note: "Jardín regado" },
  "read-intention":     { vela: 0, semilla: 1, agua: 0, note: "Intención leída" },
  "reflection-finish":  { vela: 0, semilla: 1, agua: 0, note: "Reflexión finalizada" },
  "reflection-complete":{ vela: 0, semilla: 1, agua: 0, note: "Reflexión completada" },
  "seed-received":      { vela: 0, semilla: 1, agua: 0, note: "Semilla recibida" },
  "water-received":     { vela: 0, semilla: 0, agua: 1, note: "Agua recibida" },
};

export function rewardFor(type: SpiritualEventType): RewardEntry {
  return REWARD_TABLE[type] ?? { vela: 0, semilla: 0, agua: 0, note: "" };
}

export function applyReward(balance: FruitBalance, r: RewardEntry): FruitBalance {
  return {
    vela: Math.max(0, balance.vela + r.vela),
    semilla: Math.max(0, balance.semilla + r.semilla),
    agua: Math.max(0, balance.agua + r.agua),
  };
}
