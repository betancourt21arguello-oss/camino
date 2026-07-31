/* ============================================================================
 * src/garden/model.ts — Geometría procedural del jardín
 * Árbol fractal recursivo · flores paramétricas (Fibonacci) · pasto generativo
 * viewBox 0 0 720 460 · suelo en (360, 322)
 * ==========================================================================*/
import { createPrng, rnd, rndInt, pick, clamp, lerp, noise1D } from "./prng";
import { PALETTE_TABLE } from "./dna";
import { resolveLevel } from "./levels";
import { generateFractalTree, type FractalTree } from "./fractal";
import {
  generateFlower, generateGrassTuft, generateShrub,
  type ParametricFlower, type GrassTuft, type ShrubModel, type FlowerSpecies,
} from "./flowers";
import type { PersonalTraits } from "./personal";
import type { DnaTraits, GardenState, StoneShrineKind } from "./types";

export const VIEW_W = 720;
export const VIEW_H = 460;
export const GROUND_CX = 360;
export const GROUND_CY = 322;

const DEG = Math.PI / 180;

/* ══ TOPES ESTRICTOS ════════════════════════════════════════════════════ */
export const CAPS = {
  flowers: 7,        // flores paramétricas devocionales
  grassTufts: 16,    // macizos de pasto (cada uno con 6–14 briznas)
  shrubs: 3,
  rocks: 6,
  lights: 6,
  particles: 8,
  butterflies: 3,
  fireflies: 6,
  birds: 2,
  candles: 5,
  sprouts: 7,
} as const;

/* ── Tipos ──────────────────────────────────────────────────────────────── */
export interface TerrainLayer { cx: number; cy: number; rx: number; ry: number; fill: string; }
export interface ShadowSpot { cx: number; cy: number; rx: number; ry: number; opacity: number; }

/** Flor colocada en el jardín. */
export interface PlacedFlower {
  flower: ParametricFlower;
  x: number; y: number;
  /** "mature" ⇒ consolidada (Rosal de Gracia / Lirio Dorado) */
  tier: "simple" | "mature";
  label?: string;
  windDelay: number;
}

export interface MarianArch { x: number; y: number; scale: number; roseCount: number; hue: number; }
export interface StoneShrine { kind: StoneShrineKind; x: number; y: number; scale: number; }
export interface CandleModel { x: number; y: number; scale: number; delay: number; }
export interface SproutModel { x: number; y: number; h: number; lean: number; delay: number; }
export interface EphemeralBloom { flower: ParametricFlower; x: number; y: number; }

export interface PondModel {
  cx: number; cy: number; rx: number; ry: number; visible: boolean;
  koi: { x: number; y: number; hue: number; dur: number; delay: number }[];
  lilies: { x: number; y: number; r: number; rot: number }[];
}
export interface RiverModel {
  visible: boolean; d: string; width: number; bankX: number; bankY: number;
}
export interface RockModel { x: number; y: number; rx: number; ry: number; tone: number; rot: number; }
export interface LightModel { x: number; y: number; r: number; hue: number; dur: number; delay: number; }
/** Insecto que vuela por una trayectoria invisible (`animateMotion`). */
export interface FlyerModel {
  /** Path de vuelo */
  path: string;
  hue: number;
  dur: number;
  begin: number;
  scale: number;
  kind: "butterfly" | "bee";
}
export interface FireflyModel { path: string; dur: number; begin: number; }
export interface BirdModel { path: string; scale: number; dur: number; begin: number; isDove: boolean; }
export interface ParticleModel { x: number; y: number; r: number; dur: number; delay: number }
export interface DeerModel { x: number; y: number; scale: number; facing: 1 | -1; drinking: boolean; }
export interface DewPoint { x: number; y: number; r: number; delay: number; }

/** Rama principal adicional generada con energía devocional. */
export interface EnergyBranch {
  x: number; y: number;       // punto final
  angle: number;              // grados
  length: number;
  clusterR: number;           // radio del cúmulo de hojas
  clusterHue: number;
}

