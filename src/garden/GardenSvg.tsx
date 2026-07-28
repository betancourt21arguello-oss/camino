/* ============================================================================
 * src/garden/GardenSvg.tsx — Jardín vivo
 * · Árbol fractal recursivo
 * · Flores paramétricas (pétalos <path> + corazón de Fibonacci)
 * · Pasto y arbustos generativos (cientos de briznas finas)
 * · Brisa (rotate escalonado), latido de luz (opacity), vuelo (<animateMotion>)
 * ==========================================================================*/
import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateGardenModel, VIEW_W, VIEW_H, GROUND_CY } from "./model";
import type {
  GardenModel, PondModel, RiverModel, PlacedFlower,
  StoneShrine, CandleModel, MarianArch,
} from "./model";
import type { FractalTree } from "./fractal";
import type { GrassTuft, ShrubModel, ParametricFlower } from "./flowers";
import { signatureFromDna } from "./dna";
import { timePalette } from "./time";
import { derivePersonalTraits, defaultPersonalTraits, type PersonalTraits, type PersonalInput } from "./personal";
import { createPrng, rnd, clamp } from "./prng";
import type { DnaTraits, GardenState, GardenSignature, TimePalette } from "./types";

interface Props {
  dna: DnaTraits;
  state: GardenState;
  justWatered?: boolean;
  /** Datos del usuario que personalizan la geometría */
  personal?: PersonalInput;
}

const hsl = (h: number, s: number, l: number, a = 1) =>
  a === 1 ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${a})`;

/* ══ CIELO ══════════════════════════════════════════════════════════════ */
const SkyLayer = memo(function SkyLayer({ tp, dnaStr }: { tp: TimePalette; dnaStr: string }) {
  const p = createPrng(dnaStr + "::sky");
  const stars = tp.starOpacity > 0
    ? Array.from({ length: 20 }, (_, i) => ({
        x: rnd(p, 16, VIEW_W - 16), y: rnd(p, 14, 195),
        r: rnd(p, 0.6, 1.5), delay: (i % 7) * 0.5,
      }))
    : [];
  const clouds = Array.from({ length: 2 }, (_, i) => ({
    x: rnd(p, 40, VIEW_W - 200), y: rnd(p, 40, 108),
    s: rnd(p, 0.8, 1.3), dur: rnd(p, 95, 145), op: rnd(p, 0.12, 0.26), delay: i * 6,
  }));

  return (
    <g>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#g-sky)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={0}>
          <animate attributeName="opacity"
            values={`${tp.starOpacity * 0.2};${tp.starOpacity * 0.95};${tp.starOpacity * 0.2}`}
            dur="3.6s" begin={`${s.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle cx={VIEW_W * tp.sunX} cy={VIEW_H * tp.sunY * 0.55} r={30} fill="url(#g-sun)" />
      {tp.id === "noche" && (
        <circle cx={VIEW_W * tp.sunX} cy={VIEW_H * tp.sunY * 0.55} r={11} fill="rgb(232 238 255 / 0.92)" />
      )}
      {clouds.map((c, i) => (
        <motion.g key={i} opacity={c.op}
          animate={{ x: [c.x, c.x + 52, c.x] }}
          transition={{ duration: c.dur, repeat: Infinity, ease: "easeInOut", delay: c.delay }}>
          <ellipse cy={c.y} rx={38 * c.s} ry={11 * c.s} fill="white" />
          <ellipse cx={24 * c.s} cy={c.y - 5 * c.s} rx={26 * c.s} ry={9 * c.s} fill="white" />
        </motion.g>
      ))}
      <rect y={GROUND_CY - 120} width={VIEW_W} height={160} fill="url(#g-fog)" opacity={tp.fogOpacity} />
    </g>
  );
});

