import { memo, useId, useMemo } from "react";
import { motion } from "framer-motion";
import { generateGardenModel, signatureFromDna } from "./model";
import { LevelModule, resolveLevel } from "./levels";
import type { DnaTraits, GardenSignature, GardenState } from "./types";

const SHADOW_COLOR = "rgba(40, 44, 24, 0.28)";

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
  const rosePetalId = `rose-petal-${rawId}`;
  const lilyPetalId = `lily-petal-${rawId}`;
  const soilPathId = `soil-path-${rawId}`;
  const canopyGlowId = `canopy-glow-${rawId}`;
  const goldenHourId = `golden-hour-${rawId}`;
  const barkGradId = `bark-${rawId}`;

  const health = state.health;
  const saturate = 0.6 + 0.3 * health;
  const contentOpacity = 0.7 + 0.25 * health;
  const wateringBoost = Math.max(0, Math.min(1, state.wateringEffectStrength));
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
          <stop offset="0" stopColor="#b8d8ff" />
          <stop offset="0.45" stopColor="#e8f4ff" />
          <stop offset="0.78" stopColor="#fffbe6" />
          <stop offset="1" stopColor="#ffe8c0" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="30%" r="65%">
          <stop offset="0" stopColor="#fff5d6" stopOpacity={0.6 + state.lightLevel / 250} />
          <stop offset="1" stopColor="#fff5d6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={canopyGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff8dc" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff8dc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={waterId} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#7ec8e3" />
          <stop offset="0.5" stopColor="#4fa4c2" />
          <stop offset="1" stopColor="#2d7a9e" />
        </linearGradient>
        <linearGradient id="water-iso" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#a8dce8" />
          <stop offset="0.5" stopColor="#5cb8d0" />
          <stop offset="1" stopColor="#2d8aaa" />
        </linearGradient>
        <linearGradient id="water-iso-deep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8d8e8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#3a7a9a" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={rosePetalId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb7c5" />
          <stop offset="0.55" stopColor="#ff69b4" />
          <stop offset="1" stopColor="#c71585" />
        </linearGradient>
        <linearGradient id={lilyPetalId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#fffacd" />
          <stop offset="1" stopColor="#daa520" />
        </linearGradient>
        <linearGradient id={soilPathId} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#a0522d" />
          <stop offset="0.5" stopColor="#8b4513" />
          <stop offset="1" stopColor="#5c2e0a" />
        </linearGradient>
        <radialGradient id={goldenHourId} cx="50%" cy="30%" r="70%">
          <stop offset="0" stopColor="#fff5d6" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fff5d6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`lily-glow-${rawId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={barkGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#7a6a52" />
          <stop offset="1" stopColor="#4a3a22" />
        </radialGradient>
      </defs>

      <rect width="720" height="460" fill={`url(#${skyId})`} opacity={0.88 + 0.12 * health} />
      <rect width="720" height="460" fill={`url(#${goldenHourId})`} pointerEvents="none" />

      <g style={{ filter: `saturate(${saturate})`, opacity: contentOpacity, willChange: "filter, opacity" }}>
        {model.terrainLayers.map((layer, idx) => {
          const y = 448 - idx * 34;
          return (
            <g key={layer.id}>
              <path d={layer.d} fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth} />
              <path d={`M 140 ${y} Q 360 ${y - 9} 580 ${y}`} fill="none" stroke={layer.highlight} strokeWidth="1.1" opacity="0.45" />
            </g>
          );
        })}

        {model.shadows.map((shadow, i) => (
          <ellipse key={`shadow-${i}`} cx={shadow.x} cy={shadow.y} rx={shadow.rx} ry={shadow.ry} fill={SHADOW_COLOR} />
        ))}

        {model.ambientPlants
          .filter((p) => isFinite(p.x) && isFinite(p.y))
          .map((plant) => (
            <Plant key={plant.id} plant={plant} color="#3d8b40" wateringBoost={wateringBoost} />
          ))}
        {model.ambientFlowers
          .filter((f) => isFinite(f.x) && isFinite(f.y))
          .map((flower) => (
            <Flower key={flower.id} flower={flower} color={["#ff69b4", "#da70d6", "#87ceeb", "#ffd700"][flower.tone % 4]} wateringBoost={wateringBoost} />
          ))}

        {model.floraClusters.map((cluster) => (
          <FloraCluster key={cluster.id} cluster={cluster} rosePetalId={rosePetalId} lilyPetalId={lilyPetalId} />
        ))}

        {showPond && model.pond && (
          <IsometricPond pond={model.pond} waterLevel={state.waterLevel} rawId={rawId} />
        )}

        {model.river.visible && !showPond && (
          <motion.g
            initial={false}
            animate={{ opacity: [0.75, 0.92, 0.75] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d={model.river.d} fill={`url(#${waterId})`} opacity={0.6 + state.waterLevel / 280} />
            <path d={model.river.d} fill="none" stroke="#e0f0f5" strokeWidth="2.5" opacity=".55" />
          </motion.g>
        )}
        {model.deer && (
          <Deer x={model.deer.x} y={model.deer.y} scale={model.deer.scale} angle={model.deer.angle} />
        )}

        {model.sacredNodes?.map((node, idx) => (
          <SacredNode key={`sacred-${idx}`} x={node.x} y={node.y} type={node.type} scale={node.scale} />
        ))}

        {model.lights.map((light) => (
          <motion.g
            key={light.id}
            animate={{ opacity: [0.45, 0.92, 0.55] }}
            transition={{ duration: 2.2 + light.delay, repeat: Infinity }}
            style={{ opacity: contentOpacity }}
          >
            <circle cx={light.x} cy={light.y} r="2.8" fill="#fff5d6" />
            <circle cx={light.x} cy={light.y} r="7.5" fill="#ffd700" opacity=".16" />
          </motion.g>
        ))}

        <CedarTree tree={tree} justWatered={justWatered} rawId={rawId} barkGradId={barkGradId} />

        <Robin x={tree.x - 25} y={tree.y - tree.trunkHeight * 0.7} />

        <ellipse cx={tree.x} cy={tree.y - tree.trunkHeight * 0.35} rx={60 * tree.canopyScale} ry={40 * tree.canopyScale} fill={`url(#${canopyGlowId})`} />
        {model.dove && (
          <Dove x={model.dove.x} y={model.dove.y} scale={model.dove.scale} />
        )}
        {model.grottoArch && state.growthPhase === 3 && (
          <GrottoArch
            x={model.grottoArch.x}
            width={model.grottoArch.width}
            height={model.grottoArch.height}
            treeY={tree.y}
            trunkHeight={tree.trunkHeight}
            pillarHang={model.grottoArch.pillarHang}
            vineCount={model.grottoArch.vineCount}
            altarX={model.grottoArch.altarX}
            altarY={model.grottoArch.altarY}
            vineSeeds={model.grottoArch.vineSeeds}
          />
        )}
        {model.sacredGeometry && state.growthPhase === 3 && (
          <SacredGeometry
            cx={model.sacredGeometry.cx}
            cy={model.sacredGeometry.cy}
            rx={model.sacredGeometry.rx}
            ry={model.sacredGeometry.ry}
            rotation={model.sacredGeometry.rotation}
            nodes={model.sacredGeometry.nodes}
          />
        )}

        {model.butterflies
          .filter((b) => isFinite(b.x) && isFinite(b.y))
          .map((butterfly, idx) => (
            <motion.g
              key={butterfly.id}
              initial={{ opacity: 0 }}
              animate={{
                x: [butterfly.x, butterfly.x + 22, butterfly.x - 12, butterfly.x],
                y: [butterfly.y, butterfly.y - 16, butterfly.y + 7, butterfly.y],
                opacity: [0, 0.85, 0.65, 0],
              }}
              transition={{ duration: 13 + idx, delay: butterfly.delay * 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ellipse cx="-4.5" cy="0" rx="5.2" ry="3.2" fill="#ff6b9d" transform="rotate(28)" opacity="0.92" />
              <ellipse cx="4.5" cy="0" rx="5.2" ry="3.2" fill="#c71585" transform="rotate(-28)" opacity="0.88" />
              <ellipse cx="0" cy="0" rx="2" ry="1.1" fill="#1a050a" />
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
                opacity: [0.12, 0.6, 0.12],
                y: [particle.y, particle.y - 11, particle.y],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{
                opacity: { duration: 6 + particle.delay, repeat: Infinity },
                y: {
                  duration: 6 + particle.delay,
                  delay: particle.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                scale: {
                  duration: 6 + particle.delay,
                  delay: particle.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              <circle cx={0} cy={0} r={Math.max(0.5, 1 + (particle.scale ?? 0) * 1.3)} fill="#ffd700" />
            </motion.g>
          ))}

        {state.health < 0.55 && (
          model.particles
            .filter((p) => p.x != null && p.y != null && isFinite(p.x) && isFinite(p.y))
            .slice(0, 8)
            .map((particle) => (
              <motion.g
                key={`firefly-${particle.id}`}
                initial={{ opacity: 0 }}
                style={{ x: particle.x, y: particle.y }}
                animate={{
                  opacity: [0, 0.75, 0],
                  y: [particle.y, particle.y - 6 + Math.random() * 12, particle.y],
                  scale: [0.6, 1.4, 0.6],
                }}
                transition={{
                  duration: 5 + particle.delay * 2,
                  delay: particle.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <circle cx={0} cy={0} r={Math.max(0.4, 0.7 + (particle.scale ?? 0))} fill="#e0ffe0" />
                <circle cx={0} cy={0} r={Math.max(0.6, 1.2 + (particle.scale ?? 0) * 0.9)} fill="#90ee90" opacity="0.45" />
              </motion.g>
            ))
        )}

        {model.lightRays.map((ray, i) => (
          <motion.path
            key={`ray-${i}`}
            d={`M ${ray.x} 0 L ${ray.x + ray.width} 400 L ${ray.x - ray.width / 2} 400 Z`}
            fill="#fff5d6"
            opacity={ray.opacity}
            animate={{ opacity: [ray.opacity * 0.5, ray.opacity, ray.opacity * 0.5] }}
            transition={{ duration: 10 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {showRain && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <motion.line
                key={i}
                x1={40 + i * 24}
                y1={0}
                x2={34 + i * 24}
                y2={460}
                initial={{ y1: 0, y2: 460 }}
                animate={{ y1: [-20, 480], y2: [440, 920] }}
                stroke="#a8c8d8"
                strokeWidth="1.3"
                opacity=".4"
                transition={{ duration: 1.1, delay: i * 0.04, repeat: Infinity, ease: "linear" }}
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
            stroke="#7ec8e3"
            initial={{ r: 20, opacity: 0.65 }}
            animate={{ r: 185, opacity: 0 }}
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
            opacity={0.14 * (1 - health / 0.3)}
            pointerEvents="none"
          />
        )}

        {state.showEphemeralFlower && (
          <rect
            x="0"
            y="0"
            width="720"
            height="460"
            fill="#e8f4f0"
            opacity={0.04 * state.wateringEffectStrength}
            pointerEvents="none"
          />
        )}

        {state.dewPoints
          .filter((p) => isFinite(p.x) && isFinite(p.y))
          .map((point, idx) => (
            <motion.circle
              key={`dew-${idx}`}
              cx={point.x}
              cy={point.y}
              r={point.r}
              fill="#ffffff"
              opacity={point.opacity}
              animate={{ opacity: [point.opacity * 0.4, point.opacity, point.opacity * 0.4] }}
              transition={{ duration: 3 + idx * 0.3, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}

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
      <path d="M0 0 Q-1 -18 1 -34" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M0 -15 Q-13 -22 -17 -12 Q-8 -7 0 -15Z" fill={color} opacity=".9" />
      <path d="M0 -24 Q12 -31 16 -21 Q8 -15 0 -24Z" fill={color} opacity=".8" />
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
      <path d="M0 0 Q1 -11 0 -22" stroke="#2d6a30" strokeWidth="1.6" fill="none" />
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-27" rx="3.2" ry="7.5" fill={color} transform={`rotate(${i * 72} 0 -27)`} />
      ))}
      <circle cx="0" cy="-27" r="2.6" fill="#ffd700" />
    </motion.g>
  );
}

function FloraCluster({
  cluster,
  rosePetalId,
  lilyPetalId,
}: {
  cluster: { x: number; y: number; type: string; scale: number; rotation: number; tone: number; dewPoints?: { dx: number; dy: number; r: number; opacity: number }[]; wateringEffectStrength?: number };
  rosePetalId: string;
  lilyPetalId: string;
}) {
  const { x, y, type, scale, rotation, tone, dewPoints, wateringEffectStrength = 1 } = cluster;
  const hasDew = Array.isArray(dewPoints) && dewPoints.length > 0;
  const vitalityBoost = Math.max(0, Math.min(1, wateringEffectStrength));
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`} style={{ opacity: 0.85 + 0.15 * vitalityBoost }}>
      {type === "rose" && (
        <g>
          <ellipse cx="0" cy="4" rx="10" ry="4" fill={SHADOW_COLOR} />
          <motion.g animate={{ rotate: [-0.7, 0.7, -0.7] }} transition={{ duration: 9 + tone, repeat: Infinity, ease: "easeInOut" }}>
            <Stem />
            <Leaves />
            <OuterRosePetals colorId={rosePetalId} />
            <MiddleRosePetals colorId={rosePetalId} />
            <InnerRosePetals colorId={rosePetalId} />
            <RoseCenter />
          </motion.g>
        </g>
      )}
      {type === "rosal_de_gracia" && (
        <g>
          <ellipse cx="0" cy="6" rx="16" ry="6" fill={SHADOW_COLOR} />
          <motion.g animate={{ rotate: [-0.3, 0.3, -0.3] }} transition={{ duration: 14 + tone, repeat: Infinity, ease: "easeInOut" }}>
            <RosalDeGraciaBusy />
            <RosalDeGraciaRose x="-6" y="-10" colorId={rosePetalId} />
            <RosalDeGraciaRose x="5" y="-13" colorId={rosePetalId} />
            <RosalDeGraciaRose x="0" y="-16" colorId={rosePetalId} />
          </motion.g>
        </g>
      )}
      {type === "floral_wreath" && (
        <g>
          <ellipse cx="0" cy="4" rx="12" ry="5" fill={SHADOW_COLOR} />
          <motion.g animate={{ rotate: [-0.5, 0.5, -0.5] }} transition={{ duration: 11 + tone, repeat: Infinity, ease: "easeInOut" }}>
            <WreathBase />
            <WreathFlower x="-5" y="-6" color="#9b59b6" />
            <WreathFlower x="-1.5" y="-9" color="#3498db" />
            <WreathFlower x="2.5" y="-7" color="#f1c40f" />
            <WreathFlower x="5" y="-4" color="#9b59b6" />
            <WreathFlower x="-7" y="-3" color="#f1c40f" />
            <WreathFlower x="7" y="-2" color="#3498db" />
            <WreathLeaf x="-9" y="0" />
            <WreathLeaf x="8" y="1" />
          </motion.g>
        </g>
      )}
      {type === "lily" && (
        <g>
          <ellipse cx="0" cy="4" rx="10" ry="4" fill={SHADOW_COLOR} />
          <motion.g animate={{ rotate: [-0.6, 0.6, -0.6] }} transition={{ duration: 13 + tone, repeat: Infinity, ease: "easeInOut" }}>
            <LilyStem />
            <LilyLeaf />
            <LilyPetals colorId={lilyPetalId} />
            <LilyStamens />
          </motion.g>
        </g>
      )}
      {type === "lavender" && (
        <g>
          <ellipse cx="0" cy="-1" rx="7" ry="3.5" fill={SHADOW_COLOR} />
          <motion.g animate={{ rotate: [-0.8, 0.8, -0.8] }} transition={{ duration: 8 + tone, repeat: Infinity, ease: "easeInOut" }}>
            <path d="M0 0 Q0.5 -14 0 -30" fill="none" stroke="#5a8a3c" strokeWidth="1.8" />
            {[-1.6, -0.8, 0, 0.8, 1.6, -2.4, -0.2, 1, 2].map((dx, i) => (
              <ellipse key={i} cx={dx} cy={-6 - Math.abs(dx) * 1.2} rx="2.2" ry="1.2" fill={["#b39ddb", "#9575cd", "#7e57c2"][i % 3]} />
            ))}
          </motion.g>
        </g>
      )}
      {type === "daisy" && (
        <g>
          <ellipse cx="0" cy="-1" rx="5.5" ry="2.8" fill={SHADOW_COLOR} />
          <motion.g animate={{ rotate: [-0.9, 0.9, -0.9] }} transition={{ duration: 7 + tone, repeat: Infinity, ease: "easeInOut" }}>
            <line x1="0" y1="0" x2="0" y2="-16" stroke="#2d6a30" strokeWidth="1.4" />
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse key={i} cx="0" cy="-22" rx="3" ry="6.5" fill={["#ffffff", "#f0f0ec", "#ffffff"][i % 3]} transform={`rotate(${i * 45} 0 -22)`} />
            ))}
            <circle cx="0" cy="-22" r="3.2" fill="#ffd700" />
          </motion.g>
        </g>
      )}
      {type === "rosemary" && (
        <g>
          <ellipse cx="0" cy="-1" rx="5.5" ry="2.8" fill={SHADOW_COLOR} />
          <motion.g animate={{ rotate: [-0.7, 0.7, -0.7] }} transition={{ duration: 10 + tone, repeat: Infinity, ease: "easeInOut" }}>
            <path d="M0 0 Q-1.5 -12 -0.5 -24" fill="none" stroke="#4a7a32" strokeWidth="1.6" />
            {[-5, -2, 1, 4, -7, -3, 2, 6].map((dx, i) => (
              <ellipse key={i} cx={dx} cy={-4 - Math.abs(dx) * 0.6} rx="2.5" ry="1.4" fill="#5a9a44" transform={`rotate(${dx > 0 ? -30 : 30} ${dx} ${-4 - Math.abs(dx) * 0.6})`} />
            ))}
          </motion.g>
        </g>
      )}
      {type === "thyme" && (
        <g>
          <ellipse cx="0" cy="-1" rx="5.5" ry="2.8" fill={SHADOW_COLOR} />
          <motion.g animate={{ rotate: [-0.6, 0.6, -0.6] }} transition={{ duration: 9 + tone, repeat: Infinity, ease: "easeInOut" }}>
            {[-3, 0, 3, -5, 5, -2, 2, 4].map((dx, i) => (
              <ellipse key={i} cx={dx} cy={-2 - ((tone + i) % 5) * 0.7} rx="2.2" ry="1.2" fill="#4a8a36" />
            ))}
          </motion.g>
        </g>
      )}
      {type === "olive_shrub" && (
        <g>
          <ellipse cx="0" cy="-1" rx="7" ry="3.5" fill={SHADOW_COLOR} />
          <motion.g animate={{ rotate: [-0.5, 0.5, -0.5] }} transition={{ duration: 12 + tone, repeat: Infinity, ease: "easeInOut" }}>
            <line x1="0" y1="0" x2="-0.5" y2="-16" stroke="#6b8a5a" strokeWidth="2.2" />
            {[-5, 5, 0, -8, 8, -2, 2, 6].map((dx, i) => (
              <g key={i} transform={`translate(${dx} ${-8 - Math.abs(dx) * 0.4}) rotate(${dx * 5})`}>
                <ellipse cx="0" cy="0" rx="5" ry="3" fill="#7a9a68" />
                <ellipse cx="-1" cy="-1" rx="3.5" ry="2" fill="#8aaa78" />
              </g>
            ))}
          </motion.g>
        </g>
      )}

      {hasDew && (
        <g opacity="0.85">
          {dewPoints.map((point, idx) => (
            <motion.circle
              key={`dew-${type}-${idx}`}
              cx={point.dx}
              cy={point.dy}
              r={point.r}
              fill="#ffffff"
              opacity={point.opacity * vitalityBoost}
              animate={{ opacity: [point.opacity * 0.35, point.opacity, point.opacity * 0.35] }}
              transition={{ duration: 2.6 + idx * 0.4, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </g>
      )}
    </g>
  );
}

function RosalDeGraciaBusy() {
  return (
    <g>
      <ellipse cx="0" cy="-8" rx="14" ry="7" fill="#3d6b35" opacity="0.85" />
      <ellipse cx="-5" cy="-6" rx="9" ry="5" fill="#4a8040" opacity="0.8" />
      <ellipse cx="6" cy="-10" rx="10" ry="5.5" fill="#4a8040" opacity="0.75" />
      <ellipse cx="0" cy="-14" rx="8" ry="4.5" fill="#5a9a50" opacity="0.8" />
    </g>
  );
}
function RosalDeGraciaRose({ x, y, colorId }: { x: number; y: number; colorId: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g animate={{ rotate: [-0.5, 0.5, -0.5] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M0 0 Q0.3 -8 0 -16" fill="none" stroke="#2d6a30" strokeWidth="1.4" />
        <path d="M0 -4 Q-4 -7 -5 -4 Q-3 -2 0 -4Z" fill="#3d8b40" opacity="0.85" />
        <path d="M0 -10 Q5 -13 6 -10 Q3 -8 0 -10Z" fill="#4a9a4d" opacity="0.75" />
        <g transform={`translate(0, -16)`}>
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M0 -3 Q-2 -6 0 -8 Q2 -6 0 -3Z" fill={`url(#${colorId})`} opacity="0.9" transform={`rotate(${i * 45} 0 -3)`} />
          ))}
          <circle cx="0" cy="-3" r="1.6" fill="#c71585" />
        </g>
      </motion.g>
    </g>
  );
}

function Stem() {
  return <path d="M0 0 Q0.5 -16 0 -32" fill="none" stroke="#2d6a30" strokeWidth="2.4" strokeLinecap="round" />;
}
function Leaves() {
  return (
    <g>
      <path d="M0 -8 Q-9 -14 -11 -9 Q-6 -5 0 -8Z" fill="#3d8b40" />
      <path d="M0 -18 Q10 -22 12 -17 Q6 -13 0 -18Z" fill="#4a9a4d" />
      <path d="M0 -26 Q-8 -30 -10 -25 Q-5 -21 0 -26Z" fill="#3d8b40" />
    </g>
  );
}
function OuterRosePetals({ colorId }: { colorId: string }) {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d="M0 -32 Q-5 -40 -2 -47 Q2 -42 0 -32Z" fill={`url(#${colorId})`} opacity="0.88" transform={`rotate(${i * 45} 0 -32)`} />
      ))}
    </g>
  );
}
function MiddleRosePetals({ colorId }: { colorId: string }) {
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-36" rx="3.8" ry="7.5" fill={`url(#${colorId})`} opacity="0.95" transform={`rotate(${i * 60} 0 -36)`} />
      ))}
    </g>
  );
}
function InnerRosePetals({ colorId }: { colorId: string }) {
  return (
    <g>
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-39" rx="2.4" ry="5.5" fill="#ff69b4" opacity="0.95" transform={`rotate(${i * 72} 0 -39)`} />
      ))}
    </g>
  );
}
function RoseCenter() {
  return (
    <g>
      <circle cx="0" cy="-41" r="3.5" fill="#c71585" />
      <circle cx="0" cy="-41" r="1.8" fill="#ffb7c5" />
    </g>
  );
}

