/** Hash estable de string → uint32. */
export function hashSeed(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG Mulberry32 determinista. Nunca usa Math.random(). */
export function createPrng(seed: string | number) {
  let a = typeof seed === "string" ? hashSeed(seed) : seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value noise 1D, útil para curvas orgánicas sin dependencias. */
export function noise1D(x: number, seed: string): number {
  const lo = Math.floor(x);
  const hi = lo + 1;
  const r0 = createPrng(`${seed}:${lo}`)();
  const r1 = createPrng(`${seed}:${hi}`)();
  const t = x - lo;
  const smooth = t * t * (3 - 2 * t);
  return r0 * (1 - smooth) + r1 * smooth;
}
