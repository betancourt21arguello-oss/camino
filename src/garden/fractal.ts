/* ============================================================================
 * src/garden/fractal.ts — Árboles procedimentales por recursividad
 * Un tronco se divide en ramas, y cada rama en ramas menores.
 * Cada árbol es único: la semilla PRNG + los parámetros derivados del usuario
 * producen una topología irrepetible pero perfectamente reproducible.
 * ==========================================================================*/
import { createPrng, rnd, clamp, type Prng } from "./prng";

/** Una rama del árbol fractal. */
export interface Branch {
  /** Profundidad de recursión: 0 = tronco */
  depth: number;
  x1: number; y1: number;
  x2: number; y2: number;
  /** Punto de control para la curvatura de Bézier */
  cx: number; cy: number;
  width: number;
  length: number;
  angle: number;
  /** Retardo de la brisa: las puntas se mueven después que la base */
  windDelay: number;
  /** Amplitud del balanceo: crece hacia las puntas */
  windAmp: number;
  /** Path SVG listo para renderizar */
  d: string;
}

/** Hoja/racimo terminal en la punta de una rama. */
export interface Leaf {
  x: number; y: number;
  rx: number; ry: number;
  angle: number;
  hue: number;
  sat: number;
  lig: number;
  windDelay: number;
  scale: number;
}

/** Fruto o flor sobre el árbol (rosas del rosario, olivas, etc.). */
export interface TreeFruit {
  x: number; y: number;
  r: number;
  hue: number;
  delay: number;
}

export interface FractalTree {
  branches: Branch[];
  leaves: Leaf[];
  fruits: TreeFruit[];
  roots: Branch[];
  /** Punto más alto de la copa (para posicionar aves) */
  crownX: number;
  crownY: number;
  crownR: number;
  totalHeight: number;
}

export interface FractalParams {
  /** Semilla determinista */
  seed: string;
  /** Base del tronco */
  originX: number;
  originY: number;
  /** Altura del tronco antes de la primera bifurcación */
  trunkLength: number;
  /** Grosor inicial */
  trunkWidth: number;
  /** Niveles de recursión (3 = joven, 6 = frondoso) */
  maxDepth: number;
  /** Divisiones por nodo (2 o 3) */
  branchesPerNode: number;
  /** Ángulo de apertura entre ramas hermanas, en grados */
  spreadAngle: number;
  /** Factor de reducción de longitud por nivel (0.62 – 0.78) */
  lengthDecay: number;
  /** Factor de reducción de grosor por nivel */
  widthDecay: number;
  /** Curvatura del tronco en grados (deriva del día de registro) */
  trunkCurve: number;
  /** Matiz base del follaje */
  leafHue: number;
  /** Densidad de hojas (0–1) */
  foliage: number;
  /** Frutos/flores en la copa */
  fruitCount: number;
  fruitHue: number;
  /** Irregularidad orgánica (0 = simétrico, 1 = muy caótico) */
  chaos: number;
}

const DEG = Math.PI / 180;

/* ── Recursión principal ────────────────────────────────────────────────── */
function grow(
  p: Prng,
  out: { branches: Branch[]; leaves: Leaf[] },
  params: FractalParams,
  x: number, y: number,
  angle: number,      // grados; -90 = hacia arriba
  length: number,
  width: number,
  depth: number,
  windAcc: number,
): void {
  if (depth > params.maxDepth || length < 2.2 || width < 0.32) {
    // Punta: se corona con follaje
    spawnLeaves(p, out.leaves, params, x, y, angle, depth, windAcc);
    return;
  }

  const rad = angle * DEG;
  const x2 = x + Math.cos(rad) * length;
  const y2 = y + Math.sin(rad) * length;

  /* Curvatura: el tronco se arquea según `trunkCurve`; las ramas, algo menos */
  const curveStrength = depth === 0
    ? params.trunkCurve
    : params.trunkCurve * 0.32 + rnd(p, -8, 8) * params.chaos;
  const perp = rad + Math.PI / 2;
  const bow = (length * 0.22) * (curveStrength / 30);
  const cx = (x + x2) / 2 + Math.cos(perp) * bow;
  const cy = (y + y2) / 2 + Math.sin(perp) * bow;

  const windAmp = clamp(windAcc + depth * 0.55, 0, 6);

  out.branches.push({
    depth, x1: x, y1: y, x2, y2, cx, cy,
    width, length, angle,
    windDelay: depth * 0.13 + rnd(p, 0, 0.22),
    windAmp,
    d: `M ${x.toFixed(2)} ${y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`,
  });

  /* Hojas laterales en ramas intermedias (aporta volumen sin saturar) */
  if (depth >= params.maxDepth - 2 && p() < params.foliage * 0.55) {
    spawnLeaves(p, out.leaves, params, x2, y2, angle, depth, windAcc, 1);
  }

  /* ── Bifurcación recursiva ── */
  const n = depth === 0 ? params.branchesPerNode : (p() < 0.18 ? 3 : params.branchesPerNode);
  const spread = params.spreadAngle * (1 + rnd(p, -0.22, 0.22) * params.chaos);

  for (let i = 0; i < n; i++) {
    // Distribución simétrica alrededor del eje, con ruido orgánico
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const childAngle =
      angle + t * spread + rnd(p, -14, 14) * params.chaos;

    const childLength = length * params.lengthDecay * (1 + rnd(p, -0.16, 0.16) * params.chaos);
    const childWidth = width * params.widthDecay * (1 + rnd(p, -0.1, 0.1) * params.chaos);

    grow(p, out, params, x2, y2, childAngle, childLength, childWidth, depth + 1, windAmp);
  }
}

