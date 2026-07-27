/* ============================================================================
 * src/garden/flowers.ts — Flores paramétricas
 * · Pétalos: <path> con curvas Bézier → formas orgánicas, no círculos.
 * · Disposición: rotación radial en <g>, con desfase áureo.
 * · Corazón: semillas colocadas con la espiral de Fibonacci (φ ≈ 137.507°).
 * ==========================================================================*/
import { createPrng, rnd, clamp, type Prng } from "./prng";

/** Ángulo áureo — la naturaleza empaqueta semillas exactamente así. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.39996 rad ≈ 137.507°
export const PHI = (1 + Math.sqrt(5)) / 2;

export type PetalShape = "rounded" | "pointed" | "heart" | "ray" | "cup" | "spiral";
export type FlowerSpecies = "rose" | "sunflower" | "lily" | "daisy" | "iris" | "marigold";

export interface Seed {
  x: number; y: number; r: number;
  /** 0 (centro) … 1 (borde) — para degradar el color */
  t: number;
}

export interface Petal {
  /** Path SVG en coordenadas locales, con el origen en el centro de la flor */
  d: string;
  /** Rotación en grados */
  rotate: number;
  hue: number;
  sat: number;
  lig: number;
  /** Capa: 0 = exterior … n = interior */
  layer: number;
  /** Desfase de la brisa / latido */
  delay: number;
  opacity: number;
}

export interface ParametricFlower {
  species: FlowerSpecies;
  /** Radio total aproximado */
  radius: number;
  petals: Petal[];
  seeds: Seed[];
  /** Colores del corazón */
  coreHue: number;
  coreInner: string;
  coreOuter: string;
  /** Tallo */
  stemD: string;
  stemLength: number;
  stemLean: number;
  leaves: { d: string; hue: number; delay: number }[];
  /** Latido de luz */
  pulseDur: number;
  pulseDelay: number;
}

export interface FlowerParams {
  seed: string;
  species: FlowerSpecies;
  /** Nº de pétalos de la corola principal (deriva del nombre del usuario) */
  petalCount: number;
  /** Capas concéntricas de pétalos (rosas → muchas; margaritas → 1) */
  layers: number;
  /** Matiz dominante */
  hue: number;
  /** Escala global */
  scale: number;
  /** Longitud del tallo */
  stemLength: number;
  /** Inclinación del tallo en grados */
  lean: number;
  /** Apertura: 0 = capullo cerrado · 1 = totalmente abierta */
  openness: number;
  /** Semillas del corazón (girasoles) */
  seedCount: number;
}

/* ── Generadores de pétalo (todos en coordenadas locales, apuntando arriba) ─ */
function petalPath(shape: PetalShape, len: number, wid: number, open: number): string {
  const L = len * (0.42 + open * 0.58);   // cerrado = corto
  const W = wid * (0.34 + open * 0.66);   // cerrado = estrecho

  switch (shape) {
    case "pointed":
      // Lanza: base estrecha, punta afilada
      return `M 0 0 C ${-W * 0.85} ${-L * 0.32} ${-W * 0.55} ${-L * 0.78} 0 ${-L}
              C ${W * 0.55} ${-L * 0.78} ${W * 0.85} ${-L * 0.32} 0 0 Z`;

    case "heart":
      // Corazón invertido: dos lóbulos en la punta
      return `M 0 0 C ${-W} ${-L * 0.42} ${-W * 1.05} ${-L * 0.92} ${-W * 0.34} ${-L}
              C ${-W * 0.12} ${-L * 1.05} 0 ${-L * 0.86} 0 ${-L * 0.86}
              C 0 ${-L * 0.86} ${W * 0.12} ${-L * 1.05} ${W * 0.34} ${-L}
              C ${W * 1.05} ${-L * 0.92} ${W} ${-L * 0.42} 0 0 Z`;

    case "ray":
      // Lígula del girasol: tira alargada de punta redonda
      return `M ${-W * 0.34} 0 L ${-W * 0.42} ${-L * 0.8}
              Q 0 ${-L * 1.1} ${W * 0.42} ${-L * 0.8}
              L ${W * 0.34} 0 Z`;

    case "cup":
      // Cáliz del lirio: ancho arriba, curvado hacia fuera
      return `M 0 0 C ${-W * 0.6} ${-L * 0.24} ${-W * 1.15} ${-L * 0.6} ${-W * 0.62} ${-L}
              Q 0 ${-L * 1.16} ${W * 0.62} ${-L}
              C ${W * 1.15} ${-L * 0.6} ${W * 0.6} ${-L * 0.24} 0 0 Z`;

    case "spiral":
      // Pétalo de rosa: borde enrollado
      return `M 0 0 C ${-W * 0.95} ${-L * 0.2} ${-W * 0.92} ${-L * 0.72} ${-W * 0.2} ${-L * 0.94}
              C ${W * 0.22} ${-L * 1.04} ${W * 0.86} ${-L * 0.82} ${W * 0.9} ${-L * 0.38}
              C ${W * 0.92} ${-L * 0.1} ${W * 0.4} 0 0 0 Z`;

    default: // rounded
      return `M 0 0 C ${-W} ${-L * 0.3} ${-W * 0.78} ${-L * 0.94} 0 ${-L}
              C ${W * 0.78} ${-L * 0.94} ${W} ${-L * 0.3} 0 0 Z`;
  }
}

