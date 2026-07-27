/* ============================================================================
 * src/garden/dna.ts — Identidad digital permanente del jardín
 * computeDna(identity) → SHA-256 hex
 * deriveDnaTraits(dna) → segmenta el hash en rasgos inmutables
 * ==========================================================================*/
import { useMemo } from "react";
import { sha256Hex } from "./prng";
import type {
  DnaTraits, TerrainKind, PathShape, TreeSpecies,
  RockPattern, PaletteVariant, FlowerSpeciesBias, GardenSignature, StoneShrineKind,
} from "./types";

const TERRAINS: readonly TerrainKind[] = ["meadow", "forest", "hill", "desert", "coast", "highland"];
const PATHS: readonly PathShape[] = ["serpentine", "straight", "spiral", "forked", "circular"];
const TREES: readonly TreeSpecies[] = ["cedar", "oak", "olive", "palm", "pine", "jacaranda"];
const ROCKS: readonly RockPattern[] = ["scattered", "clustered", "cairn", "ring", "sparse"];
const PALETTES: readonly PaletteVariant[] = ["dawn", "verdant", "amber", "azure", "rose", "dusk"];
const FLOWERS: readonly FlowerSpeciesBias[] = ["rose", "lily", "lavender", "daisy", "marigold", "iris"];

/** Lee `len` nybbles del hash a partir de `at` → entero. */
function seg(dna: string, at: number, len: number): number {
  return parseInt(dna.slice(at, at + len), 16) || 0;
}

/** SHA-256 de la identidad. Inmutable de por vida para esa identidad. */
export function computeDna(identity: string): string {
  return sha256Hex(`camino::garden::v1::${identity}`);
}

/**
 * Segmenta el hash hex en rasgos determinísticos.
 * Cada rasgo usa un tramo distinto del digest → sin correlación entre ellos.
 */
/** rockPattern → estructura de piedra devocional (Piedra Fundamental). */
const SHRINE_BY_ROCK: Record<RockPattern, StoneShrineKind> = {
  cairn: "cairn_altar",
  ring: "celtic_cross",
  clustered: "stone_altar",
  scattered: "standing_stone",
  sparse: "celtic_cross",
};

export function deriveDnaTraits(dna: string): DnaTraits {
  const rockPattern = ROCKS[seg(dna, 6, 2) % ROCKS.length];
  const riverAngle = (seg(dna, 8, 3) % 81) - 40;     // -40 … 40

  return {
    dna,
    terrain: TERRAINS[seg(dna, 0, 2) % TERRAINS.length],
    pathShape: PATHS[seg(dna, 2, 2) % PATHS.length],
    treeSpecies: TREES[seg(dna, 4, 2) % TREES.length],
    rockPattern,
    riverAngle,
    paletteVariant: PALETTES[seg(dna, 11, 2) % PALETTES.length],
    flowerSpeciesBias: FLOWERS[seg(dna, 13, 2) % FLOWERS.length],
    signatureSeed: dna.slice(48, 64),
    baseHue: seg(dna, 15, 3) % 360,
    // Derivados
    waterFeature: Math.abs(riverAngle) > 12 ? "river" : "pond",
    shrine: SHRINE_BY_ROCK[rockPattern],
  };
}

/** Atajo: identidad → rasgos. */
export function gardenDnaFor(identity: string): DnaTraits {
  return deriveDnaTraits(computeDna(identity));
}

/** Hook React memoizado. */
export function useGardenDna(identity: string): DnaTraits {
  return useMemo(() => gardenDnaFor(identity), [identity]);
}

/* ── Firma (placa de piedra) ────────────────────────────────────────────── */
const SIG_KINDS: readonly GardenSignature["kind"][] = ["cross", "star", "leaf", "chalice", "dove", "flame"];

export function signatureFromDna(traits: DnaTraits): GardenSignature {
  const s = traits.signatureSeed;
  return {
    kind: SIG_KINDS[seg(s, 0, 2) % SIG_KINDS.length],
    hue: (traits.baseHue + seg(s, 2, 2)) % 360,
    angle: (seg(s, 4, 2) % 61) - 30,
    petals: 5 + (seg(s, 6, 1) % 4),          // 5 … 8
    code: traits.dna.slice(0, 10).toUpperCase(),
  };
}

/** Paletas de color por variante — matiz base + acentos. */
export const PALETTE_TABLE: Record<PaletteVariant, { grass: number; sky: [string, string, string]; accent: number }> = {
  dawn:    { grass: 108, sky: ["#f2b880", "#f7d6a8", "#fdeed8"], accent: 32 },
  verdant: { grass: 122, sky: ["#7ab4d8", "#aed4e8", "#d8eef8"], accent: 150 },
  amber:   { grass: 92,  sky: ["#e0a850", "#f0cc80", "#fbe8c0"], accent: 45 },
  azure:   { grass: 148, sky: ["#5a9ac8", "#8ec4e4", "#c8e8f8"], accent: 205 },
  rose:    { grass: 116, sky: ["#d8a0b0", "#eec4d0", "#fae6ee"], accent: 340 },
  dusk:    { grass: 132, sky: ["#6a7aa8", "#98a8c8", "#ccd6e8"], accent: 268 },
};