/* ══ ÁRBOL FRACTAL ══════════════════════════════════════════════════════ */
const FractalTreeLayer = memo(function FractalTreeLayer({
  tree, trunkFill, wind,
}: { tree: FractalTree; trunkFill: string; wind: number }) {
  return (
    <g>
      {/* Raíces */}
      {tree.roots.map((r, i) => (
        <path key={`rt-${i}`} d={r.d} stroke={trunkFill} strokeWidth={r.width}
          fill="none" strokeLinecap="round" opacity={0.78} />
      ))}

      {/* Ramas: cada nivel oscila un poco más y con retardo → brisa realista */}
      {tree.branches.map((b, i) => {
        const amp = b.windAmp * wind;
        const dur = 4.6 + b.depth * 0.55;
        return (
          <g key={`br-${i}`}>
            <path d={b.d}
              stroke={trunkFill}
              strokeWidth={Math.max(0.4, b.width)}
              strokeLinecap="round" fill="none"
              opacity={b.depth === 0 ? 1 : 0.94}>
              {amp > 0.15 && (
                <animateTransform attributeName="transform" type="rotate"
                  values={`${-amp} ${b.x1} ${b.y1};${amp} ${b.x1} ${b.y1};${-amp} ${b.x1} ${b.y1}`}
                  dur={`${dur}s`} begin={`${b.windDelay}s`}
                  repeatCount="indefinite" calcMode="spline"
                  keySplines="0.42 0 0.58 1;0.42 0 0.58 1" keyTimes="0;0.5;1" />
              )}
            </path>
          </g>
        );
      })}

      {/* Follaje */}
      {tree.leaves.map((l, i) => (
        <ellipse key={`lf-${i}`}
          cx={l.x} cy={l.y}
          rx={l.rx * l.scale} ry={l.ry * l.scale}
          fill={hsl(l.hue, l.sat, l.lig)}
          transform={`rotate(${l.angle} ${l.x} ${l.y})`}
          opacity={0.92}>
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            values={`${-2.4 * wind} ${l.x} ${l.y};${2.4 * wind} ${l.x} ${l.y};${-2.4 * wind} ${l.x} ${l.y}`}
            dur={`${3.4 + (i % 5) * 0.4}s`} begin={`${l.windDelay}s`}
            repeatCount="indefinite" calcMode="spline"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1" keyTimes="0;0.5;1" />
        </ellipse>
      ))}

      {/* Rosas del árbol (una cada 8 Rosarios) */}
      {tree.fruits.map((f, i) => (
        <g key={`fr-${i}`}>
          <circle cx={f.x} cy={f.y} r={Math.max(0.01, f.r)} fill={hsl(f.hue, 66, 58)} />
          <circle cx={f.x} cy={f.y} r={Math.max(0.01, f.r * 0.5)} fill={hsl(f.hue + 8, 74, 74)}>
            <animate attributeName="opacity" values="0.7;1;0.7"
              dur="3.4s" begin={`${f.delay}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </g>
  );
});

/* ══ FLOR PARAMÉTRICA ═══════════════════════════════════════════════════ */
const FlowerShape = memo(function FlowerShape({
  f, x, y, wind, delay, mature,
}: { f: ParametricFlower; x: number; y: number; wind: number; delay: number; mature: boolean }) {
  const headY = -f.stemLength;
  const headX = Math.sin((f.stemLean * Math.PI) / 180) * f.stemLength;
  const sway = 2.6 * wind;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: delay * 0.25, ease: "backOut" }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      <g transform={`translate(${x} ${y})`}>
        {/* El grupo completo se mece desde la base del tallo */}
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values={`${-sway} 0 0;${sway} 0 0;${-sway} 0 0`}
            dur={`${4.2 + delay * 0.6}s`} begin={`${delay}s`}
            repeatCount="indefinite" calcMode="spline"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1" keyTimes="0;0.5;1" />

          {/* Tallo */}
          <path d={f.stemD} stroke={hsl(122, 36, 30)} strokeWidth={1.5} fill="none" strokeLinecap="round" />

          {/* Hojas del tallo */}
          {f.leaves.map((lf, i) => (
            <path key={i} d={lf.d} fill={hsl(lf.hue, 40, 34)} opacity={0.92}>
              <animateTransform attributeName="transform" type="rotate" additive="sum"
                values="-3;3;-3" dur={`${3.6 + i * 0.5}s`} begin={`${lf.delay}s`}
                repeatCount="indefinite" calcMode="spline"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1" keyTimes="0;0.5;1" />
            </path>
          ))}

          {/* Corola */}
          <g transform={`translate(${headX} ${headY})`}>
            {/* Halo de latido para las consolidadas */}
            {mature && (
              <circle r={Math.max(0.01, f.radius * 1.5)} fill="url(#g-sacred)" opacity={0.3}>
                <animate attributeName="opacity" values="0.16;0.46;0.16"
                  dur={`${f.pulseDur}s`} begin={`${f.pulseDelay}s`} repeatCount="indefinite" />
              </circle>
            )}

            {/* Pétalos, de la capa exterior a la interior */}
            {f.petals.map((pt, i) => (
              <path key={i} d={pt.d}
                fill={hsl(pt.hue, pt.sat, pt.lig)}
                opacity={pt.opacity}
                transform={`rotate(${pt.rotate})`}
                stroke={hsl(pt.hue, pt.sat - 12, pt.lig - 16, 0.35)}
                strokeWidth={0.3}>
                {/* Latido sutil: la flor "respira" */}
                <animate attributeName="opacity"
                  values={`${pt.opacity};${Math.min(1, pt.opacity + 0.1)};${pt.opacity}`}
                  dur={`${f.pulseDur}s`} begin={`${f.pulseDelay + pt.delay}s`}
                  repeatCount="indefinite" />
              </path>
            ))}

            {/* Corazón */}
            <circle r={Math.max(0.01, f.radius * 0.24)} fill={f.coreOuter} />
            {/* Semillas en espiral de Fibonacci (137.507°) */}
            {f.seeds.map((sd, i) => (
              <circle key={i} cx={sd.x} cy={sd.y} r={Math.max(0.01, sd.r)}
                fill={hsl(f.coreHue - sd.t * 26, 62 - sd.t * 16, 26 + sd.t * 30)}
                opacity={0.9} />
            ))}
            {f.seeds.length === 0 && <circle r={Math.max(0.01, f.radius * 0.13)} fill={f.coreInner} />}
          </g>
        </g>
      </g>
    </motion.g>
  );
});

/* ══ PASTO GENERATIVO ═══════════════════════════════════════════════════ */
const GrassLayer = memo(function GrassLayer({ tufts, wind }: { tufts: GrassTuft[]; wind: number }) {
  return (
    <g>
      {tufts.map((t, ti) => (
        <g key={`tf-${ti}`}>
          {t.blades.map((b, bi) => (
            <path key={bi} d={b.d}
              stroke={hsl(b.hue, b.sat, b.lig)}
              strokeWidth={b.width} fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate"
                values={`${-b.amp * wind} ${t.x} ${t.y};${b.amp * wind} ${t.x} ${t.y};${-b.amp * wind} ${t.x} ${t.y}`}
                dur={`${3 + (bi % 4) * 0.55}s`} begin={`${b.delay}s`}
                repeatCount="indefinite" calcMode="spline"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1" keyTimes="0;0.5;1" />
            </path>
          ))}
        </g>
      ))}
    </g>
  );
});

const ShrubLayer = memo(function ShrubLayer({ shrubs, wind }: { shrubs: ShrubModel[]; wind: number }) {
  return (
    <g>
      {shrubs.map((sh, si) => (
        <g key={`sh-${si}`}>
          {/* Masa base */}
          <ellipse cx={sh.x} cy={sh.y - sh.ry * 0.42} rx={sh.rx} ry={sh.ry * 0.72}
            fill={hsl(sh.hue, 30, 24)} opacity={0.7} />
          {sh.blades.map((b, bi) => (
            <path key={bi} d={b.d} stroke={hsl(b.hue, b.sat, b.lig)}
              strokeWidth={b.width} fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate"
                values={`${-b.amp * wind} ${sh.x} ${sh.y};${b.amp * wind} ${sh.x} ${sh.y};${-b.amp * wind} ${sh.x} ${sh.y}`}
                dur={`${3.4 + (bi % 5) * 0.4}s`} begin={`${b.delay}s`}
                repeatCount="indefinite" calcMode="spline"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1" keyTimes="0;0.5;1" />
            </path>
          ))}
          {sh.berries.map((be, i) => (
            <circle key={i} cx={be.x} cy={be.y} r={Math.max(0.01, be.r)} fill={hsl(be.hue, 70, 54)}>
              <animate attributeName="opacity" values="0.8;1;0.8"
                dur="4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      ))}
    </g>
  );
});

/* ══ AGUA ═══════════════════════════════════════════════════════════════ */
const WaterLayer = memo(function WaterLayer({ pond, river }: { pond: PondModel; river: RiverModel }) {
  return (
    <g>
      {river.visible && (
        <g>
          <path d={river.d} fill="none" stroke="url(#g-water)" strokeWidth={river.width} strokeLinecap="round" />
          <path d={river.d} fill="none" stroke="rgb(255 255 255 / 0.34)" strokeWidth={1}
            strokeLinecap="round" strokeDasharray="12 26">
            <animate attributeName="stroke-dashoffset" values="0;-76" dur="6s" repeatCount="indefinite" />
          </path>
        </g>
      )}
      {pond.visible && (
        <g>
          <ellipse cx={pond.cx} cy={pond.cy} rx={pond.rx + 4} ry={pond.ry + 2.5} fill="rgb(88 78 54 / 0.24)" />
          <ellipse cx={pond.cx} cy={pond.cy} rx={pond.rx} ry={pond.ry} fill="url(#g-pond)" />
          <ellipse cx={pond.cx} cy={pond.cy} rx={pond.rx * 0.3} ry={pond.ry * 0.3}
            fill="none" stroke="rgb(255 255 255 / 0.4)" strokeWidth={0.9}>
            <animate attributeName="rx" values={`${pond.rx * 0.3};${pond.rx * 0.9}`} dur="4s" repeatCount="indefinite" />
            <animate attributeName="ry" values={`${pond.ry * 0.3};${pond.ry * 0.9}`} dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.45;0" dur="4s" repeatCount="indefinite" />
          </ellipse>
          {pond.koi.map((k, i) => (
            <motion.ellipse key={i} cx={k.x} cy={k.y} rx={5.4} ry={2.3} fill={hsl(k.hue, 80, 58)} opacity={0.88}
              animate={{ x: [0, pond.rx * 0.4, 0, -pond.rx * 0.4, 0], y: [0, pond.ry * 0.3, 0, -pond.ry * 0.3, 0] }}
              transition={{ duration: k.dur, repeat: Infinity, ease: "easeInOut", delay: k.delay }} />
          ))}
          {pond.lilies.map((l, i) => (
            <motion.ellipse key={i} cx={l.x} cy={l.y} rx={l.r} ry={l.r * 0.42}
              fill={hsl(128, 40, 33)} opacity={0.9} transform={`rotate(${l.rot} ${l.x} ${l.y})`}
              animate={{ y: [0, -1.2, 0] }}
              transition={{ duration: 4.5 + i * 0.6, repeat: Infinity, ease: "easeInOut" }} />
          ))}
        </g>
      )}
    </g>
  );
});

/* ══ SANTUARIO MARIANO ══════════════════════════════════════════════════ */
const MarianArchShape = memo(function MarianArchShape({ a }: { a: MarianArch }) {
  const s = a.scale, W = 62 * s, H = 84 * s;
  const arch = `M ${a.x - W} ${a.y} L ${a.x - W} ${a.y - H * 0.45}
                A ${W} ${H * 0.55} 0 0 1 ${a.x + W} ${a.y - H * 0.45} L ${a.x + W} ${a.y}`;
  return (
    <motion.g initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: `${a.x}px ${a.y}px` }}>
      <path d={arch} fill="none" stroke={hsl(124, 30, 25)} strokeWidth={4 * s} strokeLinecap="round" />
      <path d={arch} fill="none" stroke={hsl(126, 38, 36)} strokeWidth={1.6 * s}
        strokeLinecap="round" strokeDasharray="5 9" />
      {Array.from({ length: a.roseCount }, (_, i) => {
        const t = i / (a.roseCount - 1);
        const ang = Math.PI - t * Math.PI;
        const rx = a.x + Math.cos(ang) * W;
        const ry = a.y - H * 0.45 - Math.sin(ang) * H * 0.55;
        return (
          <motion.g key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ duration: 0.45, delay: 0.8 + i * 0.07, ease: "backOut" }}
            style={{ transformOrigin: `${rx}px ${ry}px` }}>
            <circle cx={rx} cy={ry} r={Math.max(0.01, 3.4 * s)} fill={hsl(a.hue, 62, 58)} />
            <circle cx={rx} cy={ry} r={Math.max(0.01, 1.9 * s)} fill={hsl(a.hue + 8, 72, 76)} />
          </motion.g>
        );
      })}
      <ellipse cx={a.x} cy={a.y - H * 0.42} rx={W * 0.66} ry={H * 0.42} fill="url(#g-sacred)">
        <animate attributeName="opacity" values="0.2;0.48;0.2" dur="6s" repeatCount="indefinite" />
      </ellipse>
    </motion.g>
  );
});

/* ══ PIEDRA FUNDAMENTAL ═════════════════════════════════════════════════ */
const ShrineShape = memo(function ShrineShape({ sh }: { sh: StoneShrine }) {
  const s = sh.scale, stone = "rgb(198 192 178)", dark = "rgb(158 152 138)";
  return (
    <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}>
      {sh.kind === "celtic_cross" && (
        <g transform={`translate(${sh.x} ${sh.y}) scale(${s})`}>
          <ellipse cy={2} rx={11} ry={3.5} fill={dark} />
          <rect x={-3.2} y={-30} width={6.4} height={32} rx={1.4} fill={stone} />
          <rect x={-12} y={-24} width={24} height={5.6} rx={1.4} fill={stone} />
          <circle cy={-21.2} r={9} fill="none" stroke={stone} strokeWidth={3} />
          <circle cy={-21.2} r={9} fill="none" stroke={dark} strokeWidth={0.7} />
        </g>
      )}
      {sh.kind === "cairn_altar" && (
        <g transform={`translate(${sh.x} ${sh.y}) scale(${s})`}>
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} cx={i % 2 ? 1.6 : -1.6} cy={-i * 6.5}
              rx={12 - i * 2.4} ry={4 - i * 0.5} fill={i % 2 ? stone : dark} />
          ))}
          <line y1={-28} y2={-38} stroke="rgb(212 175 106)" strokeWidth={1.8} strokeLinecap="round" />
          <line x1={-4} y1={-34} x2={4} y2={-34} stroke="rgb(212 175 106)" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      )}
      {sh.kind === "stone_altar" && (
        <g transform={`translate(${sh.x} ${sh.y}) scale(${s})`}>
          <rect x={-8} y={-6} width={16} height={7} rx={1.2} fill={dark} />
          <rect x={-14} y={-13} width={28} height={8} rx={1.6} fill={stone} />
          <rect x={-13} y={-13.5} width={26} height={1.6} rx={0.8} fill="rgb(230 226 214)" />
          <line y1={-14} y2={-26} stroke="rgb(212 175 106)" strokeWidth={1.8} strokeLinecap="round" />
          <line x1={-4.5} y1={-22} x2={4.5} y2={-22} stroke="rgb(212 175 106)" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      )}
      {sh.kind === "standing_stone" && (
        <g transform={`translate(${sh.x} ${sh.y}) scale(${s})`}>
          <ellipse cy={2} rx={10} ry={3.4} fill={dark} />
          <path d="M -7 2 L -5.4 -26 Q 0 -31 5.4 -26 L 7 2 Z" fill={stone} />
          <path d="M -1.4 -24 L -1.4 -6 M -6 -18 L 3.4 -18" stroke={dark} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
      <circle cx={sh.x} cy={sh.y - 18 * s} r={Math.max(0.01, 26 * s)} fill="url(#g-sacred)">
        <animate attributeName="opacity" values="0.16;0.38;0.16" dur="6s" repeatCount="indefinite" />
      </circle>
    </motion.g>
  );
});

/* ══ VELAS ══════════════════════════════════════════════════════════════ */
const Candles = memo(function Candles({ candles, glow }: { candles: CandleModel[]; glow: number }) {
  return (
    <g>
      {candles.map((c, i) => {
        const s = c.scale;
        return (
          <motion.g key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 + c.delay }}>
            <ellipse cx={c.x} cy={c.y - 4 * s} rx={34 * s * (0.4 + glow)} ry={20 * s * (0.4 + glow)}
              fill="url(#g-candle)" opacity={glow}>
              <animate attributeName="opacity" values={`${glow * 0.68};${glow};${glow * 0.68}`}
                dur="2.6s" begin={`${c.delay}s`} repeatCount="indefinite" />
            </ellipse>
            <rect x={c.x - 1.7 * s} y={c.y - 13 * s} width={3.4 * s} height={13 * s} rx={1.4 * s} fill="rgb(250 246 234)" />
            <rect x={c.x - 1.7 * s} y={c.y - 13 * s} width={1.3 * s} height={13 * s} rx={0.7 * s} fill="rgb(228 222 206)" />
            <line x1={c.x} y1={c.y - 13 * s} x2={c.x} y2={c.y - 15 * s} stroke="rgb(60 50 36)" strokeWidth={0.7} />
            <ellipse cx={c.x} cy={c.y - 17.5 * s} rx={1.9 * s} ry={3.6 * s} fill={hsl(40, 96, 66)}>
              <animate attributeName="ry" values={`${3.6 * s};${4.7 * s};${3.3 * s};${3.6 * s}`}
                dur="1.1s" begin={`${i * 0.17}s`} repeatCount="indefinite" />
            </ellipse>
            <ellipse cx={c.x} cy={c.y - 16.6 * s} rx={0.9 * s} ry={1.8 * s} fill={hsl(52, 100, 88)}>
              <animate attributeName="ry" values={`${1.8 * s};${2.4 * s};${1.8 * s}`}
                dur="1.1s" begin={`${i * 0.17}s`} repeatCount="indefinite" />
            </ellipse>
          </motion.g>
        );
      })}
    </g>
  );
});

/* ══ FAUNA CON TRAYECTORIAS <animateMotion> ═════════════════════════════ */
const Fauna = memo(function Fauna({ m }: { m: GardenModel }) {
  return (
    <g>
      {/* Ciervo bebiendo (Salmo 42) */}
      {m.deer && (
        <motion.g initial={{ opacity: 0, x: -10 }} animate={{ opacity: 0.94, x: 0 }}
          transition={{ duration: 1.4, delay: 1 }}
          transform={`translate(${m.deer.x} ${m.deer.y}) scale(${m.deer.facing * m.deer.scale} ${m.deer.scale})`}>
          <ellipse cy={-13} rx={11} ry={6} fill="rgb(112 84 58)" />
          {[-7, -2.6, 3.4, 7.6].map((lx, i) => (
            <rect key={i} x={lx} y={-8} width={2.2} height={9} rx={1} fill="rgb(96 72 50)" />
          ))}
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values={m.deer.drinking ? "0 10 -18;26 10 -18;26 10 -18;0 10 -18" : "0 10 -18;-6 10 -18;0 10 -18"}
              dur={m.deer.drinking ? "7s" : "5s"} repeatCount="indefinite" />
            <ellipse cx={12} cy={-20} rx={4.6} ry={3.2} fill="rgb(118 90 62)" />
            <path d="M 14 -23 l 2.6 -6 M 16.6 -29 l -2 2.2 M 16.6 -29 l 2.2 1.4"
              stroke="rgb(84 64 44)" strokeWidth={1.1} fill="none" strokeLinecap="round" />
            <path d="M 10 -23 l 1.4 -5 M 11.4 -28 l -2 1.8"
              stroke="rgb(84 64 44)" strokeWidth={1} fill="none" strokeLinecap="round" />
            <circle cx={14.6} cy={-20.6} r={0.7} fill="rgb(18 12 8)" />
          </g>
        </motion.g>
      )}

      {/* Aves — vuelo por trayectoria */}
      {m.birds.map((b, i) => (
        <g key={`bd-${i}`}>
          <g transform={`scale(${b.scale})`}>
            {b.isDove && (
              <circle r={17} fill="url(#g-sacred)">
                <animate attributeName="opacity" values="0.18;0.55;0.18" dur="3.4s" repeatCount="indefinite" />
              </circle>
            )}
            <ellipse rx={b.isDove ? 11 : 7} ry={b.isDove ? 5.5 : 3.6}
              fill={b.isDove ? "rgb(252 252 255)" : "rgb(94 78 62)"} />
            <path d={b.isDove ? "M -10 -2 Q -19 -13 -6 -9 Z" : "M -6 -1 Q -13 -9 -3 -6 Z"}
              fill={b.isDove ? "white" : "rgb(78 64 50)"}>
              <animateTransform attributeName="transform" type="rotate"
                values="0 -7 -3;24 -7 -3;0 -7 -3;-24 -7 -3;0 -7 -3" dur="0.5s" repeatCount="indefinite" />
            </path>
            <path d={b.isDove ? "M 10 -2 Q 19 -13 6 -9 Z" : "M 6 -1 Q 13 -9 3 -6 Z"}
              fill={b.isDove ? "rgb(246 248 252)" : "rgb(86 70 56)"}>
              <animateTransform attributeName="transform" type="rotate"
                values="0 7 -3;-24 7 -3;0 7 -3;24 7 -3;0 7 -3" dur="0.5s" begin="0.07s" repeatCount="indefinite" />
            </path>
            <circle cx={b.isDove ? 9 : 6} cy={-2} r={b.isDove ? 2.4 : 1.8}
              fill={b.isDove ? "rgb(253 253 255)" : "rgb(102 84 66)"} />
            <circle cx={b.isDove ? 10.2 : 6.8} cy={-2.4} r={0.6} fill="rgb(34 30 26)" />
          </g>
          <animateMotion dur={`${b.dur}s`} begin={`${b.begin}s`}
            repeatCount="indefinite" rotate="0" path={b.path} />
        </g>
      ))}

      {/* Mariposas / abejas — vuelo por trayectoria invisible */}
      {m.flyers.map((f, i) => (
        <g key={`fy-${i}`}>
          <g transform={`scale(${f.scale})`}>
            {f.kind === "bee" ? (
              <>
                <ellipse rx={4.4} ry={3} fill={hsl(46, 92, 58)} />
                <rect x={-3} y={-3} width={1.6} height={6} fill="rgb(40 34 20)" />
                <rect x={0.6} y={-3} width={1.6} height={6} fill="rgb(40 34 20)" />
                <ellipse cx={-1.5} cy={-4} rx={4} ry={2.4} fill="rgb(240 246 255 / 0.62)">
                  <animateTransform attributeName="transform" type="scale"
                    values="1 1;1 0.25;1 1" dur="0.11s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx={2.5} cy={-4} rx={4} ry={2.4} fill="rgb(240 246 255 / 0.62)">
                  <animateTransform attributeName="transform" type="scale"
                    values="1 1;1 0.25;1 1" dur="0.11s" begin="0.03s" repeatCount="indefinite" />
                </ellipse>
              </>
            ) : (
              <>
                <ellipse cx={-6.5} cy={-1} rx={8} ry={5.6} fill={hsl(f.hue, 66, 70)} opacity={0.88}>
                  <animateTransform attributeName="transform" type="scale"
                    values="1 1;0.22 1.1;1 1" dur="0.3s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx={6.5} cy={-1} rx={8} ry={5.6} fill={hsl(f.hue + 24, 66, 70)} opacity={0.88}>
                  <animateTransform attributeName="transform" type="scale"
                    values="1 1;0.22 1.1;1 1" dur="0.3s" repeatCount="indefinite" />
                </ellipse>
                <ellipse rx={1.2} ry={4.4} fill={hsl(f.hue, 24, 28)} />
                <path d="M 0 -4 l -3.4 -4.4 M 0 -4 l 3.4 -4.4"
                  stroke={hsl(f.hue, 24, 32)} strokeWidth={0.7} fill="none" />
              </>
            )}
          </g>
          <animateMotion dur={`${f.dur}s`} begin={`${f.begin}s`}
            repeatCount="indefinite" rotate="auto" path={f.path} />
        </g>
      ))}

      {/* Luciérnagas — vuelo + parpadeo */}
      {m.fireflies.map((f, i) => (
        <g key={`ff-${i}`}>
          <circle r={8} fill={hsl(54, 100, 74, 0.22)}>
            <animate attributeName="opacity" values="0;0.65;0" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
            <animate attributeName="r" values="8;13;8" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
          <circle r={2.2} fill={hsl(54, 100, 80)}>
            <animate attributeName="opacity" values="0;1;0" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
          <animateMotion dur={`${f.dur}s`} begin={`${f.begin}s`} repeatCount="indefinite" path={f.path} />
        </g>
      ))}

      {/* Polen */}
      {m.particles.map((p, i) => (
        <motion.circle key={`pt-${i}`} cx={p.x} cy={p.y} r={Math.max(0.01, p.r)} fill="rgb(255 244 200 / 0.75)"
          animate={{ y: [0, -22, 0], x: [0, 12, 0], opacity: [0, 0.65, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }} />
      ))}
    </g>
  );
});

/* ══ EFÍMEROS DE 24 h ═══════════════════════════════════════════════════ */
const EphemeralLayer = memo(function EphemeralLayer({
  m, ratio, dewActive, wind,
}: { m: GardenModel; ratio: number; dewActive: boolean; wind: number }) {
  return (
    <g>
      {m.sprouts.map((sp, i) => (
        <motion.g key={`sp-${i}`}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 0.45 + ratio * 0.55, scaleY: 1 }}
          transition={{ duration: 0.6, delay: sp.delay, ease: "backOut" }}
          style={{ transformOrigin: `${sp.x}px ${sp.y}px` }}>
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values={`${-3 * wind} ${sp.x} ${sp.y};${3 * wind} ${sp.x} ${sp.y};${-3 * wind} ${sp.x} ${sp.y}`}
              dur={`${3.2 + i * 0.3}s`} repeatCount="indefinite" calcMode="spline"
              keySplines="0.42 0 0.58 1;0.42 0 0.58 1" keyTimes="0;0.5;1" />
            <line x1={sp.x} y1={sp.y} x2={sp.x + sp.lean * 0.3} y2={sp.y - sp.h}
              stroke={hsl(96, 68, 46)} strokeWidth={1.5} strokeLinecap="round" />
            <ellipse cx={sp.x + sp.lean * 0.3 - 3.2} cy={sp.y - sp.h + 1} rx={3.4} ry={2}
              fill={hsl(98, 72, 54)}
              transform={`rotate(-28 ${sp.x + sp.lean * 0.3 - 3.2} ${sp.y - sp.h + 1})`} />
            <ellipse cx={sp.x + sp.lean * 0.3 + 3.2} cy={sp.y - sp.h + 1} rx={3.4} ry={2}
              fill={hsl(102, 74, 60)}
              transform={`rotate(28 ${sp.x + sp.lean * 0.3 + 3.2} ${sp.y - sp.h + 1})`} />
          </g>
        </motion.g>
      ))}

      {/* Flor efímera paramétrica sobre el sendero */}
      {m.ephemeralBloom && (
        <g opacity={0.55 + ratio * 0.45}>
          <FlowerShape f={m.ephemeralBloom.flower}
            x={m.ephemeralBloom.x} y={m.ephemeralBloom.y}
            wind={wind} delay={0.4} mature />
        </g>
      )}

      {dewActive && m.dewPoints.map((d, i) => (
        <circle key={`dw-${i}`} cx={d.x} cy={d.y} r={Math.max(0.01, d.r)} fill="rgb(196 230 255 / 0.9)">
          <animate attributeName="opacity" values="0;0.9;0" dur="2.8s"
            begin={`${d.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
});

/* ══ FIRMA ══════════════════════════════════════════════════════════════ */
const SignatureBlock = memo(function SignatureBlock({
  sig, levelTitle, summary,
}: { sig: GardenSignature; levelTitle: string; summary: string }) {
  const x = VIEW_W - 130, y = VIEW_H - 46;
  return (
    <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 1.1 }}>
      <rect x={x - 4} y={y - 6} width={122} height={40} rx={5}
        fill="rgb(46 42 34 / 0.5)" stroke="rgb(212 175 106 / 0.24)" strokeWidth={0.7} />
      <g transform={`translate(${x + 12} ${y + 12}) rotate(${sig.angle})`}>
        {sig.kind === "cross" && (
          <g stroke={hsl(sig.hue, 62, 70)} strokeWidth={1.5} strokeLinecap="round">
            <line y1={-7} y2={7} /><line x1={-4.5} y1={-2} x2={4.5} y2={-2} />
          </g>
        )}
        {sig.kind === "star" && Array.from({ length: sig.petals }, (_, i) => {
          const a = (i / sig.petals) * Math.PI * 2 - Math.PI / 2;
          return <line key={i} x2={Math.cos(a) * 6.6} y2={Math.sin(a) * 6.6}
            stroke={hsl(sig.hue, 66, 72)} strokeWidth={1.2} strokeLinecap="round" />;
        })}
        {sig.kind === "leaf" && <path d="M 0 7 Q -6 0 0 -7 Q 6 0 0 7 Z" fill={hsl(sig.hue, 50, 60)} />}
        {sig.kind === "chalice" && (
          <g fill="none" stroke={hsl(sig.hue, 60, 70)} strokeWidth={1.3} strokeLinecap="round">
            <path d="M -5 -6 L 5 -6 L 3 1 L -3 1 Z" /><line y1={1} y2={5} /><line x1={-4} y1={6} x2={4} y2={6} />
          </g>
        )}
        {sig.kind === "dove" && <path d="M -7 1 Q -2 -6 3 -2 Q 7 -5 7 0 Q 3 4 -2 3 Z" fill={hsl(sig.hue, 28, 84)} />}
        {sig.kind === "flame" && <path d="M 0 7 Q -5 2 -2 -3 Q 0 -8 0 -8 Q 0 -3 3 -4 Q 6 1 0 7 Z" fill={hsl(sig.hue, 82, 64)} />}
      </g>
      <text x={x + 26} y={y + 4} fontSize={7.2} fontFamily="ui-monospace, monospace"
        letterSpacing="0.7" fill="rgb(212 175 106 / 0.92)">{sig.code}</text>
      <text x={x + 26} y={y + 14} fontSize={5.8} fontFamily="ui-monospace, monospace"
        fill="rgb(212 175 106 / 0.56)">{levelTitle.toUpperCase()}</text>
      <text x={x + 26} y={y + 24} fontSize={5.6} fontFamily="ui-monospace, monospace"
        fill="rgb(212 175 106 / 0.44)">{summary.toUpperCase()}</text>
    </motion.g>
  );
});

/* ══ COMPONENTE PRINCIPAL ═══════════════════════════════════════════════ */
export function GardenSvg({ dna, state, justWatered = false, personal }: Props) {
  /* Datos del usuario → parámetros geométricos */
  const pt: PersonalTraits = useMemo(
    () => (personal ? derivePersonalTraits(personal) : defaultPersonalTraits()),
    [personal?.name, personal?.registeredAt?.getTime(), personal?.points, personal?.lastSeenAt?.getTime()],
  );

  const tp = useMemo(() => timePalette(state.timeOfDay, state.season), [state.timeOfDay, state.season]);
  const model = useMemo(
    () => generateGardenModel(dna, state, pt, tp.bloomOpen),
    [dna, state, pt, tp.bloomOpen],
  );
  const sig = useMemo(() => signatureFromDna(dna), [dna]);

  /* Intensidad de la brisa: más viva si el jardín está sano */
  const wind = clamp(0.45 + state.lifeRatio * 0.85 + (justWatered ? 0.3 : 0), 0.3, 1.6);

  const saturate = clamp(tp.saturation * (0.42 + (state.health / 100) * 0.68), 0.25, 1.15);
  const contentOpacity = clamp(0.58 + (state.health / 100) * 0.42, 0.55, 1);
  const candleGlow = clamp(tp.candleGlow, 0.12, 1);

  const rainDrops = useMemo(() => {
    if (!justWatered) return [];
    const p = createPrng(dna.dna + "::rain");
    return Array.from({ length: 20 }, (_, i) => ({
      x: rnd(p, 30, VIEW_W - 30), delay: (i * 0.06) % 1, len: rnd(p, 12, 22),
    }));
  }, [justWatered, dna.dna]);

  const dir = tp.id === "manana" || tp.id === "madrugada" ? 1 : -1;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%"
      style={{ display: "block" }} role="img"
      aria-label={`Jardín · ${tp.label} · nivel ${state.level} · ${pt.summary}`}>
      <defs>
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tp.sky[0]} />
          <stop offset="54%" stopColor={tp.sky[1]} />
          <stop offset="100%" stopColor={tp.sky[2]} />
        </linearGradient>
        <linearGradient id="g-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(255 255 255 / 0)" />
          <stop offset="55%" stopColor="rgb(240 246 252 / 0.85)" />
          <stop offset="100%" stopColor="rgb(240 246 252 / 0)" />
        </linearGradient>
        <radialGradient id="g-sun" cx="50%" cy="50%">
          <stop offset="0%" stopColor={tp.sunTone} />
          <stop offset="100%" stopColor="rgb(255 236 180 / 0)" />
        </radialGradient>
        <radialGradient id="g-pond" cx="38%" cy="30%">
          <stop offset="0%" stopColor="#cdedff" />
          <stop offset="50%" stopColor="#6cb4d6" />
          <stop offset="100%" stopColor="#2e7194" />
        </radialGradient>
        <linearGradient id="g-water" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(118 188 226 / 0.3)" />
          <stop offset="50%" stopColor="rgb(154 216 242 / 0.9)" />
          <stop offset="100%" stopColor="rgb(118 188 226 / 0.3)" />
        </linearGradient>
        <radialGradient id="g-sacred" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgb(212 175 106 / 0.4)" />
          <stop offset="100%" stopColor="rgb(212 175 106 / 0)" />
        </radialGradient>
        <radialGradient id="g-candle" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgb(255 206 122 / 0.62)" />
          <stop offset="55%" stopColor="rgb(255 186 96 / 0.2)" />
          <stop offset="100%" stopColor="rgb(255 176 88 / 0)" />
        </radialGradient>
        <radialGradient id="g-vignette" cx="50%" cy="48%">
          <stop offset="60%" stopColor="rgb(0 0 0 / 0)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0.18)" />
        </radialGradient>
        <filter id="f-grade">
          <feColorMatrix type="saturate" values={`${saturate}`} />
          <feComponentTransfer>
            <feFuncR type="linear" slope={`${tp.brightness}`} />
            <feFuncG type="linear" slope={`${tp.brightness}`} />
            <feFuncB type="linear" slope={`${tp.brightness * 1.02}`} />
          </feComponentTransfer>
        </filter>
      </defs>

      <SkyLayer tp={tp} dnaStr={dna.dna} />

      <g filter="url(#f-grade)" opacity={contentOpacity}>
        {/* Terreno */}
        {model.terrainLayers.map((l, i) => (
          <motion.g key={`tl-${i}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}>
            <ellipse cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={l.fill} />
            <ellipse cx={l.cx} cy={l.cy - 1.5} rx={l.rx * 0.99} ry={l.ry * 0.96}
              fill="none" stroke={`rgb(255 255 255 / ${0.06 + tp.lightWarmth * 0.1})`} strokeWidth={1} />
          </motion.g>
        ))}
        <path d={model.pathD} fill="none" stroke={hsl(model.palette.grassHue - 40, 18, 62, 0.4)}
          strokeWidth={8} strokeLinecap="round" strokeDasharray="1 12" />

        {/* Sombras según la hora */}
        {model.shadows.map((s, i) => (
          <ellipse key={`sd-${i}`}
            cx={s.cx + dir * (tp.shadowLength - 1) * 22} cy={s.cy}
            rx={s.rx * tp.shadowLength} ry={s.ry}
            fill={`rgb(18 26 14 / ${tp.shadowOpacity * s.opacity})`} />
        ))}

        <WaterLayer pond={model.pond} river={model.river} />

        {/* Pasto y arbustos generativos */}
        <GrassLayer tufts={model.grass} wind={wind} />
        <ShrubLayer shrubs={model.shrubs} wind={wind} />

        {/* Rocas */}
        {model.rocks.map((r, i) => (
          <g key={`rk-${i}`} transform={`rotate(${r.rot} ${r.x} ${r.y})`}>
            <ellipse cx={r.x} cy={r.y} rx={r.rx} ry={r.ry} fill={hsl(36, 7, 36 + r.tone * 12)} />
            <ellipse cx={r.x - r.rx * 0.22} cy={r.y - r.ry * 0.3} rx={r.rx * 0.48} ry={r.ry * 0.4}
              fill={hsl(36, 7, 48 + r.tone * 10)} opacity={0.65} />
          </g>
        ))}

        {/* Flores paramétricas */}
        {model.flowers.map((pf: PlacedFlower, i) => (
          <FlowerShape key={`fl-${i}`} f={pf.flower} x={pf.x} y={pf.y}
            wind={wind} delay={pf.windDelay} mature={pf.tier === "mature"} />
        ))}

        {model.marianArch && <MarianArchShape a={model.marianArch} />}
        {model.shrine && <ShrineShape sh={model.shrine} />}

        {/* Árbol fractal */}
        <FractalTreeLayer tree={model.tree} trunkFill={model.treeTrunkFill} wind={wind} />

        {/* Luces con latido */}
        {model.lights.map((l, i) => (
          <circle key={`lt-${i}`} cx={l.x} cy={l.y} r={Math.max(0.01, l.r)} fill={hsl(l.hue, 92, 76)}>
            <animate attributeName="opacity" values="0.15;0.85;0.15"
              dur={`${l.dur}s`} begin={`${l.delay}s`} repeatCount="indefinite" />
            <animate attributeName="cy" values={`${l.y};${l.y - 7};${l.y}`}
              dur={`${l.dur}s`} begin={`${l.delay}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>

      <Candles candles={model.candles} glow={candleGlow} />
      <g opacity={contentOpacity}><Fauna m={model} /></g>
      <EphemeralLayer m={model} ratio={state.freshWaterRatio}
        dewActive={tp.dewActive || state.freshWater} wind={wind} />

      {/* Lluvia del riego */}
      <AnimatePresence>
        {rainDrops.map((d, i) => (
          justWatered && (
            <motion.line key={`rn-${i}`} x1={d.x} y1={-20} x2={d.x - 6} y2={-20 + d.len}
              stroke="rgb(150 200 240 / 0.7)" strokeWidth={1.2}
              initial={{ y: 0 }}
              animate={{ y: [0, VIEW_H + 30] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, repeat: Infinity, delay: d.delay, ease: "linear" }} />
          )
        ))}
      </AnimatePresence>
      {justWatered && [0, 0.5].map((delay, i) => (
        <motion.ellipse key={i} cx={360} cy={GROUND_CY} rx={24} ry={8}
          fill="none" stroke="rgb(130 205 255 / 0.55)" strokeWidth={1.8}
          animate={{ rx: [24, 170], ry: [8, 54], opacity: [0.55, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, delay, ease: "easeOut" }} />
      ))}

      {/* Tinte ambiental de la hora */}
      <rect width={VIEW_W} height={VIEW_H} fill={tp.ambientTint}
        opacity={tp.ambientOpacity} pointerEvents="none" style={{ mixBlendMode: "multiply" }} />
      {tp.id === "manana" && (
        <rect width={VIEW_W} height={VIEW_H} fill="rgb(255 214 150)" opacity={0.1}
          pointerEvents="none" style={{ mixBlendMode: "screen" }} />
      )}
      {state.waterLevel < 14 && (
        <motion.rect width={VIEW_W} height={VIEW_H} fill="rgb(154 112 48 / 0.18)"
          animate={{ opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 6, repeat: Infinity }} pointerEvents="none" />
      )}

      <rect width={VIEW_W} height={VIEW_H} fill="url(#g-vignette)" pointerEvents="none" />
      <SignatureBlock sig={sig} levelTitle={model.levelTitle} summary={pt.summary} />
    </svg>
  );
}

export default GardenSvg;
