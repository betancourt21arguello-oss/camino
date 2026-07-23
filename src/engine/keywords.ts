import type { Step } from "./types";

const STOP = new Set([
  "que",
  "los",
  "las",
  "del",
  "con",
  "por",
  "para",
  "una",
  "uno",
  "eres",
  "esta",
  "este",
  "como",
  "nos",
  "sea",
  "tus",
  "toda",
  "todas",
  "todos",
]);

/**
 * Extrae palabras clave del texto del paso actual para el autoplay por voz.
 * Toma las palabras más significativas (largas, no vacías).
 */
export function keywordsForStep(step: Step): string[] {
  const source = [step.leaderText, step.assemblyText, step.text]
    .filter(Boolean)
    .join(" ");
  const words = source
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
  // Deduplicate, keep first appearances, cap at 6.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
    if (out.length >= 6) break;
  }
  return out;
}
