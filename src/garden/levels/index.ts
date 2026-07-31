import { LEVEL_REGISTRY } from "./registry";
import type { ResolvedLevel } from "./types";

export type { LevelConfig, ResolvedLevel } from "./types";
export { LEVEL_REGISTRY } from "./registry";

/** Suma acumulativamente todos los bonos desde el nivel 1 hasta `level`. */
export function resolveLevel(level: number): ResolvedLevel {
  const capped = Math.max(1, Math.floor(level));
  const registryLen = LEVEL_REGISTRY.length;
  const baseLevel = Math.min(capped, registryLen);

  const acc: ResolvedLevel = {
    level: capped,
    title: capped > registryLen
      ? `${LEVEL_REGISTRY[registryLen - 1].title} ${capped}`
      : LEVEL_REGISTRY[baseLevel - 1].title,
    flowers: 0, lights: 0, plants: 0, rocks: 0,
    particles: 0, butterflies: 0, lightRays: 0,
  };
  for (let i = 0; i < baseLevel; i++) {
    const c = LEVEL_REGISTRY[i];
    acc.flowers += c.flowers;
    acc.lights += c.lights;
    acc.plants += c.plants;
    acc.rocks += c.rocks;
    acc.particles += c.particles;
    acc.butterflies += c.butterflies;
    acc.lightRays += c.lightRays;
  }

  if (capped > registryLen) {
    const extra = capped - registryLen;
    const last = LEVEL_REGISTRY[registryLen - 1];
    acc.flowers += last.flowers * extra;
    acc.lights += last.lights * extra;
    acc.plants += last.plants * extra;
    acc.rocks += last.rocks * extra;
    acc.particles += last.particles * extra;
    acc.butterflies += last.butterflies * extra;
    acc.lightRays += last.lightRays * extra;
  }

  return acc;
}

/** Etiqueta del nivel. */
export function levelTitle(level: number): string {
  const capped = Math.max(1, Math.floor(level));
  const registryLen = LEVEL_REGISTRY.length;
  if (capped <= registryLen) {
    return LEVEL_REGISTRY[capped - 1].title;
  }
  return `${LEVEL_REGISTRY[registryLen - 1].title} ${capped}`;
}
