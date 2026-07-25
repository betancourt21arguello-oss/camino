import { createPrng, noise1D } from "./prng";
import { resolveLevel } from "./levels";
import type { DnaTraits, GardenSignature, GardenState } from "./types";

export interface GardenPoint {
  id: string;
  x: number;
  y: number;
  scale: number;
  tone: number;
  delay: number;
}

export interface TreeBranch {
  d: string;
  width: number;
  depth: number;
  x1: number;
  y1: number;
  angle: number;
}

export interface TreeModel {
  species: DnaTraits["treeSpecies"];
  x: number;
  y: number;
  trunkHeight: number;
  canopyScale: number;
  branches: TreeBranch[];
  visibleDepth: number;
  cedarExtras?: CedarExtras;
}

export interface CedarRoot {
  d: string;
  stroke: string;
  strokeWidth: number;
}

export interface CedarCanopyLayer {
  d: string;
  fill: string;
  opacity: number;
}

export interface CedarExtras {
  roots: CedarRoot[];
  canopyLayers: CedarCanopyLayer[];
}

export interface TerrainLayer {
  id: string;
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface FloraCluster {
  id: string;
  x: number;
  y: number;
  type: "lavender" | "daisy" | "rosemary" | "thyme" | "olive_shrub";
  scale: number;
  tone: number;
  delay: number;
  rotation: number;
}

export interface PondModel {
  d: string;
  deepD: string;
  fill: string;
  stroke: string;
  ripples: Array<{ x: number; y: number; rx: number; ry: number; delay: number }>;
  lilies: Array<{ x: number; y: number; scale: number }>;
  stones: Array<{ x: number; y: number; scale: number }>;
  visible: boolean;
}

export interface ShadowDef {
  x: number;
  y: number;
  rx: number;
  ry: number;
  opacity: number;
}

export interface GardenModel {
  terrain: string;
  terrainLayers: TerrainLayer[];
  path: string;
  pathWidth: number;
  river: { d: string; visible: boolean };
  pond?: PondModel;
  rocks: GardenPoint[];
  ambientPlants: GardenPoint[];
  ambientFlowers: GardenPoint[];
  lights: GardenPoint[];
  tree: TreeModel;
  butterflies: GardenPoint[];
  particles: GardenPoint[];
  lightRays: { x: number; width: number; opacity: number }[];
  shadows: ShadowDef[];
  floraClusters: FloraCluster[];
}

const clampCount = (value: number, max: number) => Math.max(0, Math.min(value, max));

function makePoints(
  rng: () => number,
  key: string,
  count: number,
  box: { x0: number; x1: number; y0: number; y1: number },
): GardenPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${key}-${i}`,
    x: box.x0 + rng() * (box.x1 - box.x0),
    y: box.y0 + rng() * (box.y1 - box.y0),
    scale: 0.7 + rng() * 0.65,
    tone: Math.floor(rng() * 4),
    delay: rng() * 4,
  })).sort((a, b) => a.y - b.y);
}

function fullTreeStructure(
  rng: () => number,
  x = 0,
  y = 0,
  length = 46,
  maxDepth = 6,
  angle = Math.PI / 2,
  depth = maxDepth,
  out: TreeBranch[] = [],
): TreeBranch[] {
  if (depth <= 0) return out;
  const x2 = x + Math.cos(angle) * length;
  const y2 = y - Math.sin(angle) * length;
  const bend = (rng() - 0.5) * 9;
  out.push({
    d: `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${((x + x2) / 2 + bend).toFixed(1)} ${((y + y2) / 2).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    width: Math.max(0.8, depth * 1.2),
    depth: maxDepth - depth,
    x1: x2,
    y1: y2,
    angle,
  });
  fullTreeStructure(rng, x2, y2, length * 0.71, maxDepth, angle - 0.47 - rng() * 0.13, depth - 1, out);
  fullTreeStructure(rng, x2, y2, length * 0.68, maxDepth, angle + 0.44 + rng() * 0.13, depth - 1, out);
  return out;
}