function WreathBase() {
  return <path d="M-9 2 Q0 -4 9 2" fill="none" stroke="#228b22" strokeWidth="1.8" opacity="0.7" />;
}
function WreathFlower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 4 }, (_, i) => (
        <ellipse key={i} cx="0" cy="0" rx="1.9" ry="3.8" fill={color} transform={`rotate(${i * 90} 0 0)`} />
      ))}
      <circle cx="0" cy="0" r="1.5" fill="#ffd700" />
    </g>
  );
}
function WreathLeaf({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="4" ry="2.2" fill="#3d8b40" transform="rotate(20)" />
    </g>
  );
}

function LilyStem() {
  return <path d="M0 0 Q0.5 -14 0 -30" fill="none" stroke="#2d6a30" strokeWidth="2.1" strokeLinecap="round" />;
}
function LilyLeaf() {
  return (
    <g>
      <path d="M0 -6 Q-7 -11 -9 -6 Q-4 -3 0 -6Z" fill="#3d8b40" />
      <path d="M0 -16 Q9 -20 11 -15 Q5 -11 0 -16Z" fill="#4a9a4d" />
    </g>
  );
}
function LilyPetals({ colorId }: { colorId: string }) {
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d="M0 -30 Q-3.5 -38 0 -45 Q3.5 -38 0 -30Z" fill={`url(#${colorId})`} opacity="0.95" transform={`rotate(${i * 60} 0 -30)`} />
      ))}
    </g>
  );
}
function LilyStamens() {
  return (
    <g>
      <line x1="0" y1="-30" x2="0" y2="-40" stroke="#daa520" strokeWidth="1.1" />
      <circle cx="0" cy="-41.5" r="1.4" fill="#ff8c00" />
      <circle cx="-1.4" cy="-39" r="0.9" fill="#ff8c00" />
      <circle cx="1.4" cy="-39" r="0.9" fill="#ff8c00" />
    </g>
  );
}