/** Fruto coseppable renderizado en el árbol. */
export interface HarvestableFruitModel {
  id: string;
  type: "pomegranate" | "fig";
  branchIndex: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

/** Arquitectura menor: bancos, atriles, fuentes. */
export type ArchitecturalElement = {
  kind: "bench" | "lectern" | "fountain";
  x: number; y: number;
  scale: number;
  hue: number;
};

/** Arquitectura mayor: capilla / santuario. */
export type SacredStructure = {
  kind: "chapel" | "sanctuary";
  x: number; y: number;
  scale: number;
  roseCount: number;
  lightRays: number;
};

export interface GardenModel {
  palette: { grassHue: number; accentHue: number };
  terrainLayers: TerrainLayer[];
  shadows: ShadowSpot[];
  pathD: string;
  tree: FractalTree;
  treeTrunkFill: string;
  pond: PondModel;
  river: RiverModel;
  grass: GrassTuft[];
  shrubs: ShrubModel[];
  flowers: PlacedFlower[];
  marianArch: MarianArch | null;
  shrine: StoneShrine | null;
  candles: CandleModel[];
  sprouts: SproutModel[];
  ephemeralBloom: EphemeralBloom | null;
  rocks: RockModel[];
  lights: LightModel[];
  flyers: FlyerModel[];
  fireflies: FireflyModel[];
  birds: BirdModel[];
  particles: ParticleModel[];
  deer: DeerModel | null;
  dewPoints: DewPoint[];
  levelTitle: string;
  /** Ramas extra generadas con energía devocional */
  energyBranches: EnergyBranch[];
  /** Frutos cosechables en el árbol */
  harvestableFruits: HarvestableFruitModel[];
  /** Elementos arquitectónicos menores (tier 3) */
  architecturalElements: ArchitecturalElement[];
  /** Estructuras sagradas (tier 4) */
  sacredStructures: SacredStructure[];
}

const hsl = (h: number, s: number, l: number, a = 1) =>
  a === 1 ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${a})`;

const groundPoint = (angle: number, radius: number) => ({
  x: GROUND_CX + Math.cos(angle) * radius,
  y: GROUND_CY + Math.sin(angle) * radius * 0.32,
});

/* ══ TERRENO ════════════════════════════════════════════════════════════ */
function buildTerrain(t: DnaTraits, s: GardenState, grassHue: number): TerrainLayer[] {
  const vitality = s.lifeRatio;
  const wide = t.terrain === "coast" || t.terrain === "desert" ? 1.08 : 1;
  const rise = t.terrain === "hill" || t.terrain === "highland" ? 13 : 8;
  const satBase = t.terrain === "desert" ? 22 : 30;

  return Array.from({ length: 5 }, (_, i) => {
    const k = i / 4;
    const rx = (268 - k * 150) * wide + noise1D(i * 1.9, t.dna) * 6;
    return {
      cx: GROUND_CX + noise1D(i * 3.3 + 7, t.dna) * 5,
      cy: GROUND_CY + 22 - k * rise * 3.4,
      rx: Math.max(34, rx),
      ry: Math.max(12, rx * (0.29 + k * 0.05)),
      fill: hsl(grassHue + k * 6 - 2,
        clamp(satBase + k * 12 + vitality * 12, 12, 54),
        clamp(26 + k * 11 + vitality * 8, 18, 54)),
    };
  });
}

function buildPath(t: DnaTraits): string {
  const y = GROUND_CY + 38;
  switch (t.pathShape) {
    case "straight": return `M 214 ${y + 30} L 360 ${y - 4} L 506 ${y + 30}`;
    case "spiral":   return `M 258 ${y + 36} Q 306 ${y + 4} 360 ${y + 16} Q 418 ${y + 28} 414 ${y - 2}`;
    case "forked":   return `M 360 ${y + 40} L 360 ${y + 6} M 360 ${y + 12} L 268 ${y + 36} M 360 ${y + 12} L 452 ${y + 36}`;
    case "circular": return `M 262 ${y + 10} A 100 34 0 1 0 458 ${y + 10} A 100 34 0 1 0 262 ${y + 10}`;
    default:         return `M 204 ${y + 38} Q 282 ${y + 2} 348 ${y + 20} Q 418 ${y + 38} 470 ${y}`;
  }
}

function pathAnchor(t: DnaTraits) {
  const y = GROUND_CY + 38;
  switch (t.pathShape) {
    case "straight": return { x: 360, y: y - 2 };
    case "spiral":   return { x: 400, y: y + 14 };
    case "forked":   return { x: 322, y: y + 22 };
    case "circular": return { x: 262, y: y + 10 };
    default:         return { x: 348, y: y + 18 };
  }
}

/* ══ ÁRBOL FRACTAL ══════════════════════════════════════════════════════ */
function buildTree(t: DnaTraits, s: GardenState, pt: PersonalTraits, grassHue: number) {
  /* Actividad devocional → tamaño y frondosidad */
  const devotion = s.totalRosaries + s.totalNovenas * 2.2 + s.totalCoronillas * 0.7;
  const phaseBase = [0.42, 0.66, 0.86, 1][s.growthPhase - 1];
  const grow = clamp(phaseBase + Math.log10(1 + devotion) * 0.18, 0.4, 1.3)
    * pt.growthScale * (0.8 + s.lifeRatio * 0.24);

  /* Topología según la especie del DNA */
  const spec = t.treeSpecies;
  const cfg =
    spec === "cedar"     ? { spread: 44, decay: 0.7,  wDecay: 0.66, branches: 2, chaos: 0.5 } :
    spec === "pine"      ? { spread: 36, decay: 0.68, wDecay: 0.62, branches: 2, chaos: 0.36 } :
    spec === "oak"       ? { spread: 62, decay: 0.75, wDecay: 0.7,  branches: 2, chaos: 0.85 } :
    spec === "olive"     ? { spread: 70, decay: 0.72, wDecay: 0.68, branches: 3, chaos: 0.9 } :
    spec === "jacaranda" ? { spread: 58, decay: 0.76, wDecay: 0.7,  branches: 2, chaos: 0.72 } :
                           { spread: 30, decay: 0.8,  wDecay: 0.74, branches: 2, chaos: 0.28 }; // palm

  const leafHue = spec === "jacaranda" ? 272 : grassHue + 4;

  const tree = generateFractalTree({
    seed: t.dna,
    originX: GROUND_CX,
    originY: GROUND_CY - 4,
    trunkLength: 52 * grow,
    trunkWidth: 11 * grow,
    maxDepth: clamp(pt.treeDepth + (s.growthPhase >= 3 ? 1 : 0), 3, 7),
    branchesPerNode: cfg.branches,
    spreadAngle: cfg.spread,
    lengthDecay: cfg.decay,
    widthDecay: cfg.wDecay,
    trunkCurve: pt.trunkCurve,
    leafHue,
    foliage: clamp(pt.foliage * (0.6 + s.lifeRatio * 0.5), 0.2, 1),
    fruitCount: clamp(Math.floor(s.totalRosaries / 8), 0, 9),
    fruitHue: 348,
    chaos: cfg.chaos,
  });

  const trunkFill = hsl(clamp(grassHue - 68, 8, 40), 22, 24 + s.lifeRatio * 7);
  return { tree, trunkFill };
}

/* ══ RAMAS DE ENERGÍA DEVOCIONAL ═══════════════════════════════════════ */
/**
 * Genera ramas principales adicionales basadas en la energía devocional:
 * E = rosaries · 1.2 + novenas · 3 + coronillas · 1.5 + streak · 0.6 + waterings · 0.2
 * B = floor(4 · ln(1 + E/50))
 * Cada rama i (desde 1 hasta B):
 *   seed = dna + ":branch:" + i
 *   ángulo = (-1)^i · (30° + prng(seed) · 15°)
 *   longitud = raíz base · (1 - i / (B + 2))  → rama i=1 es la más larga
 */
function buildEnergyBranches(t: DnaTraits, s: GardenState, tree: FractalTree): EnergyBranch[] {
  const E = s.totalRosaries * 1.2 + s.totalNovenas * 3 + s.totalCoronillas * 1.5
    + s.streak * 0.6 + s.totalWaterings * 0.2;
  const B = Math.floor(4 * Math.log(1 + E / 50));
  if (B <= 0) return [];

  const trunkTopY = tree.crownY;
  const trunkTopX = tree.crownX;
  const clusterHue = (t.baseHue + 14) % 360;

  return Array.from({ length: B }, (_, i) => {
    const branchIdx = i + 1;
    const seed = t.dna + ":branch:" + branchIdx;
    const p = createPrng(seed);
    const sign = branchIdx % 2 === 0 ? -1 : 1;
    const angle = sign * (30 + p() * 15); // grados
    const angleRad = angle * DEG;
    const length = clamp(tree.totalHeight * 0.35 * (1 - branchIdx / (B + 2)), 18, 62);
    const endX = trunkTopX + Math.cos(angleRad) * length;
    const endY = trunkTopY + Math.sin(angleRad) * length * 0.34;
    const R = 15 + Math.sqrt(s.streak * 10);

    return {
      x: endX,
      y: endY,
      angle,
      length,
      clusterR: clamp(R, 15, 60),
      clusterHue,
    };
  });
}

/* ══ FRUTOS COSECHABLES EN EL ÁRBOL ═════════════════════════════════ */
function buildTreeFruits(s: GardenState, branches: EnergyBranch[]): HarvestableFruitModel[] {
  const fruitCount = Math.max(0, Math.floor(s.streak / 10) - s.totalHarvestedFruits);
  const maxRender = Math.min(fruitCount, 7);
  if (maxRender <= 0 || branches.length === 0) return [];

  const out: HarvestableFruitModel[] = [];
  for (let i = 0; i < maxRender; i++) {
    const branchIdx = (i * 3) % branches.length;
    const p = createPrng(`tree-fruit-${i}-${s.streak}`);
    out.push({
      id: `tree-fruit-${i}`,
      type: i % 2 === 0 ? "pomegranate" : "fig",
      branchIndex: branchIdx,
      offsetX: (p() - 0.5) * 12,
      offsetY: (p() - 0.5) * 8 - 4,
      scale: clamp(0.8 + p() * 0.6, 0.7, 1.3),
    });
  }
  return out;
}

/* ══ ELEMENTOS ARQUITECTÓNICOS POR TIER ═════════════════════════════ */
function buildArchitecture(t: DnaTraits, s: GardenState, pt: PersonalTraits): {
  elements: ArchitecturalElement[];
  structures: SacredStructure[];
} {
  const elements: ArchitecturalElement[] = [];
  const structures: SacredStructure[] = [];
  const p = createPrng(t.dna + "::architecture");

  if (s.condensationTier >= 3) {
    if (s.totalPrayers >= 100) {
      const benchX = GROUND_CX + (p() > 0.5 ? 1 : -1) * rnd(p, 120, 180);
      const benchY = GROUND_CY + rnd(p, -4, 8);
      elements.push({ kind: "bench", x: benchX, y: benchY, scale: rnd(p, 0.9, 1.2), hue: (t.baseHue + 20) % 360 });
    }
    if (s.totalPrayers >= 150) {
      const lectX = GROUND_CX + (p() > 0.5 ? 1 : -1) * rnd(p, 100, 160);
      const lectY = GROUND_CY - 12;
      elements.push({ kind: "lectern", x: lectX, y: lectY, scale: rnd(p, 0.85, 1.15), hue: pt.dominantHue });
    }
    if (s.totalPrayers >= 200) {
      const ftnX = pathAnchor(t).x + rnd(p, -20, 20);
      const ftnY = pathAnchor(t).y + rnd(p, -8, 4);
      elements.push({ kind: "fountain", x: ftnX, y: ftnY, scale: rnd(p, 0.8, 1.1), hue: (pt.dominantHue + 40) % 360 });
    }
  }

  if (s.condensationTier >= 4) {
    if (s.totalPrayers >= 500) {
      const structX = GROUND_CX;
      const structY = GROUND_CY - 40;
      const kind = s.totalPrayers >= 1500 ? "sanctuary" : "chapel";
      const roseCount = clamp(Math.floor(s.totalRosaries / 12), 6, 30);
      const lightRays = clamp(Math.floor(s.totalCandles / 5), 4, 20);
      structures.push({ kind, x: structX, y: structY, scale: clamp(0.8 + s.level * 0.05, 0.8, 2.5), roseCount, lightRays });
    }
  }

  return { elements, structures };
}

/* ══ FLORES PARAMÉTRICAS CON TOPE Y CONSOLIDACIÓN ═══════════════════════ */
function buildFlowers(t: DnaTraits, s: GardenState, pt: PersonalTraits, bloomOpen: number) {
  const p = createPrng(t.dna + "::flowerfield");
  const placed: PlacedFlower[] = [];
  const used: Array<{ x: number; y: number }> = [];

  const place = (minDist: number) => {
    for (let i = 0; i < 30; i++) {
      const g = groundPoint(rnd(p, 0, Math.PI * 2), rnd(p, 112, 246));
      if (Math.hypot(g.x - GROUND_CX, (g.y - GROUND_CY) * 2.6) < 88) continue;
      if (used.every((u) => Math.hypot(g.x - u.x, (g.y - u.y) * 2.2) > minDist)) {
        used.push(g); return g;
      }
    }
    const fb = groundPoint(rnd(p, 0, Math.PI * 2), 208);
    used.push(fb); return fb;
  };

  const add = (
    species: FlowerSpecies, hue: number, tier: "simple" | "mature",
    label?: string,
  ) => {
    if (placed.length >= CAPS.flowers) return;
    const big = tier === "mature";
    const g = place(big ? 74 : 50);
    const scale = (big ? rnd(p, 1.35, 1.7) : rnd(p, 0.72, 1)) * pt.growthScale * (0.82 + s.lifeRatio * 0.22);
    placed.push({
      x: g.x, y: g.y, tier, label,
      windDelay: rnd(p, 0, 2.4),
      flower: generateFlower({
        seed: `${t.dna}::${species}::${placed.length}`,
        species,
        petalCount: big ? Math.round(pt.petalCount * 1.6) : pt.petalCount,
        layers: big ? pt.petalLayers + 2 : pt.petalLayers,
        hue,
        scale,
        stemLength: rnd(p, 16, 27) * (big ? 1.25 : 1) * pt.growthScale,
        lean: rnd(p, -12, 12),
        openness: bloomOpen,
        seedCount: species === "sunflower" ? 120 : big ? 55 : 0,
      }),
    });
  };

  /* ── Condensación visual por tier de oraciones ───────────────────────── */
  // En tiers altos, la flora individual se condensa en arbustos/estructuras.
  // Reducimos la cantidad de flores individuales según el tier:
  //   Tier 1 (1-20):    100% flores individuales (comportamiento actual)
  //   Tier 2 (21-100):  50% flores individuales + rosal condensado
  //   Tier 3 (101-500): 20% flores individuales
  //   Tier 4 (500+):    10% flores individuales
  const flowerRatio = [1, 0.5, 0.2, 0.1][s.condensationTier - 1];
  const maxFlorales = Math.round(CAPS.flowers * flowerRatio);

  /* Rosarios → especie dominante del usuario */
  const dom = pt.flowerSpecies;
  const roseUnits = Math.floor(s.totalRosaries / 4);
  if (roseUnits > 5) {
    add(dom, pt.dominantHue, "mature", "Rosal de Gracia");
    for (let i = 0; i < clamp(roseUnits - 5, 0, 2); i++) add(dom, pt.dominantHue, "simple");
  } else {
    for (let i = 0; i < roseUnits; i++) add(dom, pt.dominantHue, "simple");
  }

  /* Novenas → lirios */
  const lilyUnits = Math.floor(s.totalNovenas / 2);
  if (lilyUnits > 3) add("lily", 46, "mature", "Lirio Dorado");
  else for (let i = 0; i < lilyUnits; i++) add("lily", 46, "simple");

  /* Coronillas → margaritas */
  for (let i = 0; i < clamp(Math.floor(s.totalCoronillas / 5), 0, 2); i++)
    add("daisy", (pt.dominantHue + 190) % 360, "simple");

  /* Silencio → iris */
  for (let i = 0; i < clamp(Math.floor(s.totalSilence / 5), 0, 2); i++)
    add("iris", 268, "simple");

  /* Ambientales según la vitalidad */
  const ambient = clamp(Math.round(s.lifeRatio * 3 * flowerRatio), 0, Math.max(0, maxFlorales - placed.length));
  for (let i = 0; i < ambient; i++)
    add(dom, (pt.dominantHue + i * 34) % 360, "simple");

  /* Santuario mariano */
  const arch =
    s.totalRosaries >= 24 || (t.flowerSpeciesBias === "rose" && s.totalRosaries >= 12)
      ? {
          x: GROUND_CX, y: GROUND_CY - 6,
          scale: clamp(0.84 + s.growthPhase * 0.06, 0.84, 1.14),
          roseCount: clamp(6 + Math.floor(s.totalRosaries / 12), 6, 12),
          hue: pt.dominantHue,
        }
      : null;

  return { placed, arch };
}

/* ══ PASTO Y ARBUSTOS GENERATIVOS ═══════════════════════════════════════ */
function buildGrass(t: DnaTraits, s: GardenState, grassHue: number, bonus: number): GrassTuft[] {
  const p = createPrng(t.dna + "::grassfield");
  const n = clamp(Math.round(8 + s.lifeRatio * 6 + bonus * 0.3), 6, CAPS.grassTufts);
  return Array.from({ length: n }, (_, i) => {
    const g = groundPoint(rnd(p, 0, Math.PI * 2), rnd(p, 78, 262));
    return generateGrassTuft(
      `${t.dna}::tuft::${i}`,
      g.x, g.y + rnd(p, -3, 12),
      rndInt(p, 6, 14),                 // briznas por macizo
      rnd(p, 9, 17),
      grassHue,
      s.lifeRatio,
    );
  });
}

function buildShrubs(t: DnaTraits, s: GardenState, grassHue: number): ShrubModel[] {
  if (s.growthPhase < 2) return [];
  const p = createPrng(t.dna + "::shrubs");
  const n = clamp(s.growthPhase - 1, 1, CAPS.shrubs);
  return Array.from({ length: n }, (_, i) => {
    const g = groundPoint(rnd(p, 0, Math.PI * 2), rnd(p, 148, 250));
    return generateShrub(
      `${t.dna}::shrub::${i}`,
      g.x, g.y + rnd(p, 0, 8),
      rnd(p, 11, 18),
      grassHue + rnd(p, -6, 10),
      s.lifeRatio,
      s.totalRosaries >= 10 ? rndInt(p, 2, 5) : 0,
    );
  });
}

/* ══ SANTUARIO DE PIEDRA Y VELAS ════════════════════════════════════════ */
function buildShrine(t: DnaTraits, s: GardenState): StoneShrine | null {
  if (s.growthPhase < 2 && s.totalRosaries < 3) return null;
  const p = createPrng(t.dna + "::shrine");
  const side = t.riverAngle >= 0 ? -1 : 1;
  return {
    kind: t.shrine,
    x: GROUND_CX + side * rnd(p, 98, 128),
    y: GROUND_CY + rnd(p, 6, 18),
    scale: clamp(0.85 + s.growthPhase * 0.06, 0.85, 1.12),
  };
}

function buildCandles(t: DnaTraits, s: GardenState, shrine: StoneShrine | null, rocks: RockModel[]): CandleModel[] {
  const n = clamp(s.activeCandles, 0, CAPS.candles);
  if (n === 0) return [];
  const p = createPrng(t.dna + "::candles");
  const out: CandleModel[] = [];
  if (shrine) {
    const near = Math.min(n, 3);
    for (let i = 0; i < near; i++) {
      out.push({
        x: shrine.x + (i - (near - 1) / 2) * 13 * shrine.scale,
        y: shrine.y + 8 * shrine.scale,
        scale: rnd(p, 0.9, 1.1) * shrine.scale, delay: i * 0.3,
      });
    }
  }
  rocks.filter((r) => r.rx > 7).slice(0, n - out.length).forEach((r, i) => {
    out.push({ x: r.x, y: r.y - r.ry * 0.85, scale: rnd(p, 0.75, 0.95), delay: (out.length + i) * 0.3 });
  });
  return out.slice(0, CAPS.candles);
}

/* ══ EFÍMEROS DE 24 h ═══════════════════════════════════════════════════ */
function buildSprouts(t: DnaTraits, s: GardenState): SproutModel[] {
  if (!s.freshWater) return [];
  const p = createPrng(t.dna + "::sprouts::" + Math.floor((s.lastWateredAt ?? 0) / 86_400_000));
  const n = Math.round(clamp(CAPS.sprouts * s.freshWaterRatio, 2, CAPS.sprouts));
  return Array.from({ length: n }, (_, i) => {
    const g = groundPoint((i / n) * Math.PI * 2 + rnd(p, -0.3, 0.3), rnd(p, 60, 106));
    return {
      x: g.x, y: g.y + rnd(p, -2, 8),
      h: rnd(p, 9, 17) * (0.6 + s.freshWaterRatio * 0.5),
      lean: rnd(p, -7, 7), delay: i * 0.1,
    };
  });
}

function buildEphemeralBloom(t: DnaTraits, s: GardenState, pt: PersonalTraits, open: number): EphemeralBloom | null {
  if (!s.freshWater) return null;
  const dayKey = Math.floor((s.lastWateredAt ?? 0) / 86_400_000);
  const p = createPrng(t.dna + "::bloom::" + dayKey);
  const a = pathAnchor(t);
  return {
    x: a.x + rnd(p, -18, 18),
    y: a.y + rnd(p, -4, 6),
    flower: generateFlower({
      seed: `${t.dna}::ephemeral::${dayKey}`,
      species: pt.flowerSpecies,
      petalCount: pt.petalCount,
      layers: 2,
      hue: (pt.dominantHue + 30) % 360,
      scale: (0.85 + s.freshWaterRatio * 0.4) * pt.growthScale,
      stemLength: 15,
      lean: rnd(p, -8, 8),
      openness: clamp(open + 0.3, 0, 1),
      seedCount: 34,
    }),
  };
}

/* ══ AGUA ═══════════════════════════════════════════════════════════════ */
function buildPond(t: DnaTraits, s: GardenState): PondModel {
  const p = createPrng(t.dna + "::pond");
  const w = s.waterLevel / 100;
  const visible = t.waterFeature === "pond" && s.waterLevel > 14;
  const base = groundPoint(t.riverAngle >= 0 ? 0.42 : Math.PI - 0.42, 176);
  const rx = lerp(26, 66, w), ry = rx * 0.35;
  return {
    cx: base.x, cy: base.y, rx, ry, visible,
    koi: Array.from({ length: visible ? clamp(Math.round(w * 3), 1, 3) : 0 }, (_, i) => ({
      x: base.x + rnd(p, -rx * 0.4, rx * 0.4), y: base.y + rnd(p, -ry * 0.4, ry * 0.4),
      hue: pick(p, [18, 28, 40]), dur: rnd(p, 6, 9), delay: i,
    })),
    lilies: Array.from({ length: visible ? clamp(Math.round(w * 3), 1, 3) : 0 }, () => ({
      x: base.x + rnd(p, -rx * 0.66, rx * 0.66), y: base.y + rnd(p, -ry * 0.55, ry * 0.55),
      r: rnd(p, 4.5, 8), rot: rnd(p, 0, 360),
    })),
  };
}

function buildRiver(t: DnaTraits, s: GardenState): RiverModel {
  const visible = t.waterFeature === "river" && s.waterLevel > 8;
  const dx = Math.tan((t.riverAngle * Math.PI) / 180) * 70;
  const y0 = GROUND_CY + 14;
  return {
    visible,
    d: `M ${132 - dx} ${y0 + 36} Q ${290 + dx * 0.5} ${y0 + 2} 360 ${y0 + 12} Q ${434 - dx * 0.5} ${y0 + 22} ${598 + dx} ${y0 - 8}`,
    width: lerp(4, 15, s.waterLevel / 100),
    bankX: t.riverAngle >= 0 ? 486 : 234,
    bankY: y0 + (t.riverAngle >= 0 ? 6 : 22),
  };
}

function buildRocks(t: DnaTraits, bonus: number): RockModel[] {
  const p = createPrng(t.dna + "::rocks");
  const base: Record<DnaTraits["rockPattern"], number> = {
    scattered: 5, clustered: 4, cairn: 3, ring: 6, sparse: 2,
  };
  const n = clamp(base[t.rockPattern] + Math.floor(bonus * 0.3), 2, CAPS.rocks);
  const clusterA = rnd(p, 0, Math.PI * 2);
  return Array.from({ length: n }, (_, i) => {
    let a: number, r: number;
    if (t.rockPattern === "clustered")  { a = clusterA + rnd(p, -0.4, 0.4); r = rnd(p, 168, 226); }
    else if (t.rockPattern === "ring")  { a = (i / n) * Math.PI * 2; r = 214; }
    else if (t.rockPattern === "cairn") { a = clusterA + rnd(p, -0.1, 0.1); r = 196 - i * 5; }
    else                                { a = rnd(p, 0, Math.PI * 2); r = rnd(p, 132, 250); }
    const g = groundPoint(a, r);
    const rx = rnd(p, 6, 13);
    return {
      x: g.x, y: g.y + (t.rockPattern === "cairn" ? -i * 7 : rnd(p, -1, 8)),
      rx, ry: rx * rnd(p, 0.5, 0.7), tone: rnd(p, 0, 1), rot: rnd(p, -14, 14),
    };
  });
}

/* ══ TRAYECTORIAS DE VUELO (para <animateMotion>) ═══════════════════════ */
/** Bucle cerrado suave alrededor de un punto: la mariposa nunca "salta". */
function flightPath(p: () => number, cx: number, cy: number, rx: number, ry: number): string {
  const w1 = rnd(p, -14, 14), w2 = rnd(p, -12, 12);
  return `M ${cx - rx} ${cy}
          C ${cx - rx * 0.6} ${cy - ry + w1} ${cx - rx * 0.2} ${cy - ry * 1.3} ${cx} ${cy - ry * 0.6}
          C ${cx + rx * 0.3} ${cy - ry * 0.1 + w2} ${cx + rx * 0.8} ${cy - ry * 1.1} ${cx + rx} ${cy}
          C ${cx + rx * 0.7} ${cy + ry * 1.1} ${cx + rx * 0.2} ${cy + ry * 0.3 + w1} ${cx} ${cy + ry * 0.7}
          C ${cx - rx * 0.4} ${cy + ry * 1.2} ${cx - rx * 0.8} ${cy + ry * 0.2 + w2} ${cx - rx} ${cy} Z`;
}

function buildFlyers(t: DnaTraits, s: GardenState, pt: PersonalTraits, accentHue: number): FlyerModel[] {
  if (s.timeOfDay === "noche") return [];
  const p = createPrng(t.dna + "::flyers");
  const n = clamp(s.butterflyCount, 0, CAPS.butterflies);
  // De día con última conexión diurna → abejas; si no → mariposas
  const kind: FlyerModel["kind"] = pt.nocturnal ? "butterfly" : (s.lightLevel > 55 ? "bee" : "butterfly");
  return Array.from({ length: n }, (_, i) => ({
    path: flightPath(p, GROUND_CX + rnd(p, -170, 170), GROUND_CY - rnd(p, 70, 150),
      rnd(p, 42, 88), rnd(p, 22, 48)),
    hue: (accentHue + i * 62) % 360,
    dur: rnd(p, 13, 22),
    begin: i * rnd(p, 1.4, 3),
    scale: rnd(p, 0.6, 0.92),
    kind,
  }));
}

function buildFireflies(t: DnaTraits, s: GardenState, pt: PersonalTraits): FireflyModel[] {
  const isNight = s.timeOfDay === "noche" || s.timeOfDay === "madrugada" || pt.nocturnal;
  if (!isNight) return [];
  const p = createPrng(t.dna + "::fireflies");
  const n = clamp(Math.round(3 + s.lifeRatio * 3), 3, CAPS.fireflies);
  return Array.from({ length: n }, (_, i) => ({
    path: flightPath(p, GROUND_CX + rnd(p, -190, 190), GROUND_CY - rnd(p, 30, 130),
      rnd(p, 26, 58), rnd(p, 16, 36)),
    dur: rnd(p, 9, 17),
    begin: i * 0.8,
  }));
}

function buildBirds(t: DnaTraits, s: GardenState, tree: FractalTree): BirdModel[] {
  const p = createPrng(t.dna + "::birds");
  const n = clamp(s.birdCount, 0, CAPS.birds);
  if (n === 0) return [];
  const dove = s.streak >= 7 || s.commits >= 5;
  return Array.from({ length: n }, (_, i) => ({
    path: flightPath(p, tree.crownX + (i === 0 ? -95 : 95), tree.crownY + rnd(p, -18, 26),
      rnd(p, 60, 105), rnd(p, 26, 46)),
    scale: rnd(p, 0.78, 1),
    dur: rnd(p, 20, 30),
    begin: i * 2.4,
    isDove: dove && i === 0,
  }));
}

function buildParticles(t: DnaTraits, s: GardenState, bonus: number): ParticleModel[] {
  const p = createPrng(t.dna + "::particles");
  const n = clamp(Math.round(s.lifeRatio * 4 + bonus * 0.15), 0, CAPS.particles);
  return Array.from({ length: n }, (_, i) => ({
    x: rnd(p, 90, VIEW_W - 90), y: rnd(p, 110, GROUND_CY + 20),
    r: rnd(p, 0.9, 2), dur: rnd(p, 6, 12), delay: (i % 6) * 0.7,
  }));
}

function buildLights(t: DnaTraits, s: GardenState, bonus: number, accentHue: number): LightModel[] {
  const p = createPrng(t.dna + "::lights");
  const n = clamp(Math.round((s.lightLevel / 100) * 4 + bonus * 0.2), 0, CAPS.lights);
  return Array.from({ length: n }, (_, i) => {
    const g = groundPoint(rnd(p, 0, Math.PI * 2), rnd(p, 110, 250));
    return {
      x: g.x, y: g.y - rnd(p, 10, 62), r: rnd(p, 1.6, 3.2),
      hue: accentHue + rnd(p, -16, 16), dur: rnd(p, 2.4, 4.6), delay: i * 0.5,
    };
  });
}

function buildDeer(t: DnaTraits, s: GardenState, river: RiverModel): DeerModel | null {
  if (t.waterFeature !== "river" || !river.visible || s.waterLevel < 50) return null;
  return {
    x: river.bankX, y: river.bankY - 6, scale: 0.9,
    facing: t.riverAngle >= 0 ? -1 : 1,
    drinking: s.timeOfDay === "madrugada" || s.timeOfDay === "noche",
  };
}

function buildDew(t: DnaTraits, s: GardenState): DewPoint[] {
  const p = createPrng(t.dna + "::dew");
  return Array.from({ length: clamp(s.dewPoints, 0, 7) }, (_, i) => {
    const g = groundPoint(rnd(p, 0, Math.PI * 2), rnd(p, 96, 236));
    return { x: g.x, y: g.y - rnd(p, 2, 16), r: rnd(p, 1.4, 2.6), delay: i * 0.4 };
  });
}

/* ══ PUNTO DE ENTRADA ═══════════════════════════════════════════════════ */
export function generateGardenModel(
  traits: DnaTraits,
  state: GardenState,
  personal: PersonalTraits,
  bloomOpen = 1,
): GardenModel {
  const pal = PALETTE_TABLE[traits.paletteVariant];
  /* El matiz dominante del usuario tiñe toda la paleta */
  const grassHue = pal.grass + ((personal.dominantHue % 40) - 20) * 0.5;
  const accentHue = (pal.accent + personal.dominantHue) / 2;
  const lv = resolveLevel(state.level);

  const { tree, trunkFill } = buildTree(traits, state, personal, grassHue);
  const rocks = buildRocks(traits, lv.rocks);
  const shrine = buildShrine(traits, state);
  const river = buildRiver(traits, state);
  const { placed: flowers, arch: marianArch } = buildFlowers(traits, state, personal, bloomOpen);

  const energyBranches = buildEnergyBranches(traits, state, tree);
  const harvestableFruits = buildTreeFruits(state, energyBranches);
  const { elements: archElements, structures: sacredStructures } = buildArchitecture(traits, state, personal);

  return {
    palette: { grassHue, accentHue },
    terrainLayers: buildTerrain(traits, state, grassHue),
    shadows: [
      { cx: GROUND_CX, cy: GROUND_CY + 4, rx: 58, ry: 12, opacity: 1 },
      { cx: GROUND_CX - 122, cy: GROUND_CY + 22, rx: 34, ry: 8, opacity: 0.55 },
      { cx: GROUND_CX + 138, cy: GROUND_CY + 18, rx: 36, ry: 8, opacity: 0.55 },
    ],
    pathD: buildPath(traits),
    tree,
    treeTrunkFill: trunkFill,
    pond: buildPond(traits, state),
    river,
    grass: buildGrass(traits, state, grassHue, lv.plants),
    shrubs: buildShrubs(traits, state, grassHue),
    flowers,
    marianArch,
    shrine,
    candles: buildCandles(traits, state, shrine, rocks),
    sprouts: buildSprouts(traits, state),
    ephemeralBloom: buildEphemeralBloom(traits, state, personal, bloomOpen),
    rocks,
    lights: buildLights(traits, state, lv.lights, accentHue),
    flyers: buildFlyers(traits, state, personal, accentHue),
    fireflies: buildFireflies(traits, state, personal),
    birds: buildBirds(traits, state, tree),
    particles: buildParticles(traits, state, lv.particles),
    deer: buildDeer(traits, state, river),
    dewPoints: buildDew(traits, state),
    levelTitle: lv.title,
    energyBranches,
    harvestableFruits,
    architecturalElements: archElements,
    sacredStructures,
  };
}
