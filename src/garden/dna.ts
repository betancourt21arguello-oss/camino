import { useEffect, useMemo, useState } from "react";
import type { DnaTraits, PathShape, TerrainKind, TreeSpecies } from "./types";

const TERRAINS: TerrainKind[] = ["bosque", "pradera", "colina", "monastico", "mediterraneo"];
const PATHS: PathShape[] = ["recto", "curvo", "espiral", "cruz", "circulo"];
const TREES: TreeSpecies[] = ["olivo", "cedro", "cipres", "roble", "sauce"];

/**
 * GardenDNA = SHA-256(identidad estable). Nunca es un número aleatorio.
 * Nace una sola vez y jamás cambia, sin importar el dispositivo o navegador.
 */
export async function computeDna(identity: string): Promise<string> {
  const bytes = new TextEncoder().encode(identity);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function seg(hex: string, start: number, len = 4): number {
  return parseInt(hex.slice(start, start + len) || "0", 16) || 0;
}

/**
 * El ADN determina ÚNICAMENTE la personalidad del jardín: nunca la
 * cantidad de plantas, agua o luz — eso pertenece al GardenState mutable.
 */
export function deriveDnaTraits(dna: string): DnaTraits {
  return {
    dna,
    terrain: TERRAINS[seg(dna, 0) % TERRAINS.length],
    pathShape: PATHS[seg(dna, 4) % PATHS.length],
    treeSpecies: TREES[seg(dna, 8) % TREES.length],
    rockPattern: seg(dna, 12) % 4,
    riverAngle: seg(dna, 16) % 360,
    paletteVariant: seg(dna, 20) % 3,
    flowerSpeciesBias: seg(dna, 24) % 3,
    signatureSeed: dna.slice(28, 44) || dna,
  };
}

/**
 * Hook: calcula el ADN una sola vez para una identidad estable
 * (auth.uid, o un id anónimo persistido) y deriva sus rasgos.
 * Determinista: la misma identidad siempre produce el mismo ADN,
 * en cualquier dispositivo del mundo.
 */
export function useGardenDna(identity: string): DnaTraits | null {
  const [dna, setDna] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    computeDna(identity).then((hex) => {
      if (active) setDna(hex);
    });
    return () => {
      active = false;
    };
  }, [identity]);

  return useMemo(() => (dna ? deriveDnaTraits(dna) : null), [dna]);
}
