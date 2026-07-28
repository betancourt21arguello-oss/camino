import { createPrng, hashSeed } from "../garden/prng";
import type { DnaTraits, GardenSeason } from "../garden/types";
import type {
  CommunityParticle,
  CommunitySignaturePayload,
  CompositionKind,
  SignatureShape,
} from "./types";

const COMPOSITIONS: CompositionKind[] = [
  "manto",
  "rosa-mistica",
  "rosario",
  "paloma",
  "estrella-mar",
  "monograma",
];

const SEASON_COMPOSITION: Record<GardenSeason, CompositionKind[]> = {
  advent: ["estrella-mar", "manto", "rosario"],
  christmas: ["rosa-mistica", "manto", "estrella-mar"],
  lent: ["rosario", "monograma", "manto"],
  easter: ["rosa-mistica", "paloma", "manto"],
  pentecost: ["paloma", "estrella-mar", "rosa-mistica"],
  ordinary: ["rosa-mistica", "manto", "monograma", "rosario", "estrella-mar", "paloma"],
};

const SHAPES: SignatureShape[] = ["leaf", "flower", "branch", "star", "arc", "petal"];

const PALETTE_INDEX: Record<string, number> = {
  dawn: 0,
  verdant: 1,
  amber: 2,
  azure: 3,
  rose: 4,
  dusk: 5,
};

export function signaturePayloadFromDna(
  traits: DnaTraits,
  sessionId: string,
  memberId: string,
  growthFactor = 1,
): CommunitySignaturePayload {
  const rng = createPrng(`${traits.signatureSeed}:shape`);
  return {
    sessionId,
    memberId,
    signatureSeed: traits.signatureSeed.slice(0, 16),
    primaryShape: SHAPES[Math.floor(rng() * SHAPES.length)],
    palette: PALETTE_INDEX[traits.paletteVariant] ?? 0,
    countryColor: Math.floor((traits.riverAngle / 360) * 12),
    growthFactor: Math.max(0.4, Math.min(1.6, growthFactor)),
  };
}

export function chooseComposition(
  communitySeed: string,
  season: GardenSeason = "ordinary",
): CompositionKind {
  const pool = SEASON_COMPOSITION[season] ?? COMPOSITIONS;
  const idx = hashSeed(`${communitySeed}:composition`) % pool.length;
  return pool[idx];
}

export function communitySeedFromSession(
  sessionId: string,
  signatures: CommunitySignaturePayload[],
): string {
  const material = `${sessionId}:${signatures
    .map((s) => s.signatureSeed)
    .sort()
    .join(":")}`;
  return hashSeed(material).toString(16);
}

function sampleOnEllipse(
  rng: () => number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
  layer: number,
  shape: SignatureShape,
  hueBase: number,
): CommunityParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng());
    return {
      id: `p-${layer}-${i}-${shape}`,
      x: cx + Math.cos(a) * rx * r,
      y: cy + Math.sin(a) * ry * r,
      shape,
      hue: hueBase + Math.floor(rng() * 28),
      scale: 0.55 + rng() * 0.9,
      delay: rng() * 2.5,
      layer,
    };
  });
}

function sampleOnPath(
  rng: () => number,
  points: { x: number; y: number }[],
  count: number,
  layer: number,
  shape: SignatureShape,
  hueBase: number,
): CommunityParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const t = rng() * (points.length - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(points.length - 1, i0 + 1);
    const f = t - i0;
    const x = points[i0].x * (1 - f) + points[i1].x * f + (rng() - 0.5) * 10;
    const y = points[i0].y * (1 - f) + points[i1].y * f + (rng() - 0.5) * 10;
    return {
      id: `p-${layer}-${i}-${shape}`,
      x,
      y,
      shape,
      hue: hueBase + Math.floor(rng() * 24),
      scale: 0.5 + rng() * 0.85,
      delay: rng() * 2.2,
      layer,
    };
  });
}

