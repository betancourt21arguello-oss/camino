export type GardenSeason =
  | "advent"
  | "christmas"
  | "lent"
  | "easter"
  | "pentecost"
  | "ordinary";

// ============================================================
//  IDENTIDAD — GardenDNA (permanente, nunca cambia)
// ============================================================

export type TerrainKind = "bosque" | "pradera" | "colina" | "monastico" | "mediterraneo";
export type PathShape = "recto" | "curvo" | "espiral" | "cruz" | "circulo";
export type TreeSpecies = "olivo" | "cedro" | "cipres" | "roble" | "sauce";

export interface DnaTraits {
  dna: string;
  terrain: TerrainKind;
  pathShape: PathShape;
  treeSpecies: TreeSpecies;
  rockPattern: number;
  riverAngle: number;
  paletteVariant: number;
  flowerSpeciesBias: number;
  signatureSeed: string;
}

// ============================================================
//  HISTORIA — GardenEvents (append-only)
// ============================================================

export type GardenEventType =
  | "ROSARY_COMPLETED"
  | "NOVENA_COMPLETED"
  | "CORONILLA_COMPLETED"
  | "SILENCE_TIME"
  | "WATER_GARDEN"
  // compatibilidad con historial previo
  | "COMMUNITY_PRAYER"
  | "STREAK_MAINTAINED"
  | "TASK_COMPLETED"
  | "SEED_RECEIVED"
  | "WATER_RECEIVED"
  | "CANDLE_LIT"
  | "REFLECTION_COMPLETED";

export interface GardenEvent {
  id: string;
  type: GardenEventType;
  value: number;
  createdAt: number;
  meta?: {
    intention?: string;
  };
}

// ============================================================
//  ESTADO — GardenState (agregado, derivado de eventos)
// ============================================================

export interface GardenState {
  // biografía simple
  totalRosaries: number;
  totalNovenas: number;
  totalCoronillas: number;
  totalWaterings: number;
  totalSeeds: number;
  totalSilenceMinutes: number;
  activeCandles: number;
  // derivados para motor visual
  streak: number;
  communityPrayer: number;
  rosaries: number; // alias de totalRosaries para compatibilidad
  novenas: number;
  coronillas: number;
  waterLevel: number;
  lightLevel: number;
  birdCount: number;
  butterflyCount: number;
  season: GardenSeason;
  lastGrowth: number;
  lastActivityTime: number;
  health: number;
  pointsScore: number;
  level: number;
}

export interface GardenSignature {
  kind: "leaf" | "flower" | "branch" | "star";
  hue: number;
  angle: number;
  petals: number;
  code: number;
}
