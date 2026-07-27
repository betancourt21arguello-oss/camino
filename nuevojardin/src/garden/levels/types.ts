/* Bonos decorativos otorgados por nivel. */
export interface LevelConfig {
  level: number;
  title: string;
  flowers: number;
  lights: number;
  plants: number;
  rocks: number;
  particles: number;
  butterflies: number;
  lightRays: number;
}

/** Resultado acumulado de todos los niveles hasta N. */
export type ResolvedLevel = Omit<LevelConfig, "level" | "title"> & {
  level: number;
  title: string;
};