/** Siluetas sugeridas — nunca perfectas, siempre contemplativas. */
function silhouetteTargets(kind: CompositionKind): {
  layers: {
    count: number;
    shapeBias: SignatureShape;
    sample: (rng: () => number, n: number, layer: number, shape: SignatureShape, hue: number) => CommunityParticle[];
  }[];
} {
  switch (kind) {
    case "manto":
      return {
        layers: [
          {
            count: 28,
            shapeBias: "leaf",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnEllipse(rng, 180, 145, 145, 70, n, layer, shape, hue),
          },
          {
            count: 36,
            shapeBias: "leaf",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnEllipse(rng, 180, 175, 165, 88, n, layer, shape, hue),
          },
          {
            count: 42,
            shapeBias: "petal",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnEllipse(rng, 180, 205, 175, 95, n, layer, shape, hue),
          },
          {
            count: 48,
            shapeBias: "flower",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnEllipse(rng, 180, 235, 150, 70, n, layer, shape, hue),
          },
        ],
      };
    case "rosa-mistica":
      return {
        layers: [0, 1, 2, 3].map((layer) => ({
          count: 22 + layer * 14,
          shapeBias: (["petal", "flower", "leaf", "star"] as SignatureShape[])[layer],
          sample: (rng: () => number, n: number, l: number, shape: SignatureShape, hue: number) =>
            sampleOnEllipse(rng, 180, 185, 38 + layer * 28, 34 + layer * 24, n, l, shape, hue),
        })),
      };
    case "rosario": {
      const beads = Array.from({ length: 50 }, (_, i) => {
        const a = (i / 50) * Math.PI * 2 - Math.PI / 2;
        return { x: 180 + Math.cos(a) * 110, y: 185 + Math.sin(a) * 125 };
      });
      return {
        layers: [
          {
            count: 40,
            shapeBias: "star",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnPath(rng, beads, n, layer, shape, hue),
          },
          {
            count: 36,
            shapeBias: "flower",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnPath(rng, beads, n, layer, shape, hue),
          },
          {
            count: 32,
            shapeBias: "leaf",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnEllipse(rng, 180, 185, 70, 80, n, layer, shape, hue),
          },
          {
            count: 28,
            shapeBias: "arc",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnPath(rng, beads, n, layer, shape, hue),
          },
        ],
      };
    }
    case "paloma": {
      const body = Array.from({ length: 40 }, (_, i) => {
        const t = i / 39;
        return { x: 110 + t * 140, y: 190 + Math.sin(t * Math.PI) * 18 };
      });
      const wing = Array.from({ length: 40 }, (_, i) => {
        const t = i / 39;
        return { x: 150 + t * 90, y: 160 - Math.sin(t * Math.PI) * 55 };
      });
      return {
        layers: [
          {
            count: 34,
            shapeBias: "arc",
            sample: (rng, n, layer, shape, hue) => sampleOnPath(rng, body, n, layer, shape, hue),
          },
          {
            count: 38,
            shapeBias: "leaf",
            sample: (rng, n, layer, shape, hue) => sampleOnPath(rng, wing, n, layer, shape, hue),
          },
          {
            count: 30,
            shapeBias: "petal",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnEllipse(rng, 180, 185, 90, 55, n, layer, shape, hue),
          },
          {
            count: 26,
            shapeBias: "star",
            sample: (rng, n, layer, shape, hue) =>
              sampleOnEllipse(rng, 250, 150, 55, 40, n, layer, shape, hue),
          },
        ],
      };
    }
    case "estrella-mar":
      return {
        layers: [0, 1, 2, 3].map((layer) => ({
          count: 24 + layer * 12,
          shapeBias: (["star", "petal", "flower", "leaf"] as SignatureShape[])[layer],
          sample: (rng: () => number, n: number, l: number, shape: SignatureShape, hue: number) => {
            const points = Array.from({ length: 5 }, (_, p) => {
              const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
              const r = 40 + layer * 28;
              return { x: 180 + Math.cos(a) * r, y: 185 + Math.sin(a) * r };
            });
            // connect star tips
            const path: { x: number; y: number }[] = [];
            for (let i = 0; i < 5; i++) {
              path.push(points[i], points[(i + 2) % 5]);
            }
            return sampleOnPath(rng, path, n, l, shape, hue);
          },
        })),
      };
    case "monograma": {
      // Suggested M with a subtle cross above
      const left = Array.from({ length: 20 }, (_, i) => ({ x: 120, y: 120 + i * 6 }));
      const midL = Array.from({ length: 18 }, (_, i) => ({
        x: 120 + i * 3.4,
        y: 120 + i * 4.2,
      }));
      const midR = Array.from({ length: 18 }, (_, i) => ({
        x: 180 + i * 3.4,
        y: 195 - i * 4.2,
      }));
      const right = Array.from({ length: 20 }, (_, i) => ({ x: 240, y: 120 + i * 6 }));
      const crossV = Array.from({ length: 12 }, (_, i) => ({ x: 180, y: 78 + i * 4 }));
      const crossH = Array.from({ length: 12 }, (_, i) => ({ x: 158 + i * 4, y: 96 }));
      const paths = [left, midL, midR, right, crossV, crossH];
      return {
        layers: paths.map((path, layer) => ({
          count: 22 + (layer % 3) * 8,
          shapeBias: (["branch", "leaf", "petal", "star", "arc", "flower"] as SignatureShape[])[
            layer % 6
          ],
          sample: (rng: () => number, n: number, l: number, shape: SignatureShape, hue: number) =>
            sampleOnPath(rng, path, n, l, shape, hue),
        })),
      };
    }
  }
}

