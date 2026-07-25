import { memo, useId, useMemo } from "react";
import { motion } from "framer-motion";
import { generateGardenModel, signatureFromDna } from "./model";
import { LevelModule, resolveLevel } from "./levels";
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

const SHADOW_COLOR = "rgba(62, 64, 40, 0.18)";

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
  const waterId = "water-iso";
  const canopyGlowId = `canopy-glow-${rawId}`;
  const flowers =
    FLOWER_PALETTES[dna.paletteVariant % FLOWER_PALETTES.length];
  const seasonSky = SEASON_SKY[state.season];
  const health = state.health;
  const saturate = 0.3 + 0.7 * health;
  const contentOpacity = 0.6 + 0.4 * health;
  const isDrought = health < 0.3;
  const tree = model.tree;
  const showPond = model.pond?.visible ?? false;

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
        <radialGradient id={canopyGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#f5e6b8" stopOpacity="0.18" />
          <stop offset="1" stopColor="#f5e6b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={waterId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8d8dc" />
          <stop offset="0.5" stopColor="#9ab8c2" />
          <stop offset="1" stopColor="#7a9ba6" />
        </linearGradient>
        <linearGradient id="water-iso-deep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8ab0bc" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6a8a9a" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <rect width="720" height="460" fill={`url(#${skyId})`} opacity={0.7 + 0.3 * health} />

      <g style={{ filter: `saturate(${saturate})`, opacity: contentOpacity, willChange: "filter, opacity" }}>
        {model.terrainLayers.map((layer) => (
          <path key={layer.id} d={layer.d} fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth} />
        ))}

        {model.shadows.map((shadow, i) => (
          <ellipse
            key={`shadow-${i}`}
            cx={shadow.x}
            cy={shadow.y}
            rx={shadow.rx}
            ry={shadow.ry}
            fill={SHADOW_COLOR}
          />
        ))}

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

        {model.floraClusters.map((cluster) => (
          <FloraCluster key={cluster.id} cluster={cluster} />
        ))}

        {showPond && model.pond && (
          <IsometricPond pond={model.pond} waterLevel={state.waterLevel} />
        )}

        {model.river.visible && !showPond && (
          <motion.g
            initial={false}
            animate={{ opacity: [0.8, 0.95, 0.8] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d={model.river.d} fill={`url(#${waterId})`} opacity={0.6 + state.waterLevel / 300} />
            <path d={model.river.d} fill="none" stroke="#e8efeb" strokeWidth="2" opacity=".6" />
          </motion.g>
        )}

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

        <CedarTree tree={tree} justWatered={justWatered} />

        <ellipse cx={tree.x} cy={tree.y - tree.trunkHeight * 0.4} rx={55 * tree.canopyScale} ry={35 * tree.canopyScale} fill={`url(#${canopyGlowId})`} />

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
              <circle cx={0} cy={0} r={Math.max(0.1, 0.7 + (particle.scale ?? 0) * 0.8)} fill="#d4af6a" />
            </motion.g>
          ))}

        {model.lightRays.map((ray, i) => (
          <motion.path
            key={`ray-${i}`}
            d={`M ${ray.x} 0 L ${ray.x + ray.width} 390 L ${ray.x - ray.width / 2} 390 Z`}
            fill="#d4af6a"
            opacity={ray.opacity}
            animate={{ opacity: [ray.opacity * 0.65, ray.opacity, ray.opacity * 0.65] }}
            transition={{ duration: 8 + i, repeat: Infinity, ease: "easeInOut" }}
          />
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
                initial={{ y1: 0, y2: 460 }}
                animate={{ y1: [-20, 480], y2: [440, 920] }}
                stroke="#b7c8cc"
                strokeWidth="1.2"
                opacity=".45"
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

      <g transform="translate(640 420)">
        <StonePlaque />
        <g transform="translate(0, 28)">
          <GardenSignatureGlyph signature={signature} />
        </g>
      </g>
    </svg>
  );
});

