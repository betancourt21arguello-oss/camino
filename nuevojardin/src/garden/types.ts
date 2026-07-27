/* ============================================================================
 * src/garden/types.ts — Contrato de datos compartido por todo el módulo jardín
 * ==========================================================================*/

/* ── DNA (identidad permanente e inmutable) ─────────────────────────────── */
export type TerrainKind = "meadow" | "forest" | "hill" | "desert" | "coast" | "highland";
export type PathShape = "serpentine" | "straight" | "spiral" | "forked" | "circular";
export type TreeSpecies = "cedar" | "oak" | "olive" | "palm" | "pine" | "jacaranda";
export type RockPattern = "scattered" | "clustered" | "cairn" | "ring" | "sparse";
export type PaletteVariant = "dawn" | "verdant" | "amber" | "azure" | "rose" | "dusk";
export type FlowerSpeciesBias = "rose" | "lily" | "lavender" | "daisy" | "marigold" | "iris";
/** Estructura de piedra derivada de `rockPattern`. */
export type StoneShrineKind = "cairn_altar" | "celtic_cross" | "stone_altar" | "standing_stone";
/** Fuente de agua derivada de `riverAngle`. */
export type WaterFeature = "river" | "pond";

export interface DnaTraits {
  dna: string;
  terrain: TerrainKind;
  pathShape: PathShape;
  treeSpecies: TreeSpecies;
  rockPattern: RockPattern;
  /** Ángulo del río en grados (-40 … 40). |ángulo| > 12 ⇒ jardín de río. */
  riverAngle: number;
  paletteVariant: PaletteVariant;
  flowerSpeciesBias: FlowerSpeciesBias;
  signatureSeed: string;
  baseHue: number;
  /** Derivados */
  waterFeature: WaterFeature;
  shrine: StoneShrineKind;
}

/* ── Ciclo horario ──────────────────────────────────────────────────────── */
export type TimeOfDay = "madrugada" | "manana" | "mediodia" | "noche";

export interface TimePalette {
  id: TimeOfDay;
  label: string;
  sky: [string, string, string];
  ambientTint: string;
  ambientOpacity: number;
  /** 0 frío … 1 cálido */
  lightWarmth: number;
  shadowLength: number;
  shadowOpacity: number;
  saturation: number;
  brightness: number;
  fogOpacity: number;
  /** 0 = capullo cerrado · 1 = flor abierta */
  bloomOpen: number;
  dewActive: boolean;
  /** Intensidad del halo de las velas */
  candleGlow: number;
  starOpacity: number;
  sunX: number;
  sunY: number;
  sunTone: string;
  seasonHueShift?: number;
}

/* ── Eventos ────────────────────────────────────────────────────────────── */
export type GardenEventType =
  | "ROSARY_COMPLETED"
  | "NOVENA_COMPLETED"
  | "CORONILLA_COMPLETED"
  | "SILENCE_TIME"
  | "WATER_GARDEN"
  | "COMMUNITY_PRAYER"
  | "STREAK_MAINTAINED"
  | "TASK_COMPLETED"
  | "SEED_RECEIVED"
  | "WATER_RECEIVED"
  | "CANDLE_LIT"
  | "PRAY_FOR_OTHER"
  | "REFLECTION_COMPLETED";

export interface GardenEvent {
  id: string;
  type: GardenEventType;
  value?: number;
  intention?: string;
  created_at: string;
  meta?: Record<string, unknown>;
}

/* ── Estado agregado (dinámico) ─────────────────────────────────────────── */
export type MaturityTier = "seed" | "sprout" | "tree" | "forest";
export type GrowthPhase = 1 | 2 | 3 | 4;
export type GardenSeason = "advent" | "christmas" | "lent" | "easter" | "pentecost" | "ordinary";

export interface GardenState {
  waterLevel: number;      // 0–100
  lightLevel: number;      // 0–100
  health: number;          // 0–100
  pointsScore: number;
  level: number;           // 1–10
  maturityTier: MaturityTier;
  growthPhase: GrowthPhase;
  wateringEffectStrength: number;
  lifeRatio: number;
  dewPoints: number;
  butterflyCount: number;
  birdCount: number;
  /** Velas encendidas todavía vigentes (se renderizan físicamente). */
  activeCandles: number;
  totalRosaries: number;
  totalNovenas: number;
  totalCoronillas: number;
  totalWaterings: number;
  totalCandles: number;
  totalSilence: number;
  streak: number;
  commits: number;
  season: GardenSeason;
  timeOfDay: TimeOfDay;
  lastActivityAt: number | null;
  /** Riego dentro de las últimas 24 h → vitalidad efímera. */
  freshWater: boolean;
  /** 1 recién regado … 0 al cumplirse 24 h. */
  freshWaterRatio: number;
  lastWateredAt: number | null;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  label: string;
  detail: string;
  at: number;
}

/* ── Firma (placa de piedra) ────────────────────────────────────────────── */
export interface GardenSignature {
  kind: "cross" | "star" | "leaf" | "chalice" | "dove" | "flame";
  hue: number;
  angle: number;
  petals: number;
  code: string;
}

/* ── Etiquetas legibles (ES-VE) ─────────────────────────────────────────── */
export const TERRAIN_LABEL: Record<TerrainKind, string> = {
  meadow: "Pradera", forest: "Bosque", hill: "Colina",
  desert: "Desierto", coast: "Costa", highland: "Altiplano",
};

export const TREE_LABEL: Record<TreeSpecies, string> = {
  cedar: "Cedro", oak: "Roble", olive: "Olivo",
  palm: "Palma", pine: "Pino", jacaranda: "Jacaranda",
};

export const MATURITY_LABEL: Record<MaturityTier, string> = {
  seed: "Semilla", sprout: "Brote", tree: "Árbol", forest: "Bosque",
};

export const SEASON_LABEL: Record<GardenSeason, string> = {
  advent: "Adviento", christmas: "Navidad", lent: "Cuaresma",
  easter: "Pascua", pentecost: "Pentecostés", ordinary: "Tiempo Ordinario",
};

export const SHRINE_LABEL: Record<StoneShrineKind, string> = {
  cairn_altar: "Altar de cairn", celtic_cross: "Cruz celta",
  stone_altar: "Altar de piedra", standing_stone: "Piedra erguida",
};
