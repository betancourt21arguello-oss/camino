/* ============================================================================
 * src/garden/personal.ts — Datos del usuario → parámetros del jardín
 *
 * ┌───────────────────────────┬──────────────────┬──────────────────────────┐
 * │ Dato del usuario          │ Valor derivado   │ Elemento del jardín      │
 * ├───────────────────────────┼──────────────────┼──────────────────────────┤
 * │ Longitud del nombre       │ Número 5–13      │ Nº de pétalos            │
 * │ Primera letra del nombre  │ Hue 0–360        │ Color dominante          │
 * │ Día de registro (DD)      │ Ángulo -30…30    │ Curvatura del tronco     │
 * │ Mes de registro (MM)      │ Par / impar      │ Especie floral dominante │
 * │ Última conexión (hora)    │ Rango 0–1        │ Cielo · luciérnagas      │
 * │ Actividad / puntos        │ Escala           │ Grosor y frondosidad     │
 * └───────────────────────────┴──────────────────┴──────────────────────────┘
 * ==========================================================================*/
import { clamp } from "./prng";
import { caracasNow } from "../utils/caracas";
import type { FlowerSpecies } from "./flowers";

export interface PersonalInput {
  /** Nombre visible del usuario */
  name: string;
  /** Fecha de registro / creación de la cuenta */
  registeredAt: Date;
  /** Última conexión (por defecto: ahora) */
  lastSeenAt?: Date;
  /** Puntos acumulados de actividad espiritual */
  points: number;
}

export interface PersonalTraits {
  /** Nº de pétalos de la flor central — longitud del nombre */
  petalCount: number;
  /** Matiz dominante de toda la paleta — primera letra */
  dominantHue: number;
  /** Curvatura del tronco en grados — día de registro */
  trunkCurve: number;
  /** Especie floral dominante — mes de registro */
  flowerSpecies: FlowerSpecies;
  /** Capas de pétalos — complejidad según el mes */
  petalLayers: number;
  /** 0 = medianoche … 0.5 = mediodía … 1 = medianoche */
  dayRatio: number;
  /** true si conviene mostrar luciérnagas (noche) en lugar de abejas */
  nocturnal: boolean;
  /** Escala global de la vegetación — actividad */
  growthScale: number;
  /** Frondosidad del follaje 0–1 — actividad */
  foliage: number;
  /** Profundidad de recursión del árbol 3–6 — actividad */
  treeDepth: number;
  /** Etiqueta legible para la UI */
  summary: string;
}

/* ── Especies por mes: par → rosas · impar → girasoles, con variantes ───── */
const SPECIES_BY_MONTH: FlowerSpecies[] = [
  "sunflower", // 1  enero   (impar)
  "rose",      // 2  febrero (par)
  "iris",      // 3  marzo   (impar)
  "rose",      // 4  abril   (par)
  "sunflower", // 5  mayo    (impar) — mes de María, girasol hacia la luz
  "lily",      // 6  junio   (par)
  "sunflower", // 7  julio   (impar)
  "rose",      // 8  agosto  (par)
  "marigold",  // 9  septiembre (impar)
  "rose",      // 10 octubre (par) — mes del Rosario
  "daisy",     // 11 noviembre (impar)
  "lily",      // 12 diciembre (par)
];

const SPECIES_LABEL: Record<FlowerSpecies, string> = {
  rose: "Rosas", sunflower: "Girasoles", lily: "Lirios",
  daisy: "Margaritas", iris: "Lirios cárdenos", marigold: "Caléndulas",
};

/** Normaliza y quita acentos para leer la primera letra. */
function firstLetterCode(name: string): number {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  const ch = clean.charAt(0);
  const code = ch.charCodeAt(0);
  if (Number.isNaN(code)) return 65;
  // A–Z → 0–25 · otros → módulo
  return code >= 65 && code <= 90 ? code - 65 : code % 26;
}

/** Longitud significativa del nombre (sin espacios). */
function nameLength(name: string): number {
  return name.replace(/\s+/g, "").length || 5;
}

export function derivePersonalTraits(input: PersonalInput): PersonalTraits {
  const { name, registeredAt, points } = input;
  const lastSeen = input.lastSeenAt ?? caracasNow();

  /* ── 1 · Longitud del nombre → nº de pétalos (5–13, números de Fibonacci) ── */
  const len = nameLength(name);
  const FIB = [5, 8, 13, 21];
  // Mapea la longitud a un nº de pétalos "natural"
  const petalCount = len <= 4 ? 5 : len <= 7 ? 8 : len <= 11 ? 13 : FIB[3];

  /* ── 2 · Primera letra → matiz dominante ── */
  const letterIdx = firstLetterCode(name);          // 0–25
  const dominantHue = Math.round((letterIdx / 26) * 360);

  /* ── 3 · Día de registro → curvatura del tronco ── */
  const day = registeredAt.getDate();               // 1–31
  const trunkCurve = ((day - 16) / 15) * 30;        // -30 … +30

  /* ── 4 · Mes de registro → especie y complejidad ── */
  const month = registeredAt.getMonth() + 1;        // 1–12
  const flowerSpecies = SPECIES_BY_MONTH[month - 1];
  // Meses pares → corolas densas (rosas); impares → corolas simples (girasoles)
  const petalLayers = month % 2 === 0 ? 3 : 1;

  /* ── 5 · Hora de la última conexión → día/noche ── */
  const h = lastSeen.getHours() + lastSeen.getMinutes() / 60;
  const dayRatio = clamp(h / 24, 0, 1);
  const nocturnal = h < 6 || h >= 19;

  /* ── 6 · Actividad → escala, frondosidad y profundidad del fractal ── */
  const p = Math.max(0, points);
  const growthScale = clamp(0.62 + Math.log10(1 + p) * 0.2, 0.62, 1.5);
  const foliage = clamp(0.28 + Math.log10(1 + p) * 0.24, 0.28, 1);
  const treeDepth = clamp(3 + Math.floor(Math.log10(1 + p) * 1.15), 3, 6);

  return {
    petalCount,
    dominantHue,
    trunkCurve,
    flowerSpecies,
    petalLayers,
    dayRatio,
    nocturnal,
    growthScale,
    foliage,
    treeDepth,
    summary: `${petalCount} pétalos · ${SPECIES_LABEL[flowerSpecies]}`,
  };
}

export { SPECIES_LABEL };

/** Traits neutros cuando aún no hay datos del usuario. */
export function defaultPersonalTraits(): PersonalTraits {
  return derivePersonalTraits({
    name: "Usuario",
    registeredAt: new Date(),
    points: 0,
  });
}