function IsometricPond({ pond, waterLevel, rawId }: { pond: { d: string; deepD: string; ripples: Array<{ x: number; y: number; rx: number; ry: number; delay: number }>; lilies: Array<{ x: number; y: number; scale: number }>; lotus: Array<{ x: number; y: number; scale: number; color: string }>; stones: Array<{ x: number; y: number; scale: number }>; koi: Array<{ x: number; y: number; length: number; angle: number; color: string; delay: number }> }; waterLevel: number; rawId: string }) {
  return (
    <motion.g
      initial={false}
      animate={{ opacity: [0.9, 0.98, 0.9] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d={pond.d} fill="url(#water-iso)" opacity="0.92" />
      <path d={pond.deepD} fill="url(#water-iso-deep)" />
      <path d={pond.d} fill="none" stroke="#a8e6cf" strokeWidth="1.6" opacity=".4" />

      {pond.stones.map((stone, i) => (
        <g key={`stone-${i}`} transform={`translate(${stone.x} ${stone.y}) scale(${stone.scale})`}>
          <path d="M0 0 Q4 -3 8 0 Q4 -5 0 0Z" fill="#8a8a7a" opacity="0.75" />
          <path d="M0 0 Q-3 -2 -6 0 Q-3 -4 0 0Z" fill="#6a6a5a" opacity="0.55" />
        </g>
      ))}
      {pond.lilies.map((lily, i) => (
        <g key={`lily-${i}`} transform={`translate(${lily.x} ${lily.y}) scale(${lily.scale})`}>
          <ellipse cx="0" cy="1.5" rx="6" ry="3.2" fill="#4a9a4a" opacity="0.95" />
          <path d="M-5.5 1.5 Q0 -2.5 5.5 1.5 Q3 5.5 -5.5 1.5Z" fill="#7ac87a" opacity="0.9" />
          <circle cx="0" cy="0.5" r="1.5" fill="#ffb7c5" opacity="0.95" />
        </g>
      ))}
      {pond.lotus.map((lotus, i) => (
        <g key={`lotus-${i}`} transform={`translate(${lotus.x} ${lotus.y}) scale(${lotus.scale})`}>
          <ellipse cx="0" cy="1" rx="7.5" ry="3.8" fill="#3d8b3d" opacity="0.95" />
          {Array.from({ length: 5 }, (_, p) => (
            <path
              key={p}
              d={`M0 1 Q${(p % 2 === 0 ? -1.2 : 1.2) * 3.5} ${-5 - p * 1.2} 0 ${-11 - p * 1.8} Q${(p % 2 === 0 ? 1.2 : -1.2) * 3.5} ${-5 - p * 1.2} 0 1Z`}
              fill={lotus.color}
              opacity="0.92"
              transform={`rotate(${p * 28} 0 1)`}
            />
          ))}
          <circle cx="0" cy="-13" r="2.2" fill="#ffd700" />
        </g>
      ))}
      {pond.koi.map((fish, i) => (
        <motion.g
          key={`koi-${i}`}
          transform={`translate(${fish.x} ${fish.y}) rotate(${fish.angle * 180 / Math.PI})`}
          animate={{ x: [0, 9, -7, 0], y: [0, -3, 4, 0] }}
          transition={{ duration: 14 + fish.delay, delay: fish.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d={`M${-fish.length / 2} 0 Q0 -3.5 ${fish.length / 2} 0 Q0 3.5 ${-fish.length / 2} 0Z`} fill={fish.color} opacity="0.75" />
          <path d={`M${fish.length / 2} 0 L${fish.length / 2 + 6} -2.5 L${fish.length / 2 + 6} 2.5 Z`} fill={fish.color} opacity="0.75" />
          <circle cx={`${-fish.length / 2 + 2.5}`} cy="-1" r="0.9" fill="#1a1a1a" />
        </motion.g>
      ))}
      {pond.ripples.map((ripple, i) => (
        <motion.ellipse
          key={`ripple-${i}`}
          cx={ripple.x}
          cy={ripple.y}
          rx={ripple.rx ?? 8}
          ry={ripple.ry ?? 4}
          fill="none"
          stroke="#e8efeb"
          strokeWidth="0.8"
          opacity="0.5"
          animate={{ rx: [(ripple.rx ?? 8), (ripple.rx ?? 8) * 1.4, (ripple.rx ?? 8)], ry: [(ripple.ry ?? 4), (ripple.ry ?? 4) * 1.4, (ripple.ry ?? 4)], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 6 + ripple.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </motion.g>
  );
}

function CedarTree({
  tree,
  justWatered,
  rawId,
  barkGradId,
}: {
  tree: { x: number; y: number; trunkHeight: number; canopyScale: number; branches: { d: string; width: number; depth: number }[]; cedarExtras?: { roots: { d: string; stroke: string; strokeWidth: number }[]; canopyLayers: { d: string; fill: string; highlight: string; opacity: number }[]; goldenPatches: { d: string; fill: string; opacity: number }[] } };
  justWatered?: boolean;
  rawId: string;
  barkGradId: string;
}) {
  const cedar = tree.cedarExtras;
  if (!cedar) return null;

  return (
    <motion.g
      transform={`translate(${tree.x} ${tree.y})`}
      animate={justWatered ? { scale: [1, 1.025, 1] } : { rotate: [-0.12, 0.18, -0.12] }}
      transition={{ duration: justWatered ? 1.2 : 10, repeat: justWatered ? 0 : Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: `${tree.x}px ${tree.y}px` }}
    >
      {cedar.roots.map((root, i) => (
        <path key={`root-${i}`} d={root.d} fill="none" stroke={root.stroke} strokeWidth={root.strokeWidth} strokeLinecap="round" opacity="0.88" />
      ))}
      <ellipse cx="0" cy="6" rx="22" ry="7.5" fill="rgba(40, 44, 24, 0.24)" />

      <g opacity="0.95">
        <path d={`M-10 0 Q-11 ${-tree.trunkHeight * 0.5} -9 ${-tree.trunkHeight} Q-8 ${-tree.trunkHeight * 0.5} -10 0`} fill={`url(#${barkGradId})`} />
        <path d={`M9 0 Q10 ${-tree.trunkHeight * 0.5} 8 ${-tree.trunkHeight} Q7 ${-tree.trunkHeight * 0.5} 9 0`} fill={`url(#${barkGradId})`} opacity="0.8" />
      </g>

      {tree.branches.map((branch, i) => (
        <path key={i} d={branch.d} fill="none" stroke={branch.depth % 2 ? "#5a5040" : "#6b5f4a"} strokeWidth={branch.width} strokeLinecap="round" opacity="0.72" />
      ))}

      {cedar.goldenPatches.map((patch, i) => (
        <motion.path
          key={`golden-${i}`}
          d={patch.d}
          fill={patch.fill}
          opacity={patch.opacity}
          animate={{ scale: [1, 1.04, 1], opacity: [patch.opacity, patch.opacity * 1.35, patch.opacity] }}
          transition={{ duration: 10 + i * 0.7, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${tree.x}px ${tree.y - tree.trunkHeight * 0.5}px` }}
        />
      ))}

      {cedar.canopyLayers.map((layer, i) => (
        <motion.path
          key={`canopy-${i}`}
          d={layer.d}
          fill={layer.fill}
          opacity={layer.opacity}
          animate={{ scale: [1, 1.012, 1] }}
          transition={{ duration: 9.5 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${tree.x}px ${tree.y - tree.trunkHeight}px` }}
        />
      ))}
      {cedar.canopyLayers.map((layer, i) => (
        <motion.path
          key={`hl-${i}`}
          d={layer.d}
          fill={layer.highlight}
          opacity="0.14"
          animate={{ scale: [1, 1.015, 1] }}
          transition={{ duration: 10 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${tree.x}px ${tree.y - tree.trunkHeight}px` }}
        />
      ))}
    </motion.g>
  );
}

function StonePlaque() {
  return (
    <g transform="translate(0, -6)">
      <path d="M-30 0 L30 0 L28 16 L-28 16 Z" fill="#a89e8a" stroke="#5a5040" strokeWidth="0.9" />
      <path d="M-30 0 L28 0 L27 2 L-29 2 Z" fill="#c4bca6" opacity="0.85" />
      <path d="M-28 16 L28 16 L27 18 L-29 18 Z" fill="#5a5040" opacity="0.5" />
      <text x="0" y="-10" textAnchor="middle" fontSize="5.8" fontFamily="Georgia, serif" fill="#3e3020" fontWeight="bold" letterSpacing="0.5">
        9212498CC5
      </text>
      <text x="0" y="-3" textAnchor="middle" fontSize="4.4" fontFamily="Georgia, serif" fill="#4a3c2c" opacity="0.95">
        Mediterráneo · Cedro
      </text>
    </g>
  );
}

function Robin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity="0.9">
      <motion.g
        animate={{ y: [0, -1.5, 0], rotate: [-1, 1, -1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="0" cy="0" rx="3.5" ry="2.2" fill="#8B4513" />
        <ellipse cx="2.2" cy="-0.6" rx="1.8" ry="1.4" fill="#ffffff" />
        <circle cx="-2.4" cy="-1.2" r="1.3" fill="#8B4513" />
        <circle cx="-2.6" cy="-1.3" r="0.4" fill="#1a1a1a" />
        <path d="M-3.8 -1.2 L-5.2 -0.8 L-3.8 -0.8 Z" fill="#FF8C00" />
        <path d="M0.5 1.5 L1.5 4 L-0.5 4 Z" fill="#8B4513" />
        <path d="M-0.5 1.5 L0.5 4 L-1.5 4 Z" fill="#6B3410" opacity="0.7" />
      </motion.g>
    </g>
  );
}

const Dove = memo(function Dove({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <motion.g
      transform={`translate(${x} ${y}) scale(${scale})`}
      animate={{ y: [0, -3, 0], rotate: [-2, 2, -2] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      <path d="M0 0 Q-6 -4 -10 -2 Q-6 2 0 0 Q6 2 10 -2 Q6 -4 0 0Z" fill="#ffffff" opacity="0.92" />
      <path d="M0 0 Q-2 -5 0 -7 Q2 -5 0 0Z" fill="#f8f8f8" opacity="0.9" />
      <circle cx="-2" cy="-3" r="0.5" fill="#1a1a1a" />
    </motion.g>
  );
});

const Deer = memo(function Deer({ x, y, scale, angle }: { x: number; y: number; scale: number; angle: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="8" ry="5" fill="#5a4a3a" opacity="0.85" />
      <ellipse cx="-9" cy="-2" rx="3" ry="2.5" fill="#5a4a3a" opacity="0.85" />
      <path d="M-10 -3 L-12 -8 L-11 -3Z" fill="#4a3a2a" opacity="0.8" />
      <path d="M-10 -3 L-8 -8 L-9 -3Z" fill="#4a3a2a" opacity="0.8" />
      <ellipse cx="7" cy="1" rx="3.5" ry="2" fill="#5a4a3a" opacity="0.7" />
      <line x1="-2" y1="4" x2="-3" y2="8" stroke="#4a3a2a" strokeWidth="1" opacity="0.7" />
      <line x1="2" y1="4" x2="1" y2="8" stroke="#4a3a2a" strokeWidth="1" opacity="0.7" />
    </g>
  );
});

const SacredNode = memo(function SacredNode({ x, y, type, scale }: { x: number; y: number; type: string; scale: number }) {
  if (type === "cross") {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.92">
        <line x1="0" y1="6" x2="0" y2="-6" stroke="#6b6b6b" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="-3.5" y1="-2" x2="3.5" y2="-2" stroke="#6b6b6b" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="0" cy="6" rx="3.5" ry="1.8" fill="#5a5a5a" opacity="0.6" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.88">
      <rect x="-4" y="-2" width="8" height="4" fill="#7a7a72" rx="1" />
      <rect x="-3.5" y="-3.5" width="7" height="1.5" fill="#8a8a82" rx="0.8" />
      <ellipse cx="0" cy="2" rx="5" ry="2" fill="#6a6a62" opacity="0.55" />
    </g>
  );
});

const GrottoArch = memo(function GrottoArch({ x, width, height, treeY, trunkHeight, pillarHang, vineCount, altarX, altarY, vineSeeds }: { x: number; width: number; height: number; treeY: number; trunkHeight: number; pillarHang: number; vineCount: number; altarX: number; altarY: number; vineSeeds: number[] }) {
  const baseY = treeY - trunkHeight * 0.35;
  const leftX = x - width;
  const rightX = x + width;
  const archBaseY = baseY - height;
  const vineRng = (seed: number) => {
    let a = seed | 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  return (
    <g transform={`translate(${x} ${baseY})`} opacity="0.92">
      <path d={`M ${-width} 0 Q ${-width} ${-height} 0 ${-height} Q ${width} ${-height} ${width} 0`} fill="none" stroke="#6b7a5a" strokeWidth="2.6" strokeLinecap="round" opacity="0.75" />
      <path d={`M ${-width + 3} 0 Q ${-width + 3} ${-height + 12} 0 ${-height + 12} Q ${width - 3} ${-height + 12} ${width - 3} 0`} fill="none" stroke="#4a5a3a" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />

      <line x1={-width + 6} y1={-height + 8} x2={-width + 6} y2={0} stroke="#6b7a5a" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1={width - 6} y1={-height + 8} x2={width - 6} y2={0} stroke="#6b7a5a" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

      <rect x={-width - 5} y={-2} width={10} height={4} fill="#6b7a5a" rx="1" opacity="0.6" />
      <rect x={width - 5} y={-2} width={10} height={4} fill="#6b7a5a" rx="1" opacity="0.6" />

      {vineSeeds.slice(0, vineCount).map((seed, i) => {
        const vr = vineRng(seed);
        const hangY = archBaseY + 6 + vr() * (height - 18);
        const vineX = -width + 12 + vr() * (width * 2 - 24);
        const vineLen = 6 + vr() * 12;
        return (
          <g key={`vine-${i}`} transform={`translate(${vineX} ${hangY})`}>
            <path d={`M0 0 Q${(vr() - 0.5) * 6} ${vineLen * 0.5} 0 ${vineLen}`} fill="none" stroke="#3d6b35" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
            <ellipse cx="0" cy={vineLen} rx="1.1" ry="2.2" fill="#4a8040" opacity="0.85" />
            <ellipse cx={(vr() - 0.5) * 3} cy={vineLen * 0.6} rx="0.9" ry="1.8" fill="#5a9a50" opacity="0.75" />
          </g>
        );
      })}

      <g transform={`translate(${altarX - x} ${altarY - baseY})`}>
        <rect x="-5" y="-3" width="10" height="4" fill="#7a7a72" rx="1" opacity="0.95" />
        <rect x="-4.5" y="-4.5" width="9" height="1.5" fill="#8a8a82" rx="0.8" opacity="0.95" />
        <ellipse cx="0" cy="1" rx="6" ry="2.5" fill="#6a6a62" opacity="0.6" />
      </g>

      <motion.path
        d={`M ${-width + 1} 0 Q ${-width + 1} ${-height + 6} 0 ${-height + 6} Q ${width - 1} ${-height + 6} ${width - 1} 0`}
        fill="none"
        stroke="#8a9a78"
        strokeWidth="0.9"
        opacity="0.5"
        animate={{ opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </g>
  );
});

const SacredNodePos = { x: 0, y: 0 };

const SacredGeometry = memo(function SacredGeometry({
  cx,
  cy,
  rx,
  ry,
  rotation,
  nodes,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number;
  nodes: Array<typeof SacredNodePos>;
}) {
  const pts: string[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const angle = rotation + (i / steps) * Math.PI * 2;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const path = pts.join(' ') + ' Z';

  return (
    <g opacity="0.28">
      <path d={path} fill="none" stroke="#b8c4a8" strokeWidth="0.8" />
      {nodes.map((node, i) => (
        <circle key={i} cx={node.x} cy={node.y} r="1.6" fill="#c8d4b8" opacity="0.8" />
      ))}
    </g>
  );
});

export function GardenSignatureGlyph({ signature }: { signature: GardenSignature }) {
  if (signature.kind === "star") {
    return <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3Z" fill={`hsl(${signature.hue} 35% 55%)`} />;
  }
  if (signature.kind === "flower") {
    return (
      <g transform={`rotate(${signature.angle})`}>
        {Array.from({ length: signature.petals }, (_, i) => (
          <ellipse key={i} cy="-7" rx="3.2" ry="7.5" fill={`hsl(${signature.hue} 30% 62%)`} transform={`translate(0, -7) rotate(${(360 / signature.petals) * i})`} />
        ))}
        <circle cx="0" cy="0" r="2.8" fill="#c4a35a" />
      </g>
    );
  }
  if (signature.kind === "branch") {
    return (
      <g transform={`rotate(${signature.angle})`}>
        <path d="M-10 8 Q0 0 10 -9" fill="none" stroke={`hsl(${signature.hue} 28% 42%)`} strokeWidth="2" />
        <ellipse cx="-2" cy="1" rx="5" ry="2.5" fill={`hsl(${signature.hue} 28% 52%)`} transform="rotate(25)" />
        <ellipse cx="5" cy="-5" rx="5" ry="2.5" fill={`hsl(${signature.hue} 28% 58%)`} transform="rotate(-25)" />
      </g>
    );
  }
  return <path d="M-9 5 Q0 -12 10 -5 Q3 10 -9 5Z" fill={`hsl(${signature.hue} 28% 52%)`} transform={`rotate(${signature.angle})`} />;
}