function buildCentralTree(traits: DnaTraits, state: GardenState): TreeModel {
  const full = fullTreeStructure(createPrng(`${traits.dna}:tree`));
  const historyTotal =
    state.totalRosaries * 1.2 +
    state.totalNovenas * 3 +
    state.totalCoronillas * 1.5 +
    state.streak * 0.6 +
    state.totalWaterings * 0.2;

  // growthFactor reveals depth: pure deterministic prefix
  const visibleDepth = Math.min(6, Math.max(2, Math.floor(2 + historyTotal / 10)));
  const visibleCount = full.filter((b) => b.depth < visibleDepth).length;
  const visibleBranches = full.slice(0, Math.max(visibleCount, 5));

  return {
    species: traits.treeSpecies,
    x: 360,
    y: 322,
    trunkHeight: 44 + Math.min(36, historyTotal * 0.42),
    canopyScale: 1 + Math.min(0.6, historyTotal / 120),
    branches: visibleBranches,
    visibleDepth,
  };
}

function terrainPath(traits: DnaTraits): string {
  const points = Array.from({ length: 9 }, (_, i) => {
    const x = i * 90;
    const y = 314 + noise1D(i * 0.52, `${traits.dna}:terrain`) * 26;
    return `${x},${y.toFixed(1)}`;
  });
  return `M 0 460 L 0 ${points[0].split(",")[1]} ${points.map((p) => `L ${p}`).join(" ")} L 720 460 Z`;
}

function pathForShape(traits: DnaTraits): string {
  switch (traits.pathShape) {
    case "recto":
      return "M 360 460 L 358 300";
    case "espiral":
      return "M 360 460 C 300 420, 420 400, 380 350 C 350 320, 400 300, 388 270";
    case "cruz":
      return "M 360 460 L 358 300 M 300 380 L 420 380";
    case "circulo":
      return "M 360 460 C 300 430, 300 350, 360 330 C 420 350, 420 430, 360 460";
    case "curvo":
    default:
      return "M 378 460 C 330 410, 430 365, 360 325";
  }
}

function buildIsometricTerrain(traits: DnaTraits): TerrainLayer[] {
  const rng = createPrng(`${traits.dna}:iso-terrain`);
  const layers: TerrainLayer[] = [];
  const baseY = 448;
  const layerHeight = 36;
  const totalLayers = 7;

  for (let i = 0; i < totalLayers; i++) {
    const progress = i / (totalLayers - 1);
    const noise = noise1D(i * 0.7, `${traits.dna}:terrain-layer-${i}`) * 10;
    const y = baseY - i * layerHeight + noise;
    const halfWidth = 210 - progress * 70 + noise1D(i * 0.3, `${traits.dna}:terrain-w-${i}`) * 8;
    const bevel = 5 + progress * 5;
    const leftX = 360 - halfWidth;
    const rightX = 360 + halfWidth;

    const shade = Math.round(185 + progress * 40);
    const fill = `rgb(${shade + 12}, ${shade + 8}, ${shade})`;
    const stroke = `rgb(${shade - 10}, ${shade - 14}, ${shade - 18})`;

    layers.push({
      id: `terrain-${i}`,
      d: `M ${leftX.toFixed(1)} ${y.toFixed(1)} L ${rightX.toFixed(1)} ${y.toFixed(1)} L ${(rightX + bevel).toFixed(1)} ${(y + layerHeight).toFixed(1)} L ${(leftX - bevel).toFixed(1)} ${(y + layerHeight).toFixed(1)} Z`,
      fill,
      stroke,
      strokeWidth: 0.6,
    });
  }
  return layers;
}

