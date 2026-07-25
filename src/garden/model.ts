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
}

export interface GardenModel {
  terrain: string;
  path: string;
  pathWidth: number;
  river: { d: string; visible: boolean };
  rocks: GardenPoint[];
  ambientPlants: GardenPoint[];
  ambientFlowers: GardenPoint[];
  lights: GardenPoint[];
  tree: TreeModel;
  butterflies: GardenPoint[];
  particles: GardenPoint[];
  lightRays: { x: number; width: number; opacity: number }[];
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

export function generateGardenModel(traits: DnaTraits, state: GardenState): GardenModel {
  return buildWildGarden(traits, state);
}

export function buildWildGarden(traits: DnaTraits, state: GardenState): GardenModel {
  const levelConfig = resolveLevel(state.level);
  const riverRad = (traits.riverAngle * Math.PI) / 180;
  const riverX = 360 + Math.cos(riverRad) * 190;
  const riverY = 350 + Math.sin(riverRad) * 40;

  const tree = buildCentralTree(traits, state);

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

  return {
    terrain: terrainPath(traits),
    path: pathForShape(traits),
    pathWidth: 30 + state.totalNovenas * 1.6,
    river: {
      visible: state.waterLevel > 10 || state.totalWaterings > 0,
      d: `M ${riverX - 74} ${riverY} C ${riverX - 54} ${riverY - 26}, ${riverX + 50} ${riverY - 28}, ${riverX + 80} ${riverY - 2} C ${riverX + 52} ${riverY + 28}, ${riverX - 48} ${riverY + 30}, ${riverX - 74} ${riverY} Z`,
    },
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
