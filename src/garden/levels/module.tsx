import { motion } from "framer-motion";
import { createPrng, rnd, rndInt } from "../prng";
import { resolveLevel } from "./index";
import { GROUND_CX, GROUND_CY } from "../model";

interface Props {
  dna: string;
  level: number;
  accentHue: number;
  lifeRatio: number;
}

const gp = (a: number, r: number) => ({
  x: GROUND_CX + Math.cos(a) * r,
  y: GROUND_CY + Math.sin(a) * r * 0.34,
});

/**
 * Elementos decorativos EXTRA otorgados exclusivamente por el nivel del usuario.
 * Se dibuja por encima de la flora base; usa su propio PRNG determinista.
 */
export function LevelModule({ dna, level, accentHue, lifeRatio }: Props) {
  const lv = resolveLevel(level);
  const p = createPrng(dna + "::levelmodule::" + lv.level);

  // Coronas de nivel: pequeños destellos dorados que marcan el rango alcanzado
  const crowns = Array.from({ length: lv.level }, (_, i) => {
    const a = (i / Math.max(1, lv.level)) * Math.PI * 2 + 0.4;
    const g = gp(a, 236);
    return { ...g, delay: i * 0.18, r: 2 + (i % 3) * 0.6 };
  });

  // Flores bonus del nivel
  const bonusFlowers = Array.from({ length: Math.round(lv.flowers * 0.4) }, (_, i) => {
    const g = gp(rnd(p, 0, Math.PI * 2), rnd(p, 96, 254));
    return {
      x: g.x, y: g.y + rnd(p, -4, 12),
      hue: (accentHue + i * 33) % 360,
      s: rnd(p, 0.45, 0.85),
      petals: rndInt(p, 5, 7),
      delay: (i % 8) * 0.09,
    };
  });

  return (
    <g aria-hidden>
      {/* Destellos de rango */}
      {crowns.map((c, i) => (
        <motion.circle
          key={`crown-${i}`}
          cx={c.x} cy={c.y - 4} r={c.r}
          fill={`hsl(45 92% 72%)`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0.25, 0.85, 0.25], scale: [0.7, 1.15, 0.7] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: c.delay, ease: "easeInOut" }}
        />
      ))}

      {/* Flores bonus */}
      {bonusFlowers.map((f, i) => (
        <motion.g
          key={`lvf-${i}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.9 * (0.5 + lifeRatio * 0.5), scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 + f.delay, ease: "easeOut" }}
          style={{ transformOrigin: `${f.x}px ${f.y}px` }}
        >
          <line x1={f.x} y1={f.y} x2={f.x} y2={f.y - 9 * f.s}
            stroke={`hsl(120 34% 32%)`} strokeWidth={1.1 * f.s} />
          {Array.from({ length: f.petals }, (_, k) => {
            const a = (k / f.petals) * Math.PI * 2;
            const px = f.x + Math.cos(a) * 3.4 * f.s;
            const py = f.y - 10 * f.s + Math.sin(a) * 3.4 * f.s;
            return (
              <ellipse key={k} cx={px} cy={py} rx={2.1 * f.s} ry={3.1 * f.s}
                fill={`hsl(${f.hue} 68% 70%)`}
                transform={`rotate(${(a * 180) / Math.PI + 90} ${px} ${py})`} />
            );
          })}
          <circle cx={f.x} cy={f.y - 10 * f.s} r={1.7 * f.s} fill={`hsl(48 88% 68%)`} />
        </motion.g>
      ))}
    </g>
  );
}