function buildIsometricPond(traits: DnaTraits, state: GardenState): PondModel | undefined {
  const rng = createPrng(`${traits.dna}:pond`);
  const cx = 580 + rng() * 30;
  const cy = 350 + rng() * 20;
  const width = 60 + rng() * 30;
  const height = 22 + rng() * 15;

  const d = `M ${cx} ${cy - height} C ${cx + width * 0.3} ${cy - height * 1.4}, ${cx + width} ${cy - height * 0.4}, ${cx + width * 0.7} ${cy} C ${cx + width * 0.4} ${cy + height * 1.1}, ${cx - width * 0.2} ${cy + height * 1.3}, ${cx - width * 0.3} ${cy + height * 0.4} C ${cx - width} ${cy + height * 0.1}, ${cx - width * 0.6} ${cy - height}, ${cx} ${cy - height} Z`;
  
  const deepD = `M ${cx + 5} ${cy - 5} C ${cx + width * 0.2} ${cy - height * 0.8}, ${cx + width * 0.5} ${cy - height * 0.2}, ${cx + width * 0.3} ${cy + 3} C ${cx + width * 0.1} ${cy + height * 0.6}, ${cx - width * 0.1} ${cy + height * 0.7}, ${cx - width * 0.1} ${cy + 2} C ${cx - width * 0.3} ${cy - height * 0.3}, ${cx + width * 0.1} ${cy - height * 0.5}, ${cx + 5} ${cy - 5} Z`;

  const rippleCount = 3 + Math.floor(state.waterLevel / 25);
  const ripples = Array.from({ length: rippleCount }, (_, i) => ({
    x: cx + (rng() - 0.5) * width * 0.4,
    y: cy + (rng() - 0.5) * height * 0.3,
    rx: 6 + i * 6,
    ry: 3 + i * 2.5,
    delay: rng() * 3,
  }));

  const lilyCount = 1 + Math.floor(state.waterLevel / 35);
  const lilies = Array.from({ length: lilyCount }, () => ({
    x: cx + (rng() - 0.5) * width * 0.5,
    y: cy + (rng() - 0.5) * height * 0.3,
    scale: 0.5 + rng() * 0.5,
  }));

  const stones = Array.from({ length: 2 + Math.floor(rng() * 3) }, () => ({
    x: cx + (rng() - 0.5) * width * 0.6,
    y: cy + (rng() - 0.5) * height * 0.4,
    scale: 0.4 + rng() * 0.5,
  }));

  return {
    d,
    deepD,
    fill: "url(#waterIsometric)",
    stroke: "#4a6a7a",
    ripples,
    lilies,
    stones,
    visible: state.waterLevel > 10 || state.totalWaterings > 0,
  };
}

