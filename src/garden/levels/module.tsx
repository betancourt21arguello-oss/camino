import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { createPrng } from "../prng";
import type { DnaTraits, GardenState } from "../types";
import type { LevelConfig } from "./types";

function makePoints(
  seed: string,
  count: number,
  box: { x0: number; x1: number; y0: number; y1: number },
) {
  const rng = createPrng(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: `level-${seed}-${i}`,
    x: box.x0 + rng() * (box.x1 - box.x0),
    y: box.y0 + rng() * (box.y1 - box.y0),
    scale: 0.7 + rng() * 0.65,
    tone: Math.floor(rng() * 4),
    delay: rng() * 4,
  })).sort((a, b) => a.y - b.y);
}

function makeLightRays(
  seed: string,
  count: number,
) {
  const rng = createPrng(seed);
  return Array.from({ length: count }, () => ({
    x: rng() * 720,
    width: 30 + rng() * 80,
    opacity: 0.035 + rng() * 0.06,
  }));
}

export const LevelModule = memo(function LevelModule({
  config,
  dna,
}: {
  config: LevelConfig;
  dna: DnaTraits;
}) {
  const flowers = useMemo(
    () =>
      config.flowerBonus > 0
        ? makePoints(`${dna.dna}:level-flowers`, config.flowerBonus, {
            x0: 55,
            x1: 665,
            y0: 292,
            y1: 405,
          })
        : [],
    [config.flowerBonus, dna.dna],
  );

  const lights = useMemo(
    () =>
      config.lightBonus > 0
        ? makePoints(`${dna.dna}:level-lights`, config.lightBonus, {
            x0: 100,
            x1: 620,
            y0: 280,
            y1: 380,
          })
        : [],
    [config.lightBonus, dna.dna],
  );

  const plants = useMemo(
    () =>
      config.plantBonus > 0
        ? makePoints(`${dna.dna}:level-plants`, config.plantBonus, {
            x0: 35,
            x1: 685,
            y0: 320,
            y1: 434,
          })
        : [],
    [config.plantBonus, dna.dna],
  );

  const rocks = useMemo(
    () =>
      config.rockBonus > 0
        ? makePoints(`${dna.dna}:level-rocks`, config.rockBonus, {
            x0: 60,
            x1: 660,
            y0: 330,
            y1: 420,
          })
        : [],
    [config.rockBonus, dna.dna],
  );

  const particles = useMemo(
    () =>
      config.particleBonus > 0
        ? makePoints(`${dna.dna}:level-particles`, config.particleBonus, {
            x0: 25,
            x1: 695,
            y0: 70,
            y1: 350,
          })
        : [],
    [config.particleBonus, dna.dna],
  );

  const butterflies = useMemo(
    () =>
      config.butterflyBonus > 0
        ? makePoints(`${dna.dna}:level-butterflies`, config.butterflyBonus, {
            x0: 80,
            x1: 640,
            y0: 140,
            y1: 285,
          })
        : [],
    [config.butterflyBonus, dna.dna],
  );

  const lightRays = useMemo(
    () =>
      config.lightRayBonus > 0
        ? makeLightRays(`${dna.dna}:level-lightrays`, config.lightRayBonus)
        : [],
    [config.lightRayBonus, dna.dna],
  );

  if (
    flowers.length === 0 &&
    lights.length === 0 &&
    plants.length === 0 &&
    rocks.length === 0 &&
    particles.length === 0 &&
    butterflies.length === 0 &&
    lightRays.length === 0
  ) {
    return null;
  }

  const GREENS = ["#74815f", "#879173", "#667554", "#98a087"];
  const FLOWER_PALETTES = [
    ["#c99aab", "#e4c6cf", "#f0ddd8"],
    ["#aab9c8", "#d3dbe2", "#ead9c8"],
    ["#b8adcb", "#ddd4e4", "#d4b7aa"],
  ];
  const flowerColors =
    FLOWER_PALETTES[dna.paletteVariant % FLOWER_PALETTES.length];

  return (
    <g>
      {plants.map((p) => (
        <g
          key={p.id}
          transform={`translate(${p.x} ${p.y}) scale(${p.scale})`}
          animate={{ rotate: [-0.8, 0.8, -0.8] }}
          transition={{ duration: 7 + p.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${p.x}px ${p.y}px` }}
        >
          <path d="M0 0 Q-1 -18 1 -34" fill="none" stroke={GREENS[p.tone % GREENS.length]} strokeWidth="2" strokeLinecap="round" />
          <path d="M0 -15 Q-13 -22 -17 -12 Q-8 -7 0 -15Z" fill={GREENS[p.tone % GREENS.length]} opacity=".85" />
          <path d="M0 -24 Q12 -31 16 -21 Q8 -15 0 -24Z" fill={GREENS[p.tone % GREENS.length]} opacity=".72" />
        </g>
      ))}
      {flowers.map((f) => (
        <g
          key={f.id}
          transform={`translate(${f.x} ${f.y}) scale(${f.scale})`}
          animate={{ scale: [f.scale * 0.97, f.scale * 1.03, f.scale * 0.97] }}
          transition={{ duration: 6 + f.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${f.x}px ${f.y}px` }}
        >
          <path d="M0 0 Q1 -11 0 -22" stroke="#74815f" strokeWidth="1.5" fill="none" />
          {Array.from({ length: 5 }, (_, i) => (
            <ellipse key={i} cx="0" cy="-27" rx="3" ry="7" fill={flowerColors[f.tone % flowerColors.length]} transform={`rotate(${i * 72} 0 -27)`} />
          ))}
          <circle cx="0" cy="-27" r="2.2" fill="#c3a15c" />
        </g>
      ))}
      {rocks.map((r) => (
        <ellipse
          key={r.id}
          cx={r.x}
          cy={r.y}
          rx={9 * r.scale}
          ry={5.5 * r.scale}
          fill="#aba497"
          opacity=".62"
        />
      ))}
      {lights.map((l) => (
        <g
          key={l.id}
          animate={{ opacity: [0.5, 1, 0.6] }}
          transition={{ duration: 2.5 + l.delay, repeat: Infinity }}
        >
          <circle cx={l.x ?? 0} cy={l.y ?? 0} r="3" fill="#f0e2b8" />
          <circle cx={l.x ?? 0} cy={l.y ?? 0} r="8" fill="#d4af6a" opacity=".18" />
        </g>
      ))}
      {butterflies.map((b) => (
        <g
          key={b.id}
          initial={{ opacity: 0 }}
          animate={{
            x: [b.x, b.x + 18, b.x - 8, b.x],
            y: [b.y, b.y - 13, b.y + 5, b.y],
            opacity: [0, 0.72, 0.6, 0],
          }}
          transition={{ duration: 14, delay: b.delay * 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="-3" cy="0" rx="4" ry="2.5" fill="#b9a4b8" transform="rotate(28)" />
          <ellipse cx="3" cy="0" rx="4" ry="2.5" fill="#c7b6c2" transform="rotate(-28)" />
        </g>
      ))}
      {particles.map((p) => (
        <g
          key={p.id}
          initial={{ opacity: 0 }}
          style={{ x: p.x, y: p.y }}
          animate={{
            opacity: [0.08, 0.42, 0.08],
            y: [p.y, p.y - 8, p.y],
          }}
          transition={{
            opacity: { duration: 7 + p.delay, repeat: Infinity },
            y: {
              duration: 7 + p.delay,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          <circle cx={0} cy={0} r={Math.max(0.1, 0.7 + (p.scale ?? 0) * 0.8)} fill="#d4af6a" />
        </g>
      ))}
      {lightRays.map((r, i) => (
        <motion.path
          key={`lr-${i}`}
          d={`M ${r.x} 0 L ${r.x + r.width} 390 L ${r.x - r.width / 2} 390 Z`}
          fill="#d4af6a"
          opacity={r.opacity}
          animate={{ opacity: [r.opacity * 0.5, r.opacity, r.opacity * 0.5] }}
          transition={{ duration: 8 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </g>
  );
});