const SPECIES_SHAPE: Record<FlowerSpecies, PetalShape> = {
  rose: "spiral",
  sunflower: "ray",
  lily: "cup",
  daisy: "rounded",
  iris: "heart",
  marigold: "pointed",
};

/* ── Corazón de Fibonacci ───────────────────────────────────────────────── */
/**
 * Distribuye `n` semillas usando el ángulo áureo.
 * r = c·√i  ·  θ = i · 137.507°  → empaquetado óptimo, idéntico al girasol real.
 */
export function fibonacciSeeds(n: number, maxRadius: number, seedRadius: number): Seed[] {
  if (n <= 0) return [];
  const c = maxRadius / Math.sqrt(n);
  const out: Seed[] = [];
  for (let i = 0; i < n; i++) {
    const r = c * Math.sqrt(i);
    const theta = i * GOLDEN_ANGLE;
    const t = clamp(r / maxRadius, 0, 1);
    out.push({
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * r,
      // Las semillas del borde son ligeramente mayores, como en la naturaleza
      r: seedRadius * (0.55 + t * 0.55),
      t,
    });
  }
  return out;
}

/* ── Tallo y hojas ──────────────────────────────────────────────────────── */
function buildStem(p: Prng, len: number, lean: number) {
  const tipX = Math.sin((lean * Math.PI) / 180) * len;
  const tipY = -len;
  const cx = tipX * 0.35 + rnd(p, -2.5, 2.5);
  const cy = -len * 0.55;
  const stemD = `M 0 0 Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;

  const leaves: ParametricFlower["leaves"] = [];
  const nLeaves = len > 20 ? 2 : 1;
  for (let i = 0; i < nLeaves; i++) {
    const t = 0.34 + i * 0.3;
    const lx = cx * 2 * t * (1 - t) + tipX * t * t;
    const ly = cy * 2 * t * (1 - t) + tipY * t * t;
    const dir = i % 2 === 0 ? -1 : 1;
    const lw = rnd(p, 4.5, 7.5);
    const ll = rnd(p, 8, 13);
    leaves.push({
      d: `M ${lx.toFixed(2)} ${ly.toFixed(2)}
          Q ${(lx + dir * lw).toFixed(2)} ${(ly - ll * 0.5).toFixed(2)} ${(lx + dir * ll).toFixed(2)} ${(ly - ll * 0.32).toFixed(2)}
          Q ${(lx + dir * lw * 0.7).toFixed(2)} ${(ly + ll * 0.14).toFixed(2)} ${lx.toFixed(2)} ${ly.toFixed(2)} Z`,
      hue: rnd(p, 108, 132),
      delay: rnd(p, 0, 1.2),
    });
  }
  return { stemD, leaves, tipX, tipY };
}

/* ── Punto de entrada ───────────────────────────────────────────────────── */
export function generateFlower(params: FlowerParams): ParametricFlower {
  const p = createPrng(params.seed + "::flower");
  const shape = SPECIES_SHAPE[params.species];
  const S = params.scale;

  const baseLen = (params.species === "sunflower" ? 13 : 11) * S;
  const baseWid = (params.species === "sunflower" ? 4.2 : 6.4) * S;

  /* ── Corola: capas concéntricas con desfase áureo ── */
  const petals: Petal[] = [];
  for (let layer = 0; layer < params.layers; layer++) {
    const k = params.layers === 1 ? 0 : layer / (params.layers - 1);
    // Las capas interiores son menores y están más cerradas
    const layerLen = baseLen * (1 - k * 0.42);
    const layerWid = baseWid * (1 - k * 0.3);
    const layerOpen = clamp(params.openness * (1 - k * 0.34), 0.05, 1);
    // Cada capa gira medio paso para tapar los huecos (filotaxis)
    const layerRotate = (360 / params.petalCount) * (layer * 0.5) + layer * 7;
    const n = Math.max(3, Math.round(params.petalCount * (1 - k * 0.22)));

    for (let i = 0; i < n; i++) {
      const jitter = rnd(p, -3.5, 3.5);
      petals.push({
        d: petalPath(shape, layerLen, layerWid, layerOpen),
        rotate: (360 / n) * i + layerRotate + jitter,
        hue: params.hue + rnd(p, -9, 9) + layer * 4,
        sat: clamp(58 + k * 16 + rnd(p, -6, 6), 30, 92),
        lig: clamp(58 + k * 14 + rnd(p, -5, 5), 34, 88),
        layer,
        delay: (i / n) * 0.9 + layer * 0.18,
        opacity: 0.9 + k * 0.1,
      });
    }
  }

  /* ── Corazón con espiral de Fibonacci ── */
  const coreR = (params.species === "sunflower" ? 6.4 : 3.1) * S;
  const seeds = params.seedCount > 0
    ? fibonacciSeeds(params.seedCount, coreR, coreR * 0.17)
    : [];

  const { stemD, leaves } = buildStem(p, params.stemLength, params.lean);

  return {
    species: params.species,
    radius: baseLen * 1.12,
    petals,
    seeds,
    coreHue: (params.hue + 40) % 360,
    coreInner: `hsl(${(params.hue + 46) % 360} 82% 68%)`,
    coreOuter: `hsl(${(params.hue + 28) % 360} 68% 42%)`,
    stemD,
    stemLength: params.stemLength,
    stemLean: params.lean,
    leaves,
    pulseDur: rnd(p, 3.2, 6.4),
    pulseDelay: rnd(p, 0, 2.6),
  };
}

/* ── Pasto y arbustos: miles de briznas finas ───────────────────────────── */
export interface GrassBlade {
  d: string;
  hue: number; sat: number; lig: number;
  width: number;
  /** Desfase y amplitud del viento */
  delay: number;
  amp: number;
}

export interface GrassTuft {
  x: number; y: number;
  blades: GrassBlade[];
}

/**
 * Genera un macizo de briznas. Cada brizna es un `path` curvado con ligerísimas
 * variaciones de ángulo, altura y verde, para dar textura orgánica.
 */
export function generateGrassTuft(
  seed: string,
  x: number, y: number,
  count: number,
  height: number,
  baseHue: number,
  vitality: number,
): GrassTuft {
  const p = createPrng(seed);
  const blades: GrassBlade[] = [];

  for (let i = 0; i < count; i++) {
    const off = rnd(p, -5.5, 5.5);
    const h = height * rnd(p, 0.55, 1.28) * (0.62 + vitality * 0.48);
    const lean = rnd(p, -6.5, 6.5);
    const bx = x + off;
    const tipX = bx + lean;
    const tipY = y - h;
    const cx = bx + lean * 0.28;
    const cy = y - h * 0.58;
    blades.push({
      d: `M ${bx.toFixed(2)} ${y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`,
      hue: baseHue + rnd(p, -13, 15),
      sat: clamp(30 + vitality * 26 + rnd(p, -8, 8), 12, 62),
      lig: clamp(26 + vitality * 14 + rnd(p, -6, 9), 16, 52),
      width: rnd(p, 0.65, 1.5),
      delay: rnd(p, 0, 2.6),
      amp: rnd(p, 1.4, 4.2),
    });
  }
  return { x, y, blades };
}

/** Arbusto: cúpula de briznas cortas y densas + bayas opcionales. */
export interface ShrubModel {
  x: number; y: number;
  blades: GrassBlade[];
  berries: { x: number; y: number; r: number; hue: number }[];
  rx: number; ry: number;
  hue: number;
}

export function generateShrub(
  seed: string,
  x: number, y: number,
  radius: number,
  baseHue: number,
  vitality: number,
  berryCount = 0,
): ShrubModel {
  const p = createPrng(seed);
  const blades: GrassBlade[] = [];
  const rx = radius, ry = radius * 0.74;
  const n = Math.round(26 + radius * 1.8);

  for (let i = 0; i < n; i++) {
    // Puntos dentro de la elipse (raíz cuadrada → distribución uniforme)
    const a = rnd(p, 0, Math.PI * 2);
    const rr = Math.sqrt(p());
    const bx = x + Math.cos(a) * rx * rr;
    const by = y - Math.abs(Math.sin(a)) * ry * rr * 0.9;
    const h = rnd(p, 3.5, 8) * (0.7 + vitality * 0.4);
    const lean = rnd(p, -3.5, 3.5);
    blades.push({
      d: `M ${bx.toFixed(2)} ${by.toFixed(2)} Q ${(bx + lean * 0.4).toFixed(2)} ${(by - h * 0.6).toFixed(2)} ${(bx + lean).toFixed(2)} ${(by - h).toFixed(2)}`,
      hue: baseHue + rnd(p, -10, 12),
      sat: clamp(28 + vitality * 24 + rnd(p, -7, 7), 12, 58),
      lig: clamp(22 + vitality * 15 + rnd(p, -5, 10), 14, 48),
      width: rnd(p, 0.8, 1.7),
      delay: rnd(p, 0, 2.2),
      amp: rnd(p, 0.8, 2.4),
    });
  }

  const berries = Array.from({ length: berryCount }, () => {
    const a = rnd(p, 0, Math.PI * 2);
    const rr = Math.sqrt(p()) * 0.82;
    return {
      x: x + Math.cos(a) * rx * rr,
      y: y - Math.abs(Math.sin(a)) * ry * rr - 2,
      r: rnd(p, 1.5, 2.6),
      hue: rnd(p, 344, 360),
    };
  });

  return { x, y, blades, berries, rx, ry, hue: baseHue };
}
