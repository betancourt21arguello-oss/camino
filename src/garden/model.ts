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
  highlight: string;
  opacity: number;
}

export interface CedarExtras {
  roots: CedarRoot[];
  canopyLayers: CedarCanopyLayer[];
  goldenPatches: { d: string; fill: string; opacity: number }[];
}

export interface TerrainLayer {
  id: string;
  d: string;
  fill: string;
  highlight: string;
  stroke: string;
  strokeWidth: number;
}

export interface FloraCluster {
  id: string;
  x: number;
  y: number;
  type: "lavender" | "daisy" | "rosemary" | "thyme" | "olive_shrub" | "rose" | "floral_wreath" | "lily";
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
  lotus: Array<{ x: number; y: number; scale: number; color: string }>;
  stones: Array<{ x: number; y: number; scale: number }>;
  koi: Array<{ x: number; y: number; length: number; angle: number; color: string; delay: number }>;
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
  soilPath: string;
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

function soilPath(traits: DnaTraits): string {
  const rng = createPrng(`${traits.dna}:soil`);
  const cx = 360 + (rng() - 0.5) * 40;
  const baseY = 464;
  const cp1x = cx - 70 + rng() * 40;
  const cp1y = baseY - 120 - rng() * 40;
  const cp2x = cx + 60 + rng() * 40;
  const cp2y = baseY - 200 - rng() * 60;
  const endX = cx + (rng() - 0.5) * 30;
  const endY = baseY - 260 - rng() * 40;
  return `M ${cx} ${baseY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
}

function buildIsometricTerrain(traits: DnaTraits): TerrainLayer[] {
  const rng = createPrng(`${traits.dna}:iso-terrain`);
  const layers: TerrainLayer[] = [];
  const baseY = 448;
  const layerHeight = 34;
  const totalLayers = 9;

  const grassGreens = [
    "#1e5c1a", "#246e1f", "#2a8024", "#32922a", "#3ca430",
    "#48b636", "#54c83c", "#60da42", "#6cec48"
  ];

  for (let i = 0; i < totalLayers; i++) {
    const progress = i / (totalLayers - 1);
    const noise = noise1D(i * 0.7, `${traits.dna}:terrain-layer-${i}`) * 10;
    const y = baseY - i * layerHeight + noise;
    const halfWidth = 220 - progress * 80 + noise1D(i * 0.3, `${traits.dna}:terrain-w-${i}`) * 10;
    const bevel = 5 + progress * 6;
    const leftX = 360 - halfWidth;
    const rightX = 360 + halfWidth;
    const shade = Math.round(160 + progress * 70);
    const fill = grassGreens[i % grassGreens.length];
    const highlight = `rgb(${Math.min(255, shade + 50)}, ${Math.min(255, shade + 40)}, ${Math.min(255, shade + 30)})`;
    const stroke = `rgb(${Math.max(20, shade - 25)}, ${Math.max(25, shade - 20)}, ${Math.max(20, shade - 28)})`;

    layers.push({
      id: `terrain-${i}`,
      d: `M ${leftX.toFixed(1)} ${y.toFixed(1)} L ${rightX.toFixed(1)} ${y.toFixed(1)} L ${(rightX + bevel).toFixed(1)} ${(y + layerHeight).toFixed(1)} L ${(leftX - bevel).toFixed(1)} ${(y + layerHeight).toFixed(1)} Z`,
      fill,
      highlight,
      stroke,
      strokeWidth: 0.5,
    });
  }
  return layers;
}

function buildIsometricPond(traits: DnaTraits, state: GardenState): PondModel | undefined {
  const rng = createPrng(`${traits.dna}:pond`);
  const cx = 580 + rng() * 30;
  const cy = 350 + rng() * 20;
  const width = 70 + rng() * 35;
  const height = 28 + rng() * 18;

  const d = `M ${cx} ${cy - height} C ${cx + width * 0.3} ${cy - height * 1.5}, ${cx + width} ${cy - height * 0.4}, ${cx + width * 0.7} ${cy} C ${cx + width * 0.4} ${cy + height * 1.2}, ${cx - width * 0.2} ${cy + height * 1.4}, ${cx - width * 0.3} ${cy + height * 0.4} C ${cx - width} ${cy + height * 0.1}, ${cx - width * 0.6} ${cy - height}, ${cx} ${cy - height} Z`;
  
  const deepD = `M ${cx + 6} ${cy - 6} C ${cx + width * 0.2} ${cy - height * 0.9}, ${cx + width * 0.5} ${cy - height * 0.2}, ${cx + width * 0.3} ${cy + 3} C ${cx + width * 0.1} ${cy + height * 0.7}, ${cx - width * 0.1} ${cy + height * 0.8}, ${cx - width * 0.1} ${cy + 3} C ${cx - width * 0.3} ${cy - height * 0.3}, ${cx + width * 0.1} ${cy - height * 0.5}, ${cx + 6} ${cy - 6} Z`;

  const rippleCount = 4 + Math.floor(state.waterLevel / 20);
  const ripples = Array.from({ length: rippleCount }, (_, i) => ({
    x: cx + (rng() - 0.5) * width * 0.5,
    y: cy + (rng() - 0.5) * height * 0.4,
    rx: 8 + i * 7,
    ry: 4 + i * 3,
    delay: rng() * 3,
  }));

  const lilyCount = 1 + Math.floor(state.waterLevel / 30);
  const lilies = Array.from({ length: lilyCount }, () => ({
    x: cx + (rng() - 0.5) * width * 0.55,
    y: cy + (rng() - 0.5) * height * 0.35,
    scale: 0.5 + rng() * 0.5,
  }));

  const lotusCount = Math.min(3, 1 + Math.floor(state.totalWaterings / 8));
  const lotus = Array.from({ length: lotusCount }, () => ({
    x: cx + (rng() - 0.5) * width * 4,
    y: cy + (rng() - 0.5) * height * 0.3,
    scale: 0.6 + rng() * 0.7,
    color: rng() > 0.5 ? "#f5c6d6" : "#f0e68c",
  }));

  const stones = Array.from({ length: 2 + Math.floor(rng() * 3) }, () => ({
    x: cx + (rng() - 0.5) * width * 0.7,
    y: cy + (rng() - 0.5) * height * 0.5,
    scale: 0.4 + rng() * 0.5,
  }));

  const koiColors = ["#e8742a", "#f5b842", "#f0f0f0", "#d94e3a"];
  const koi = Array.from({ length: 2 + Math.floor(rng() * 2) }, (_, i) => {
    const kx = cx - width * 0.3 + rng() * width * 0.6;
    const ky = cy - height * 0.2 + rng() * height * 0.4;
    const angle = rng() * Math.PI * 2;
    const len = 10 + rng() * 16;
    return {
      x: kx,
      y: ky,
      length: len,
      angle: angle,
      color: koiColors[Math.floor(rng() * koiColors.length)],
      delay: rng() * 4 + i * 1.5,
    };
  });

  return {
    d,
    deepD,
    fill: "url(#water-iso)",
    stroke: "#3a7a8a",
    ripples,
    lilies,
    lotus,
    stones,
    koi,
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
  const trunkHeight = 60 + Math.min(50, historyTotal * 0.4);
  const canopyScale = 1 + Math.min(0.6, historyTotal / 100);

  const trunkBranches: TreeBranch[] = [
    { d: `M ${x - 10} ${y} L ${x - 8} ${y - trunkHeight}`, width: 10, depth: 0, x1: x - 8, y1: y - trunkHeight, angle: Math.PI / 2 },
    { d: `M ${x + 9} ${y} L ${x + 8} ${y - trunkHeight}`, width: 9, depth: 0, x1: x + 8, y1: y - trunkHeight, angle: Math.PI / 2 },
  ];

  const barkTex = Array.from({ length: 14 }, (_, i) => {
    const t = i / 14;
    const bx = x - 8 + rng() * 16;
    const by = y - trunkHeight * t * 0.6;
    return {
      d: `M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${(bx + (rng() - 0.5) * 7).toFixed(1)} ${(by + 7).toFixed(1)} ${(bx + (rng() - 0.5) * 5).toFixed(1)} ${(by + 14).toFixed(1)}`,
      width: 0.9 + rng() * 0.6,
      depth: Math.floor(t * 4),
      x1: bx,
      y1: by,
      angle: Math.PI / 2 + (rng() - 0.5) * 0.4,
    };
  });

  const roots: CedarRoot[] = Array.from({ length: 8 + Math.floor(rng() * 5) }, (_, i) => {
    const baseAngle = -Math.PI / 2 + (i - 4) * 0.55;
    const angle = baseAngle + (rng() - 0.5) * 0.4;
    const len = 30 + rng() * 50;
    const ex = x + Math.cos(angle) * len;
    const ey = y + Math.sin(angle) * len * 0.4 + 10;
    return {
      d: `M ${x} ${y} Q ${(x + Math.cos(angle) * len * 0.5).toFixed(1)} ${(y + Math.sin(angle) * len * 0.2 + 5).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
      stroke: rng() > 0.5 ? "#5a4a32" : "#6b5a42",
      strokeWidth: 1.5 + rng() * 2.5,
    };
  });

  const canopyBaseY = y - trunkHeight - 3;
  const makeCanopy = (scaleY: number, shrink: number, color: string, highlight: string, opacity: number): CedarCanopyLayer => {
    const cy = canopyBaseY - 30 * canopyScale * scaleY;
    const sx = 48 * canopyScale * shrink;
    const sy = 32 * canopyScale * shrink;
    const sx2 = 52 * canopyScale * shrink;
    const sy2 = 20 * canopyScale * shrink;
    return {
      d: `M ${x} ${(cy - 38 * canopyScale * scaleY).toFixed(1)} C ${(x - sx).toFixed(1)} ${(cy - 12 * canopyScale * scaleY).toFixed(1)}, ${(x - sx2).toFixed(1)} ${(cy + sy2).toFixed(1)}, ${(x - sx * 0.7).toFixed(1)} ${(cy + sy).toFixed(1)} C ${(x - sx * 0.3).toFixed(1)} ${(cy + sy * 1.15).toFixed(1)}, ${(x + sx * 0.3).toFixed(1)} ${(cy + sy * 1.15).toFixed(1)}, ${(x + sx * 0.7).toFixed(1)} ${(cy + sy).toFixed(1)} C ${(x + sx2).toFixed(1)} ${(cy + sy2).toFixed(1)}, ${(x + sx).toFixed(1)} ${(cy - 12 * canopyScale * scaleY).toFixed(1)}, ${x} ${(cy - 38 * canopyScale * scaleY).toFixed(1)} Z`,
      fill: color,
      highlight,
      opacity,
    };
  };

  const canopyLayers: CedarCanopyLayer[] = [
    makeCanopy(1.0, 1.0, "#355e28", "#4a8a3a", 0.92),
    makeCanopy(0.92, 0.92, "#3d7230", "#52914a", 0.88),
    makeCanopy(0.84, 0.84, "#468638", "#60a052", 0.85),
    makeCanopy(0.76, 0.76, "#509a40", "#72b864", 0.81),
    makeCanopy(0.68, 0.68, "#5aad48", "#88cc78", 0.77),
  ];

  const goldenPatches = Array.from({ length: 3 + Math.floor(rng() * 3) }, (_, i) => {
    const px = x + (rng() - 0.5) * 30 * canopyScale;
    const py = canopyBaseY - 20 * canopyScale - rng() * 30 * canopyScale;
    const rx = 6 + rng() * 8;
    const ry = 4 + rng() * 5;
    return {
      d: `M ${px} ${py} C ${px + rx} ${py - ry}, ${px + rx * 1.5} ${py + ry}, ${px} ${py + ry * 1.2} C ${px - rx} ${py - ry * 0.5}, ${px - rx * 1.2} ${py + ry * 0.8}, ${px} ${py} Z`,
      fill: "#f5e6b8",
      opacity: 0.25 + rng() * 0.2,
    };
  });

  return {
    species: traits.treeSpecies,
    x,
    y,
    trunkHeight,
    canopyScale,
    branches: trunkBranches.concat(barkTex),
    visibleDepth: 5,
    cedarExtras: { roots, canopyLayers, goldenPatches },
  };
}