function buildCedarTree(traits: DnaTraits, state: GardenState): TreeModel & { cedarExtras: CedarExtras } {
  const historyTotal =
    state.totalRosaries * 1.2 +
    state.totalNovenas * 3 +
    state.totalCoronillas * 1.5 +
    state.streak * 0.6 +
    state.totalWaterings * 0.2;

  const rng = createPrng(`${traits.dna}:cedar`);
  const x = 290 + rng() * 60;
  const y = 390;
  const trunkHeight = 55 + Math.min(45, historyTotal * 0.38);
  const canopyScale = 1 + Math.min(0.5, historyTotal / 120);

  const trunkBranches: TreeBranch[] = [
    { d: `M ${x - 9} ${y} L ${x - 7} ${y - trunkHeight}`, width: 9, depth: 0, x1: x - 7, y1: y - trunkHeight, angle: Math.PI / 2 },
    { d: `M ${x + 7} ${y} L ${x + 6} ${y - trunkHeight}`, width: 8, depth: 0, x1: x + 6, y1: y - trunkHeight, angle: Math.PI / 2 },
  ];

  const barkTex = Array.from({ length: 10 }, (_, i) => {
    const t = i / 10;
    const bx = x - 7 + rng() * 14;
    const by = y - trunkHeight * t * 0.55;
    return {
      d: `M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${(bx + (rng() - 0.5) * 6).toFixed(1)} ${(by + 6).toFixed(1)} ${(bx + (rng() - 0.5) * 4).toFixed(1)} ${(by + 12).toFixed(1)}`,
      width: 0.8 + rng() * 0.5,
      depth: Math.floor(t * 3),
      x1: bx,
      y1: by,
      angle: Math.PI / 2 + (rng() - 0.5) * 0.3,
    };
  });

  const roots: CedarRoot[] = Array.from({ length: 6 + Math.floor(rng() * 4) }, (_, i) => {
    const baseAngle = -Math.PI / 2 + (i - 3) * 0.6;
    const angle = baseAngle + (rng() - 0.5) * 0.3;
    const len = 25 + rng() * 40;
    const ex = x + Math.cos(angle) * len;
    const ey = y + Math.sin(angle) * len * 0.35 + 8;
    return {
      d: `M ${x} ${y} Q ${(x + Math.cos(angle) * len * 0.5).toFixed(1)} ${(y + Math.sin(angle) * len * 0.2 + 4).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
      stroke: rng() > 0.5 ? "#5a4a32" : "#6b5a42",
      strokeWidth: 1.2 + rng() * 2,
    };
  });

  const canopyBaseY = y - trunkHeight - 2;
  const makeCanopy = (scaleY: number, shrink: number, color: string, opacity: number): CedarCanopyLayer => {
    const cy = canopyBaseY - 25 * canopyScale * scaleY;
    const sx = 42 * canopyScale * shrink;
    const sy = 28 * canopyScale * shrink;
    const sx2 = 46 * canopyScale * shrink;
    const sy2 = 18 * canopyScale * shrink;
    return {
      d: `M ${x} ${(cy - 35 * canopyScale * scaleY).toFixed(1)} C ${(x - sx).toFixed(1)} ${(cy - 10 * canopyScale * scaleY).toFixed(1)}, ${(x - sx2).toFixed(1)} ${(cy + sy2).toFixed(1)}, ${(x - sx * 0.7).toFixed(1)} ${(cy + sy).toFixed(1)} C ${(x - sx * 0.3).toFixed(1)} ${(cy + sy * 1.1).toFixed(1)}, ${(x + sx * 0.3).toFixed(1)} ${(cy + sy * 1.1).toFixed(1)}, ${(x + sx * 0.7).toFixed(1)} ${(cy + sy).toFixed(1)} C ${(x + sx2).toFixed(1)} ${(cy + sy2).toFixed(1)}, ${(x + sx).toFixed(1)} ${(cy - 10 * canopyScale * scaleY).toFixed(1)}, ${x} ${(cy - 35 * canopyScale * scaleY).toFixed(1)} Z`,
      fill: color,
      opacity,
    };
  };

  const canopyLayers: CedarCanopyLayer[] = [
    makeCanopy(1.0, 1.0, "#5a6b4a", 0.88),
    makeCanopy(0.92, 0.92, "#6b7a58", 0.85),
    makeCanopy(0.84, 0.84, "#7a8a66", 0.82),
    makeCanopy(0.76, 0.76, "#8a9976", 0.79),
    makeCanopy(0.68, 0.68, "#9aaa86", 0.75),
  ];

  return {
    species: traits.treeSpecies,
    x,
    y,
    trunkHeight,
    canopyScale,
    branches: trunkBranches.concat(barkTex),
    visibleDepth: 5,
    cedarExtras: { roots, canopyLayers },
  };
}

function buildFloraClusters(traits: DnaTraits, state: GardenState, exclude?: Set<string>): FloraCluster[] {
  const rng = createPrng(`${traits.dna}:flora`);
  const clusters: FloraCluster[] = [];
  
  const types: FloraCluster["type"][] = ["lavender", "daisy", "rosemary", "thyme", "olive_shrub"];
  const bias = traits.flowerSpeciesBias || 0;
  const count = Math.min(18, 6 + Math.floor(state.totalSeeds * 0.5) + Math.floor(state.totalSilenceMinutes / 8));

  for (let i = 0; i < count; i++) {
    const typeIndex = Math.floor((rng() * types.length + bias) % types.length);
    const type = types[typeIndex];
    const cx = 50 + rng() * 620;
    const cy = 330 + rng() * 90;
    
    if (exclude && exclude.has(`${type}-${cx.toFixed(0)}-${cy.toFixed(0)}`)) continue;
    
    clusters.push({
      id: `flora-${i}`,
      x: cx,
      y: cy,
      type,
      scale: 0.55 + rng() * 0.6,
      tone: Math.floor(rng() * 4),
      delay: rng() * 4,
      rotation: rng() * 360,
    });
  }
  return clusters;
}

function buildShadows(elements: Array<{ x: number; y: number; w?: number; h?: number }>): ShadowDef[] {
  return elements.map((el) => ({
    x: el.x + (el.w ? 4 : 3),
    y: el.y + (el.h ? 3 : 2),
    rx: el.w ? el.w * 0.7 : 12,
    ry: el.h ? el.h * 0.35 : 5,
    opacity: 0.18,
  }));
}

export function generateGardenModel(traits: DnaTraits, state: GardenState): GardenModel {
  return buildWildGarden(traits, state);
}

export function buildWildGarden(traits: DnaTraits, state: GardenState): GardenModel {
  const levelConfig = resolveLevel(state.level);

  const tree = traits.treeSpecies === "cedro" ? buildCedarTree(traits, state) : buildCentralTree(traits, state);

  const lightCount = Math.min(12, Math.floor(state.totalCoronillas * 1.2) + Math.floor(state.streak / 10)) + levelConfig.lightBonus;
  const flowerCount =
    Math.min(20, Math.floor(state.totalCoronillas * 1.5)) +
    Math.min(8, Math.floor(state.totalSilenceMinutes / 20)) +
    levelConfig.flowerBonus;

  const stoneCount = Math.min(12, 3 + state.totalNovenas * 2 + traits.rockPattern) + levelConfig.rockBonus;

  const smallVegCount = Math.min(
    30,
    5 + Math.floor(state.totalSeeds * 0.7) + Math.floor(state.totalSilenceMinutes / 6) + levelConfig.plantBonus,
  );

  const terrainLayers = buildIsometricTerrain(traits);
  const pond = buildIsometricPond(traits, state);
  const floraClusters = buildFloraClusters(traits, state);
  const shadows = buildShadows(floraClusters);

  return {
    terrain: `M 0 460 L 0 314 C 180 286 520 296 720 266 L 720 460 Z`,
    terrainLayers,
    path: pathForShape(traits),
    pathWidth: 30 + state.totalNovenas * 1.6,
    river: {
      visible: (state.waterLevel > 10 || state.totalWaterings > 0) && !pond?.visible,
      d: "",
    },
    pond,
    rocks: makePoints(createPrng(`${traits.dna}:rocks`), "rock", stoneCount, {
      x0: 60,
      x1: 660,
      y0: 330,
      y1: 420,
    }),
    ambientPlants: makePoints(
      createPrng(`${traits.dna}:ambient-plants`),
      "ambient-plant",
      clampCount(smallVegCount, 28),
      { x0: 35, x1: 685, y0: 320, y1: 434 },
    ),
    ambientFlowers: makePoints(
      createPrng(`${traits.dna}:ambient-flowers`),
      "ambient-flower",
      clampCount(flowerCount, 22),
      { x0: 55, x1: 665, y0: 292, y1: 405 },
    ),
    lights: makePoints(
      createPrng(`${traits.dna}:lights`),
      "light",
      clampCount(lightCount, 14),
      { x0: 100, x1: 620, y0: 280, y1: 380 },
    ),
    tree,
    butterflies: makePoints(createPrng(`${traits.dna}:butterflies`), "butterfly", Math.min(6, Math.floor(state.waterLevel / 18)) + levelConfig.butterflyBonus, {
      x0: 80,
      x1: 640,
      y0: 140,
      y1: 285,
    }),
    particles: makePoints(createPrng(`${traits.dna}:particles`), "particle", 16 + levelConfig.particleBonus, {
      x0: 25,
      x1: 695,
      y0: 70,
      y1: 350,
    }),
    lightRays: (() => {
      const lightRng = createPrng(`${traits.dna}:light`);
      return Array.from(
        { length: clampCount(Math.floor(state.communityPrayer / 2) + 2 + levelConfig.lightRayBonus, 7) },
        () => ({
          x: lightRng() * 720,
          width: 30 + lightRng() * 80,
          opacity: 0.035 + lightRng() * 0.06,
        }),
      );
    })(),
    shadows,
    floraClusters,
  };
}

export function signatureFromDna(traits: DnaTraits): GardenSignature {
  const rng = createPrng(`${traits.signatureSeed}:signature`);
  const kinds: GardenSignature["kind"][] = ["leaf", "flower", "branch", "star"];
  return {
    kind: kinds[Math.floor(rng() * kinds.length)],
    hue: 65 + Math.floor(rng() * 65),
    angle: -24 + Math.floor(rng() * 48),
    petals: 4 + Math.floor(rng() * 4),
    code: Math.floor(rng() * 65535),
  };
}
