import type { LevelConfig } from "./types";

/** Tabla estática de bonos por nivel (1–10). Los bonos son incrementales. */
export const LEVEL_REGISTRY: readonly LevelConfig[] = [
  { level: 1,  title: "Tierra preparada", flowers: 2, lights: 0, plants: 3, rocks: 2, particles: 0,  butterflies: 0, lightRays: 0 },
  { level: 2,  title: "Primeros brotes",  flowers: 3, lights: 1, plants: 3, rocks: 1, particles: 2,  butterflies: 1, lightRays: 0 },
  { level: 3,  title: "Raíz firme",       flowers: 3, lights: 2, plants: 2, rocks: 1, particles: 3,  butterflies: 1, lightRays: 0 },
  { level: 4,  title: "Follaje vivo",     flowers: 4, lights: 2, plants: 3, rocks: 1, particles: 3,  butterflies: 1, lightRays: 1 },
  { level: 5,  title: "Manantial",        flowers: 4, lights: 3, plants: 2, rocks: 2, particles: 4,  butterflies: 1, lightRays: 1 },
  { level: 6,  title: "Huerto florido",   flowers: 5, lights: 3, plants: 3, rocks: 1, particles: 4,  butterflies: 2, lightRays: 1 },
  { level: 7,  title: "Sombra amable",    flowers: 5, lights: 4, plants: 3, rocks: 1, particles: 5,  butterflies: 1, lightRays: 1 },
  { level: 8,  title: "Jardín cerrado",   flowers: 6, lights: 4, plants: 4, rocks: 2, particles: 5,  butterflies: 2, lightRays: 1 },
  { level: 9,  title: "Fuente sellada",   flowers: 6, lights: 5, plants: 4, rocks: 1, particles: 6,  butterflies: 2, lightRays: 2 },
  { level: 10, title: "Paraíso interior", flowers: 8, lights: 6, plants: 5, rocks: 2, particles: 8,  butterflies: 3, lightRays: 2 },
];