/**
 * Genera el universo COMPLETO de partículas de la obra (determinista).
 * El crecimiento del Rosario no crea geometría nueva: solo REVELA un
 * prefijo mayor de esta lista a medida que llegan 🙏.
 */
export function buildCommunityParticles(
  communitySeed: string,
  composition: CompositionKind,
  signatures: CommunitySignaturePayload[],
): CommunityParticle[] {
  const rng = createPrng(`${communitySeed}:${composition}`);
  const targets = silhouetteTargets(composition);
  const all: CommunityParticle[] = [];

  targets.layers.forEach((layerDef, layer) => {
    // Prefer shapes contributed by the actual community when available.
    const communityShapes = signatures.map((s) => s.primaryShape);
    const shape =
      communityShapes.length > 0
        ? communityShapes[Math.floor(rng() * communityShapes.length)]
        : layerDef.shapeBias;
    const hueBase =
      signatures.length > 0
        ? 40 + signatures[Math.floor(rng() * signatures.length)].palette * 18
        : 55 + layer * 12;
    all.push(...layerDef.sample(rng, layerDef.count, layer, shape, hueBase));
  });

  return all;
}

export function compositionTitle(
  kind: CompositionKind,
  intentionTheme: string,
  season: GardenSeason,
): string {
  const base: Record<CompositionKind, string[]> = {
    manto: ["Manto de Consolación", "Manto de Esperanza", "Manto de Ternura"],
    "rosa-mistica": ["Rosa de la Esperanza", "Rosa Mística", "Rosa de la Paz"],
    rosario: ["Rosario de Luz", "Cuentas de Misericordia", "Rosario Vivo"],
    paloma: ["Paloma de Fuego", "Aliento del Espíritu", "Paloma de la Paz"],
    "estrella-mar": ["Estrella del Mar", "Luz de los Caminos", "Estrella de la Noche"],
    monograma: ["Monograma de María", "Inicial de la Gracia", "Sello de la Madre"],
  };
  const pool = base[kind];
  const idx = hashSeed(`${kind}:${intentionTheme}:${season}`) % pool.length;
  return pool[idx];
}

export const COMPOSITION_LABELS: Record<CompositionKind, string> = {
  manto: "El Manto",
  "rosa-mistica": "Rosa Mística",
  rosario: "El Rosario",
  paloma: "La Paloma",
  "estrella-mar": "Estrella del Mar",
  monograma: "Monograma Mariano",
};
