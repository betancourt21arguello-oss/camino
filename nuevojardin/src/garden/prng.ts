/* ============================================================================
 * src/garden/prng.ts
 * Determinismo puro. NUNCA se usa Math.random() en la generación del jardín.
 * - sha256Hex : digest síncrono (SHA-256) para computeDna
 * - createPrng: Mulberry32 sembrado
 * - noise1D   : ruido 1D suavizado para geometría orgánica
 * ==========================================================================*/

/* ── SHA-256 síncrono ───────────────────────────────────────────────────── */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/** SHA-256 síncrono → hex de 64 caracteres. */
export function sha256Hex(message: string): string {
  // UTF-8 encode
  const bytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    let c = message.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0xd800 || c >= 0xe000)
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else {
      i++;
      c = 0x10000 + (((c & 0x3ff) << 10) | (message.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f),
      );
    }
  }

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // 64-bit big-endian length (alto = 0 para mensajes cortos)
  bytes.push(0, 0, 0, 0);
  bytes.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let off = 0; off < bytes.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] =
        (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) |
        (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  let out = "";
  for (let i = 0; i < 8; i++) out += H[i].toString(16).padStart(8, "0");
  return out;
}

/* ── Mulberry32 ─────────────────────────────────────────────────────────── */
export type Prng = () => number;

/** Convierte cualquier string en un entero de 32 bits (xmur3). */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** PRNG determinista Mulberry32. */
export function createPrng(seed: string | number): Prng {
  let a = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
export const rnd = (p: Prng, min: number, max: number) => p() * (max - min) + min;
export const rndInt = (p: Prng, min: number, max: number) => Math.floor(p() * (max - min + 1)) + min;
export const pick = <T,>(p: Prng, arr: readonly T[]): T => arr[Math.floor(p() * arr.length) % arr.length];
export const chance = (p: Prng, prob: number) => p() < prob;

/* ── Ruido 1D suavizado ─────────────────────────────────────────────────── */
function valueAt(i: number, seed: number): number {
  let n = (i + seed) | 0;
  n = (n << 13) ^ n;
  return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824;
}
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Ruido 1D determinista en rango [-1, 1]. */
export function noise1D(x: number, seed: string | number = 0): number {
  const s = typeof seed === "number" ? seed : hashSeed(seed);
  const i = Math.floor(x);
  const f = x - i;
  return valueAt(i, s) * (1 - smooth(f)) + valueAt(i + 1, s) * smooth(f);
}

/** Ruido fractal (varias octavas) en rango aprox [-1, 1]. */
export function fbm1D(x: number, seed: string | number = 0, octaves = 3): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise1D(x * freq, seed) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