function buildFloraClusters(traits: DnaTraits, state: GardenState, exclude?: Set<string>): FloraCluster[] {
  const rng = createPrng(`${traits.dna}:flora`);
  const clusters: FloraCluster[] = [];

  const baseTypes: FloraCluster["type"][] = ["lavender", "daisy", "rosemary", "thyme", "olive_shrub"];
  const devotionTypes: FloraCluster["type"][] = ["rose", "floral_wreath", "lily"];

  const roseBudget = Math.min(10, Math.floor(state.totalRosaries / 2));
  const wreathBudget = Math.min(8, Math.floor(state.totalCoronillas / 3));
  const lilyBudget = Math.min(6, Math.floor(state.totalNovenas / 2));
  const totalBudget = Math.min(26, roseBudget + wreathBudget + lilyBudget + 6 + Math.floor(state.totalSeeds / 5) + Math.floor(state.totalSilenceMinutes / 10));

  const typeBag: FloraCluster["type"][] = [];
  for (let r = 0; r < roseBudget; r++) typeBag.push("rose");
  for (let r = 0; r < wreathBudget; r++) typeBag.push("floral_wreath");
  for (let r = 0; r < lilyBudget; r++) typeBag.push("lily");
  while (typeBag.length < totalBudget) {
    typeBag.push(baseTypes[Math.floor(rng() * baseTypes.length)]);
  }
  typeBag.sort(() => rng() - 0.5);

  for (let i = 0; i < totalBudget; i++) {
    const type = typeBag[i] || baseTypes[Math.floor(rng() * baseTypes.length)];
    const cx = 45 + rng() * 630;
    const cy = 325 + rng() * 95;

    if (exclude && exclude.has(`${type}-${cx.toFixed(0)}-${cy.toFixed(0)}`)) continue;

    clusters.push({
      id: `flora-${i}`,
      x: cx,
      y: cy,
      type,
      scale: 0.6 + rng() * 0.7,
      tone: Math.floor(rng() * 4),
      delay: rng() * 5,
      rotation: rng() * 360,
    });
  }
  return clusters;
}

