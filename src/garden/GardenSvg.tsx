import { memo, useId, useMemo } from "react";
import { motion } from "framer-motion";
import { generateGardenModel, signatureFromDna } from "./model";
import { LevelModule, resolveLevel } from "./levels";
import type { GardenPoint, TreeModel } from "./model";
import type { DnaTraits, GardenSignature, GardenState } from "./types";

const FLOWER_PALETTES = [
  ["#c99aab", "#e4c6cf", "#f0ddd8"],
  ["#aab9c8", "#d3dbe2", "#ead9c8"],
  ["#b8adcb", "#ddd4e4", "#d4b7aa"],
];
const GREENS = ["#74815f", "#879173", "#667554", "#98a087"];
const SEASON_SKY = {
  advent: ["#f5f1f6", "#ddd9e2"],
  christmas: ["#faf6ea", "#e8dfcb"],
  lent: ["#f2eef1", "#dcd7dc"],
  easter: ["#fbf7e9", "#e7e1ca"],
  pentecost: ["#faf1ec", "#e8d8cf"],
  ordinary: ["#f8f5ed", "#d8dccd"],
} as const;

export const GardenSvg = memo(function GardenSvg({
  dna,
  state,
  showRain = false,
  justWatered = false,
}: {
  dna: DnaTraits;
  state: GardenState;
  showRain?: boolean;
  justWatered?: boolean;
}) {
  const model = useMemo(() => generateGardenModel(dna, state), [dna, state]);
  const signature = useMemo(() => signatureFromDna(dna), [dna]);
  const rawId = useId().replace(/:/g, "");
  const skyId = `sky-${rawId}`;
  const glowId = `glow-${rawId}`;
  const waterId = `water-${rawId}`;
  const flowers =
    FLOWER_PALETTES[dna.paletteVariant % FLOWER_PALETTES.length];
  const seasonSky = SEASON_SKY[state.season];
  const health = state.health;
  const saturate = 0.3 + 0.7 * health;
  const contentOpacity = 0.6 + 0.4 * health;
  const isDrought = health < 0.3;

  return (
    <svg
      viewBox="0 0 720 460"
      className="h-auto w-full"
      role="img"
      aria-label="Jardín silvestre revelado por tu vida de oración"
      style={{ willChange: "filter, opacity" }}
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={seasonSky[0]} />
          <stop offset="0.68" stopColor="#ebe8df" />
          <stop offset="1" stopColor={seasonSky[1]} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="30%" r="56%">
          <stop offset="0" stopColor="#f5dfaa" stopOpacity={0.5 + state.lightLevel / 300} />
          <stop offset="1" stopColor="#f5dfaa" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={waterId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b7c8cc" />
          <stop offset="1" stopColor="#859fa7" />
        </linearGradient>
      </defs>

      <rect width="720" height="460" fill={`url(#${skyId})`} opacity={0.7 + 0.3 * health} />

      <g
        style={{
          filter: `saturate(${saturate})`,
          opacity: contentOpacity,
          willChange: "filter, opacity",
        }}
      >
        <path d={model.terrain} fill="#c9cfba" />
        <path d="M0 383 C180 350 520 360 720 330 L720 460 L0 460Z" fill="#b8c1a5" opacity=".42" />

        <ellipse cx="360" cy="145" rx="290" ry="215" fill={`url(#${glowId})`} />
        {model.lightRays.map((ray, i) => (
          <motion.path
            key={i}
            d={`M ${ray.x} 0 L ${ray.x + ray.width} 390 L ${ray.x - ray.width / 2} 390 Z`}
            fill="#d4af6a"
            opacity={ray.opacity}
            animate={{ opacity: [ray.opacity * 0.65, ray.opacity, ray.opacity * 0.65] }}
            transition={{ duration: 8 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {model.rocks.map((rock) => (
          <ellipse
            key={rock.id}
            cx={rock.x}
            cy={rock.y}
            rx={9 * rock.scale}
            ry={5.5 * rock.scale}
            fill="#aba497"
            opacity=".62"
          />
        ))}

        <path d={model.path} fill="none" stroke="#d7cdb9" strokeWidth={model.pathWidth} strokeLinecap="round" opacity=".76" />
        <path d={model.path} fill="none" stroke="#eee7d9" strokeWidth="2" strokeDasharray="3 10" strokeLinecap="round" opacity=".85" />

        {model.river.visible && (
          <motion.g
            initial={false}
            animate={{ opacity: [0.8, 0.95, 0.8] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d={model.river.d} fill={`url(#${waterId})`} opacity={0.6 + state.waterLevel / 300} />
            <path d={model.river.d} fill="none" stroke="#e8efeb" strokeWidth="2" opacity=".6" />
          </motion.g>
        )}

        {model.ambientPlants
          .filter((p) => isFinite(p.x) && isFinite(p.y))
          .map((plant) => (
            <Plant key={plant.id} plant={plant} color={GREENS[plant.tone % GREENS.length]} />
          ))}
        {model.ambientFlowers
          .filter((f) => isFinite(f.x) && isFinite(f.y))
          .map((flower) => (
            <Flower key={flower.id} flower={flower} color={flowers[flower.tone % flowers.length]} />
          ))}

        {model.lights.map((light) => (
          <motion.g
            key={light.id}
            animate={{ opacity: [0.5, 1, 0.6] }}
            transition={{ duration: 2.5 + light.delay, repeat: Infinity }}
            style={{ opacity: contentOpacity }}
          >
            <circle cx={light.x} cy={light.y} r="3" fill="#f0e2b8" />
            <circle cx={light.x} cy={light.y} r="8" fill="#d4af6a" opacity=".18" />
          </motion.g>
        ))}

        <CentralTree tree={model.tree} justWatered={justWatered} />

        {model.butterflies
          .filter((b) => isFinite(b.x) && isFinite(b.y))
          .map((butterfly) => (
            <motion.g
              key={butterfly.id}
              initial={{ opacity: 0 }}
              animate={{
                x: [butterfly.x, butterfly.x + 18, butterfly.x - 8, butterfly.x],
                y: [butterfly.y, butterfly.y - 13, butterfly.y + 5, butterfly.y],
                opacity: [0, 0.72, 0.6, 0],
              }}
              transition={{ duration: 14, delay: butterfly.delay * 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ellipse cx="-3" cy="0" rx="4" ry="2.5" fill="#b9a4b8" transform="rotate(28)" />
              <ellipse cx="3" cy="0" rx="4" ry="2.5" fill="#c7b6c2" transform="rotate(-28)" />
            </motion.g>
          ))}

        {model.particles
          .filter((p) => p.x != null && p.y != null && isFinite(p.x) && isFinite(p.y))
          .map((particle) => (
            <motion.g
              key={particle.id}
              initial={{ opacity: 0 }}
              style={{ x: particle.x, y: particle.y }}
              animate={{
                opacity: [0.08, 0.42, 0.08],
                y: [particle.y, particle.y - 8, particle.y],
              }}
              transition={{
                opacity: { duration: 7 + particle.delay, repeat: Infinity },
                y: {
                  duration: 7 + particle.delay,
                  delay: particle.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              <circle cx={0} cy={0} r={0.7 + particle.scale * 0.8} fill="#d4af6a" />
            </motion.g>
          ))}

        {showRain && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 28 }).map((_, i) => (
              <motion.line
                key={i}
                x1={40 + i * 24}
                y1={0}
                x2={34 + i * 24}
                y2={460}
                stroke="#b7c8cc"
                strokeWidth="1.2"
                opacity=".45"
                animate={{ y1: [-20, 480], y2: [440, 920] }}
                transition={{ duration: 1.2, delay: i * 0.04, repeat: Infinity, ease: "linear" }}
              />
            ))}
          </motion.g>
        )}

        {justWatered && (
          <motion.circle
            cx="360"
            cy="322"
            r="20"
            fill="none"
            stroke="#b7c8cc"
            initial={{ r: 20, opacity: 0.6 }}
            animate={{ r: 180, opacity: 0 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
          />
        )}

        {isDrought && (
          <rect
            x="0"
            y="0"
            width="720"
            height="460"
            fill="#8a7e6b"
            opacity={0.12 * (1 - health / 0.3)}
            pointerEvents="none"
          />
        )}

        <LevelModule config={resolveLevel(state.level)} dna={dna} />
      </g>

      <g transform="translate(680 420)">
        <GardenSignatureGlyph signature={signature} />
      </g>
    </svg>
  );
});

function Plant({ plant, color }: { plant: GardenPoint; color: string }) {
  return (
    <motion.g
      transform={`translate(${plant.x} ${plant.y}) scale(${plant.scale})`}
      animate={{ rotate: [-0.8, 0.8, -0.8] }}
      transition={{ duration: 7 + plant.delay, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: `${plant.x}px ${plant.y}px` }}
    >
      <path d="M0 0 Q-1 -18 1 -34" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M0 -15 Q-13 -22 -17 -12 Q-8 -7 0 -15Z" fill={color} opacity=".85" />
      <path d="M0 -24 Q12 -31 16 -21 Q8 -15 0 -24Z" fill={color} opacity=".72" />
    </motion.g>
  );
}

function Flower({ flower, color }: { flower: GardenPoint; color: string }) {
  return (
    <motion.g
      transform={`translate(${flower.x} ${flower.y}) scale(${flower.scale})`}
      animate={{ scale: [flower.scale * 0.97, flower.scale * 1.03, flower.scale * 0.97] }}
      transition={{ duration: 6 + flower.delay, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: `${flower.x}px ${flower.y}px` }}
    >
      <path d="M0 0 Q1 -11 0 -22" stroke="#74815f" strokeWidth="1.5" fill="none" />
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-27" rx="3" ry="7" fill={color} transform={`rotate(${i * 72} 0 -27)`} />
      ))}
      <circle cx="0" cy="-27" r="2.2" fill="#c3a15c" />
    </motion.g>
  );
}

const TREE_LOOK: Record<
  TreeModel["species"],
  { colors: string[]; render: (t: TreeModel) => React.ReactElement }
> = {
  olivo: {
    colors: ["#9aa584", "#a9b494", "#8b9678"],
    render: (t) => (
      <>
        {Array.from({ length: 7 }).map((_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return (
            <ellipse
              key={i}
              cx={Math.cos(a) * 26}
              cy={-70 - t.trunkHeight * 0.3 + Math.sin(a) * 14}
              rx={16 * t.canopyScale}
              ry={11 * t.canopyScale}
              fill={i % 2 ? "#9aa584" : "#a9b494"}
              opacity=".85"
            />
          );
        })}
      </>
    ),
  },
  cedro: {
    colors: ["#748174", "#66755f", "#889470"],
    render: (t) => (
      <>
        {[0, 1, 2, 3].map((i) => (
          <ellipse
            key={i}
            cx="0"
            cy={-46 - i * 20 - t.trunkHeight * 0.15}
            rx={(38 - i * 6) * t.canopyScale}
            ry={10 * t.canopyScale}
            fill={i % 2 ? "#748174" : "#889470"}
            opacity=".88"
          />
        ))}
      </>
    ),
  },
  cipres: {
    colors: ["#5f6e52", "#6e7d5f"],
    render: (t) => (
      <path
        d={`M0 ${-30 - t.trunkHeight * 0.2} C -16 ${-70 - t.trunkHeight * 0.4}, -10 ${-120 - t.trunkHeight * 0.6}, 0 ${-150 - t.trunkHeight * 0.7} C 10 ${-120 - t.trunkHeight * 0.6}, 16 ${-70 - t.trunkHeight * 0.4}, 0 ${-30 - t.trunkHeight * 0.2}Z`}
        fill="#5f6e52"
        opacity=".88"
        transform={`scale(${t.canopyScale})`}
      />
    ),
  },
  roble: {
    colors: ["#7e8a6b", "#89937a", "#758264"],
    render: (t) => (
      <>
        <ellipse cx="-20" cy={-68 - t.trunkHeight * 0.2} rx={26 * t.canopyScale} ry={20 * t.canopyScale} fill="#7e8a6b" opacity=".82" />
        <ellipse cx="20" cy={-64 - t.trunkHeight * 0.2} rx={28 * t.canopyScale} ry={22 * t.canopyScale} fill="#89937a" opacity=".86" />
        <ellipse cx="0" cy={-92 - t.trunkHeight * 0.2} rx={32 * t.canopyScale} ry={25 * t.canopyScale} fill="#758264" opacity=".9" />
      </>
    ),
  },
  sauce: {
    colors: ["#8a9776", "#7c886a"],
    render: (t) => (
      <>
        <ellipse cx="0" cy={-96 - t.trunkHeight * 0.2} rx={34 * t.canopyScale} ry={18 * t.canopyScale} fill="#8a9776" opacity=".7" />
        {Array.from({ length: 9 }).map((_, i) => {
          const x = -32 + i * 8;
          return (
            <path
              key={i}
              d={`M${x} ${-96 - t.trunkHeight * 0.2} C ${x - 4} ${-60}, ${x + 2} ${-30}, ${x - 2} ${-4}`}
              fill="none"
              stroke="#7c886a"
              strokeWidth="1.6"
              opacity=".6"
            />
          );
        })}
      </>
    ),
  },
};

function CentralTree({ tree, justWatered }: { tree: TreeModel; justWatered?: boolean }) {
  const look = TREE_LOOK[tree.species];
  return (
    <motion.g
      transform={`translate(${tree.x} ${tree.y})`}
      animate={justWatered ? { scale: [1, 1.03, 1] } : { rotate: [-0.3, 0.35, -0.3] }}
      transition={{ duration: justWatered ? 1.2 : 9, repeat: justWatered ? 0 : Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: `${tree.x}px ${tree.y}px` }}
    >
      {tree.branches.map((branch, i) => (
        <path
          key={i}
          d={branch.d}
          fill="none"
          stroke={branch.depth % 2 ? "#716b56" : "#7c735b"}
          strokeWidth={branch.width}
          strokeLinecap="round"
        />
      ))}
      {look.render(tree)}
    </motion.g>
  );
}

export function GardenSignatureGlyph({ signature }: { signature: GardenSignature }) {
  if (signature.kind === "star") {
    return <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3Z" fill={`hsl(${signature.hue} 25% 58%)`} />;
  }
  if (signature.kind === "flower") {
    return (
      <g transform={`rotate(${signature.angle})`}>
        {Array.from({ length: signature.petals }, (_, i) => (
          <ellipse key={i} cy="-7" rx="3" ry="7" fill={`hsl(${signature.hue} 28% 64%)`} transform={`rotate(${(360 / signature.petals) * i})`} />
        ))}
        <circle cx="0" cy="0" r="2.5" fill="#c4a35a" />
      </g>
    );
  }
  if (signature.kind === "branch") {
    return (
      <g transform={`rotate(${signature.angle})`}>
        <path d="M-10 8 Q0 0 10 -9" fill="none" stroke={`hsl(${signature.hue} 25% 42%)`} strokeWidth="2" />
        <ellipse cx="-2" cy="1" rx="5" ry="2.5" fill={`hsl(${signature.hue} 25% 55%)`} transform="rotate(25)" />
        <ellipse cx="5" cy="-5" rx="5" ry="2.5" fill={`hsl(${signature.hue} 25% 60%)`} transform="rotate(-25)" />
      </g>
    );
  }
  return <path d="M-9 5 Q0 -12 10 -5 Q3 10 -9 5Z" fill={`hsl(${signature.hue} 25% 55%)`} transform={`rotate(${signature.angle})`} />;
}
