import { LEVEL_REGISTRY } from "./registry";
import type { ResolvedLevel } from "./types";

export type { LevelConfig, ResolvedLevel } from "./types";
export { LEVEL_REGISTRY } from "./registry";

/** Suma acumulativamente todos los bonos desde el nivel 1 hasta `level`. */
export function resolveLevel(level: number): ResolvedLevel {
  const capped = Math.min(Math.max(1, Math.floor(level)), LEVEL_REGISTRY.length);
  const acc: ResolvedLevel = {
    level: capped,
    title: LEVEL_REGISTRY[capped - 1].title,
    flowers: 0, lights: 0, plants: 0, rocks: 0,
    particles: 0, butterflies: 0, lightRays: 0,
  };
  for (let i = 0; i < capped; i++) {
    const c = LEVEL_REGISTRY[i];
    acc.flowers += c.flowers;
    acc.lights += c.lights;
    acc.plants += c.plants;
    acc.rocks += c.rocks;
    acc.particles += c.particles;
    acc.butterflies += c.butterflies;
    acc.lightRays += c.lightRays;
  }
  return acc;
}

/** Etiqueta del nivel. */
export function levelTitle(level: number): string {
  const capped = Math.min(Math.max(1, Math.floor(level)), LEVEL_REGISTRY.length);
  return LEVEL_REGISTRY[capped - 1].title;
}