/* ── Follaje terminal ───────────────────────────────────────────────────── */
function spawnLeaves(
  p: Prng,
  leaves: Leaf[],
  params: FractalParams,
  x: number, y: number,
  angle: number,
  depth: number,
  windAcc: number,
  forceCount?: number,
): void {
  const count = forceCount ?? Math.max(1, Math.round(params.foliage * 3));
  for (let i = 0; i < count; i++) {
    const a = angle + rnd(p, -46, 46);
    const dist = rnd(p, 0, 5.5);
    leaves.push({
      x: x + Math.cos(a * DEG) * dist,
      y: y + Math.sin(a * DEG) * dist,
      rx: rnd(p, 3.4, 6.6),
      ry: rnd(p, 2.1, 3.8),
      angle: a + 90,
      hue: params.leafHue + rnd(p, -11, 11),
      sat: rnd(p, 30, 52),
      lig: rnd(p, 26, 46),
      windDelay: depth * 0.12 + rnd(p, 0, 0.55),
      scale: rnd(p, 0.82, 1.22),
    });
  }
  void windAcc;
}

/* ── Raíces visibles (recursión superficial) ────────────────────────────── */
function growRoots(p: Prng, params: FractalParams): Branch[] {
  const roots: Branch[] = [];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const dir = i < n / 2 ? -1 : 1;
    const spreadT = (i % (n / 2)) / Math.max(1, n / 2 - 1);
    const angle = dir * (12 + spreadT * 26);        // casi horizontal
    const len = params.trunkWidth * rnd(p, 1.5, 2.8);
    const x2 = params.originX + dir * len * 1.7;
    const y2 = params.originY + Math.abs(Math.sin(angle * DEG)) * len * 0.4 + 2.5;
    const cx = (params.originX + x2) / 2;
    const cy = params.originY + 1.5;
    roots.push({
      depth: -1,
      x1: params.originX, y1: params.originY, x2, y2, cx, cy,
      width: params.trunkWidth * rnd(p, 0.2, 0.34),
      length: len, angle,
      windDelay: 0, windAmp: 0,
      d: `M ${params.originX} ${params.originY} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    });
  }
  return roots;
}

/* ── Punto de entrada ───────────────────────────────────────────────────── */
export function generateFractalTree(params: FractalParams): FractalTree {
  const p = createPrng(params.seed + "::fractal");
  const out = { branches: [] as Branch[], leaves: [] as Leaf[] };

  grow(
    p, out, params,
    params.originX, params.originY,
    -90 + params.trunkCurve * 0.18,   // inclinación inicial del tronco
    params.trunkLength,
    params.trunkWidth,
    0, 0,
  );

  /* Copa: envolvente de las hojas */
  let minY = params.originY, sumX = 0, maxR = 0;
  for (const l of out.leaves) {
    if (l.y < minY) minY = l.y;
    sumX += l.x;
  }
  const crownX = out.leaves.length ? sumX / out.leaves.length : params.originX;
  const crownY = minY;
  for (const l of out.leaves) {
    const d = Math.hypot(l.x - crownX, (l.y - crownY) * 0.8);
    if (d > maxR) maxR = d;
  }

  /* Frutos / flores devocionales sobre la copa */
  const fruits: TreeFruit[] = [];
  if (params.fruitCount > 0 && out.leaves.length > 0) {
    const step = Math.max(1, Math.floor(out.leaves.length / params.fruitCount));
    for (let i = 0, k = 0; i < out.leaves.length && k < params.fruitCount; i += step, k++) {
      const l = out.leaves[i];
      fruits.push({
        x: l.x + rnd(p, -2.5, 2.5),
        y: l.y + rnd(p, -2.5, 2.5),
        r: rnd(p, 2.2, 3.6),
        hue: params.fruitHue + rnd(p, -8, 8),
        delay: k * 0.14,
      });
    }
  }

  return {
    branches: out.branches,
    leaves: out.leaves,
    fruits,
    roots: growRoots(p, params),
    crownX,
    crownY,
    crownR: Math.max(24, maxR),
    totalHeight: params.originY - crownY,
  };
}
