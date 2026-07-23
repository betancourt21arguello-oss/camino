import type { FruitBalance, SpiritualEventType } from "./types";

// Recompensas transparentes, sin azar ni cofres.
// Las tareas diarias (Laudes, Ángelus) y rachas otorgan agua/semillas.
export const REWARD_TABLE: Record<
  SpiritualEventType,
  Partial<FruitBalance> & { note: string }
> = {
  "rosary-complete": { semilla: 2, vela: 1, note: "Rosario completado" },
  "coronilla-complete": { semilla: 1, agua: 1, note: "Coronilla completada" },
  "novena-complete": { semilla: 2, agua: 1, note: "Novena completada" },
  "community-join": { agua: 2, note: "Oración en comunidad" },
  "pray-for-other": { agua: 3, note: "Rezaste por otra intención" },
  "read-intention": { agua: 1, note: "Momento de silencio y lectura" },
  "reflection-finish": { semilla: 1, agua: 1, note: "Tiempo de silencio" },
  "daily-streak": { semilla: 1, agua: 1, note: "Perseverancia diaria" },
  "task-complete": { agua: 2, semilla: 1, note: "Compromiso cumplido" },
};

export function rewardFor(type: SpiritualEventType) {
  return REWARD_TABLE[type];
}