function Plant({ plant, color }: { plant: { x: number; y: number; scale: number; delay: number }; color: string }) {
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

function Flower({ flower, color }: { flower: { x: number; y: number; scale: number; delay: number }; color: string }) {
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

function FloraCluster({ cluster }: { cluster: { x: number; y: number; type: string; scale: number; rotation: number; tone: number } }) {
  const { x, y, type, scale, rotation, tone } = cluster;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}>
      {type === "lavender" && (
        <>
          <ellipse cx="0" cy="-2" rx="6" ry="3" fill={SHADOW_COLOR} />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${(i - 2) * 4} 0)`}>
              <line x1="0" y1="0" x2="0" y2="-18" stroke="#6b5a42" strokeWidth="1.5" />
              <ellipse cx="0" cy="-16" rx="1.8" ry="4" fill="#b9a4b8" />
              <ellipse cx="0" cy="-21" rx="1.6" ry="3.5" fill="#c7b6c2" />
              <ellipse cx="0" cy="-12" rx="1.5" ry="3" fill="#d4c4d0" />
            </g>
          ))}
        </>
      )}
      {type === "daisy" && (
        <>
          <ellipse cx="0" cy="-1" rx="5" ry="2.5" fill={SHADOW_COLOR} />
          <line x1="0" y1="0" x2="0" y2="-16" stroke="#74815f" strokeWidth="1.3" />
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse key={i} cx="0" cy="-20" rx="2.5" ry="5.5" fill="#f0f0ec" transform={`rotate(${i * 72} 0 -20)`} />
          ))}
          <circle cx="0" cy="-20" r="2.8" fill="#d4af6a" />
        </>
      )}
      {type === "rosemary" && (
        <>
          <ellipse cx="0" cy="-1" rx="5" ry="2.5" fill={SHADOW_COLOR} />
          <path d="M0 0 Q-2 -10 -1 -22" fill="none" stroke="#6b7a58" strokeWidth="1.4" />
          {[-6, -3, 0, 3, 6, -8, -1, 4, 7].map((dx, i) => (
            <ellipse key={i} cx={dx} cy={-8 - Math.abs(dx) * 0.4} rx="2" ry="1.2" fill="#8a9976" transform={`rotate(${dx > 0 ? -25 : 25} ${dx} ${-8 - Math.abs(dx) * 0.4})`} />
          ))}
        </>
      )}
      {type === "thyme" && (
        <>
          <ellipse cx="0" cy="-1" rx="5" ry="2.5" fill={SHADOW_COLOR} />
          <path d="M-4 0 Q-3 -4 -2 -8 M0 0 Q0.5 -4 1 -9 M4 0 Q3.5 -3.5 3 -7" fill="none" stroke="#7a8a66" strokeWidth="1.2" />
          {[-3, 0, 3, -5, 5, -2, 2, 4].map((dx, i) => (
            <ellipse key={i} cx={dx} cy={-2 - ((tone + i) % 5)} rx="1.8" ry="1" fill="#6b7a58" />
          ))}
        </>
      )}
      {type === "olive_shrub" && (
        <>
          <ellipse cx="0" cy="-1" rx="6" ry="3" fill={SHADOW_COLOR} />
          <line x1="0" y1="0" x2="-1" y2="-14" stroke="#8b9678" strokeWidth="2" />
          {[-4, 4, 0, -6, 6].map((dx, i) => (
            <ellipse key={i} cx={dx} cy={-10 - Math.abs(dx) * 0.3} rx="4" ry="2.5" fill="#9aa584" />
          ))}
        </>
      )}
    </g>
  );
}

function IsometricPond({ pond, waterLevel }: { pond: { d: string; deepD: string; ripples: Array<{ x: number; y: number; rx: number; ry: number; delay: number }>; lilies: Array<{ x: number; y: number; scale: number }>; stones: Array<{ x: number; y: number; scale: number }> }; waterLevel: number }) {
  return (
    <motion.g
      initial={false}
      animate={{ opacity: [0.85, 0.95, 0.85] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d={pond.d} fill="url(#water-iso)" opacity="0.85" />
      <path d={pond.deepD} fill="url(#water-iso-deep)" />
      {pond.stones.map((stone, i) => (
        <g key={`stone-${i}`} transform={`translate(${stone.x} ${stone.y}) scale(${stone.scale})`}>
          <path d="M0 0 Q3 -2 6 0 Q3 -4 0 0Z" fill="#9a928a" opacity="0.7" />
          <path d="M0 0 Q-2 -1.5 -5 0 Q-2 -3 0 0Z" fill="#7a7268" opacity="0.5" />
        </g>
      ))}
      {pond.lilies.map((lily, i) => (
        <g key={`lily-${i}`} transform={`translate(${lily.x} ${lily.y}) scale(${lily.scale})`}>
          <ellipse cx="0" cy="1" rx="5" ry="2.5" fill="#a8c8a0" opacity="0.85" />
          <path d="M-4 1 Q0 -3 4 1 Q2 4 -4 1Z" fill="#c8dcc0" opacity="0.8" />
          <circle cx="0" cy="0" r="1.2" fill="#e8c0b0" />
        </g>
      ))}
      {pond.ripples.map((ripple, i) => (
        <motion.ellipse
          key={`ripple-${i}`}
          cx={ripple.x}
          cy={ripple.y}
          rx={ripple.rx}
          ry={ripple.ry}
          fill="none"
          stroke="#e8efeb"
          strokeWidth="0.8"
          opacity="0.5"
          animate={{ rx: [ripple.rx, ripple.rx * 1.4, ripple.rx], ry: [ripple.ry, ripple.ry * 1.4, ripple.ry], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 6 + ripple.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </motion.g>
  );
}

function CedarTree({ tree, justWatered }: { tree: { x: number; y: number; trunkHeight: number; canopyScale: number; branches: { d: string; width: number; depth: number }[] }; justWatered?: boolean }) {
  const cedar = (tree as { cedarExtras?: { roots: { d: string; stroke: string; strokeWidth: number }[]; canopyLayers: { d: string; fill: string; opacity: number }[] } }).cedarExtras;
  if (!cedar) return null;

  return (
    <motion.g
      transform={`translate(${tree.x} ${tree.y})`}
      animate={justWatered ? { scale: [1, 1.025, 1] } : { rotate: [-0.15, 0.2, -0.15] }}
      transition={{ duration: justWatered ? 1.2 : 10, repeat: justWatered ? 0 : Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: `${tree.x}px ${tree.y}px` }}
    >
      {cedar.roots.map((root, i) => (
        <path key={`root-${i}`} d={root.d} fill="none" stroke={root.stroke} strokeWidth={root.strokeWidth} strokeLinecap="round" opacity="0.85" />
      ))}
      <ellipse cx="0" cy="4" rx="18" ry="6" fill="rgba(62, 64, 40, 0.18)" />

      <g opacity="0.9">
        <path d={`M-9 0 L-7 ${-tree.trunkHeight} Q-8 ${-tree.trunkHeight - 4} -7 ${-tree.trunkHeight} L-9 0`} fill="#6b5a42" />
        <path d={`M7 0 L6 ${-tree.trunkHeight} Q6.5 ${-tree.trunkHeight - 3} 6 ${-tree.trunkHeight} L7 0`} fill="#5a4a32" opacity="0.7" />
      </g>

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

      {cedar.canopyLayers.map((layer, i) => (
        <motion.path
          key={`canopy-${i}`}
          d={layer.d}
          fill={layer.fill}
          opacity={layer.opacity}
          animate={{ scale: [1, 1.012, 1] }}
          transition={{ duration: 8 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${tree.x}px ${tree.y - tree.trunkHeight}px` }}
        />
      ))}
    </motion.g>
  );
}

function StonePlaque() {
  const textX = 0;
  const textY = -6;
  return (
    <g transform={`translate(${textX} ${textY})`}>
      <path d="M-28 0 L28 0 L26 14 L-26 14 Z" fill="#a89e8a" stroke="#706860" strokeWidth="0.8" />
      <path d="M-28 0 L26 0 L25 2 L-27 2 Z" fill="#c4bca6" opacity="0.8" />
      <path d="M-26 14 L26 14 L25 16 L-27 16 Z" fill="#706860" opacity="0.4" />
      <text x="0" y="-10" textAnchor="middle" fontSize="5.5" fontFamily="Georgia, serif" fill="#5a5040">
        9212498CC5
      </text>
      <text x="0" y="-3" textAnchor="middle" fontSize="4.2" fontFamily="Georgia, serif" fill="#6b6050" opacity="0.9">
        Mediterráneo · Cedro
      </text>
    </g>
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
          <ellipse key={i} cy="-7" rx="3" ry="7" fill={`hsl(${signature.hue} 28% 64%)`} transform={`translate(0, -7) rotate(${(360 / signature.petals) * i})`} />
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
