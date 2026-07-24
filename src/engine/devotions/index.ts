import type { Devotion } from "../types";
import { almasPurgatorio } from "./almasPurgatorio";
import { mariaDesatanudos } from "./desatanudos";
import { divinaMisericordia } from "./divinaMisericordia";
import { espirituSanto } from "./espirituSanto";
import { devotionIdForToday, ROSARIO_DESTRUCTIONS } from "./rosarioMisterios";
import { sanJose } from "./sanJose";

export const DEVOTIONS: Record<string, Devotion> = {
  ...ROSARIO_DESTRUCTIONS,
  "divina-misericordia": divinaMisericordia,
  "san-jose": sanJose,
  "espiritu-santo": espirituSanto,
  "almas-purgatorio": almasPurgatorio,
  "maria-desatanudos": mariaDesatanudos,
};

export const DEVOTION_LIST = Object.values(DEVOTIONS);

/** Ids de los cuatro conjuntos del Rosario, para distinguirlos en el menú. */
export const ROSARIO_IDS = new Set(Object.keys(ROSARIO_DESTRUCTIONS));

export function resolveDevotion(id?: string): Devotion {
  const requested = id ? DEVOTIONS[id] : undefined;
  const today = DEVOTIONS[devotionIdForToday()];
  const first = Object.values(DEVOTIONS)[0];

  // El catálogo se define en este mismo módulo, por lo que siempre existe
  // al menos una devoción. El guard evita un crash si una configuración
  // remota manda un id desconocido o antiguo (p. ej. rosario-dolorosos).
  return requested ?? today ?? first;
}