function buildShadows(elements: Array<{ x: number; y: number; w?: number; h?: number }>): ShadowDef[] {
  return elements.map((el) => ({
    x: el.x + (el.w ? 5 : 4),
    y: el.y + (el.h ? 4 : 3),
    rx: el.w ? el.w * 0.75 : 14,
    ry: el.h ? el.h * 0.4 : 6,
    opacity: 0.22,
  }));
}

export function generateGardenModel(traits: DnaTraits, state: GardenState): GardenModel {
  return buildWildGarden(traits, state);
}

export function buildWildGarden(traits: DnaTraits, state: GardenState): GardenModel {
  const levelConfig = resolveLevel(state.level);

  const tree = traits.treeSpecies === "cedro" ? buildCedarTree(traits, state) : buildCentralTree(traits, state);

  const lightCount = Math.min(14, Math.floor(state.totalCoronillas * 1.2) + Math.floor(state.streak / 8)) + levelConfig.lightBonus;
  const flowerCount =
    Math.min(24, Math.floor(state.totalCoronillas * 1.5)) +
    Math.min(10, Math.floor(state.totalSilenceMinutes / 15)) +
    levelConfig.flowerBonus;

  const stoneCount = Math.min(14, 3 + state.totalNovenas * 2 + traits.rockPattern) + levelConfig.rockBonus;

  const smallVegCount = Math.min(
    34,
    6 + Math.floor(state.totalSeeds * 0.7) + Math.floor(state.totalSilenceMinutes / 5) + levelConfig.plantBonus,
  );

  const terrainLayers = buildIsometricTerrain(traits);
  const pond = buildIsometricPond(traits, state);
  const floraClusters = buildFloraClusters(traits, state);
  const shadows = buildShadows(floraClusters);

  return {
    terrain: `M 0 460 L 0 314 C 180 286 520 296 720 266 L 720 460 Z`,
    terrainLayers,
    path: pathForShape(traits),
    pathWidth: 32 + state.totalNovenas * 1.8,
    soilPath: soilPath(traits),
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
      clampCount(smallVegCount, 30),
      { x0: 35, x1: 685, y0: 320, y1: 434 },
    ),
    ambientFlowers: makePoints(
      createPrng(`${traits.dna}:ambient-flowers`),
      "ambient-flower",
      clampCount(flowerCount, 24),
      { x0: 55, x1: 665, y0: 292, y1: 405 },
    ),
    lights: makePoints(
      createPrng(`${traits.dna}:lights`),
      "light",
      clampCount(lightCount, 16),
      { x0: 100, x1: 620, y0: 280, y1: 380 },
    ),
    tree,
    butterflies: makePoints(createPrng(`${traits.dna}:butterflies`), "butterfly", Math.min(7, Math.floor(state.waterLevel / 15)) + levelConfig.butterflyBonus, {
      x0: 80,
      x1: 640,
      y0: 140,
      y1: 285,
    }),
    particles: makePoints(createPrng(`${traits.dna}:particles`), "particle", 20 + levelConfig.particleBonus, {
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
          width: 35 + lightRng() * 90,
          opacity: 0.04 + lightRng() * 0.07,
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
