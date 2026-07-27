/* ============================================================================
 * src/garden/GardenFullscreen.tsx — Vista inmersiva del jardín
 * Zoom + Pan con gestos (pinch, drag), botón de cerrar, info de hitos.
 * ==========================================================================*/
import { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GardenSvg } from "./GardenSvg";
import type { DnaTraits, GardenState } from "./types";
import type { PersonalInput } from "./personal";
import { TIME_LABEL, TIME_ICON } from "./time";
import { MATURITY_LABEL, SEASON_LABEL } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  dna: DnaTraits;
  state: GardenState;
  personal?: PersonalInput;
}

/** Hook simple para zoom/pan con gestos. */
function useZoomPan(initialScale = 1, minScale = 1, maxScale = 3) {
  const [scale, setScale] = useState(initialScale);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const isDragging = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScale((s) => {
      const next = s + delta * s;
      return Math.min(maxScale, Math.max(minScale, next));
    });
  }, [maxScale, minScale]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !lastPos.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setX((px) => px + dx);
    setY((py) => py + dy);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    lastPos.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  }, []);

  const onWheelTouch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      // Simplificado: solo zoom basado en distancia
      setScale((s) => {
        const delta = (dist - 150) * 0.008;
        return Math.min(maxScale, Math.max(minScale, s + delta));
      });
    }
  }, [maxScale, minScale]);

  const reset = useCallback(() => {
    setScale(1);
    setX(0);
    setY(0);
  }, []);

  return {
    scale, x, y,
    handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp, onTouchMove: onWheelTouch },
    reset,
  };
}

/* ── Botón icono ───────────────────────────────────────────────────────── */
function IconButton({ onClick, children, label }: {
  onClick: () => void; children: React.ReactNode; label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
      aria-label={label}
    >
      {children}
    </motion.button>
  );
}

/* ── Tarjeta de info ──────────────────────────────────────────────────── */
const InfoCard = memo(function InfoCard({ state }: { state: GardenState }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="absolute bottom-6 left-4 right-4 z-20"
    >
      <div className="rounded-2xl bg-black/60 p-4 backdrop-blur-md text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{TIME_ICON[state.timeOfDay]}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {TIME_LABEL[state.timeOfDay]} · {SEASON_LABEL[state.season]}
              </p>
              <p className="text-sm font-semibold">
                {MATURITY_LABEL[state.maturityTier]} · Fase {state.growthPhase}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/60">Nivel</p>
            <p className="text-lg font-bold text-[#e8c98a]">{state.level}</p>
          </div>
        </div>

        {/* Barras de estado */}
        <div className="space-y-2">
          <StatBar label="Salud" icon="🌿" value={state.health} from="#5a8a5c" to="#8ac880" />
          <StatBar label="Agua" icon="" value={state.waterLevel} from="#3a7a9a" to="#6ac0e0" />
          <StatBar label="Luz" icon="✨" value={state.lightLevel} from="#c49a3a" to="#f0d488" />
        </div>

        {/* Riego fresco */}
        {state.freshWater && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 flex items-center gap-2 rounded-xl bg-[#1a6a4a]/70 px-3 py-2"
          >
            <span className="text-lg">🌱</span>
            <div className="flex-1">
              <p className="text-xs font-semibold">Brotes efímeros activos</p>
              <p className="text-[10px] text-white/70">
                Desaparecen en {Math.ceil(state.freshWaterRatio * 24)} h si no riegas
              </p>
            </div>
          </motion.div>
        )}

        {/* Hitos recientes */}
        {state.milestones.length > 0 && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60 mb-2">
              Últimos hitos
            </p>
            <div className="space-y-1.5">
              {state.milestones.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-start gap-2">
                  <span className="mt-0.5 text-[10px]">🏅</span>
                  <div>
                    <p className="text-xs font-medium">{m.label}</p>
                    <p className="text-[10px] text-white/60">{m.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

function StatBar({ label, icon, value, from, to }: {
  label: string; icon: string; value: number; from: string; to: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/70">{icon} {label}</span>
        <span className="font-semibold">{Math.round(value)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${from}, ${to})` }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────────────── */
export function GardenFullscreen({ open, onClose, dna, state, personal }: Props) {
  const { scale, x, y, handlers, reset } = useZoomPan(1, 1, 4);

  /* Cerrar con Escape */
  useState(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />

          {/* Contenedor de zoom/pan */}
          <motion.div
            className="fixed inset-0 z-50 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            {...handlers}
          >
            {/* Capa transformable */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                transformOrigin: "center center",
                touchAction: "none",
              }}
              animate={{ scale, x: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
            >
              {/* El SVG se renderiza a doble resolución para zoom */}
              <div className="w-[1440px] h-[920px]">
                <GardenSvg dna={dna} state={state} justWatered={state.freshWater} personal={personal} />
              </div>
            </motion.div>

            {/* Header con controles */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <IconButton onClick={onClose} label="Cerrar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </IconButton>
                <span className="text-sm font-semibold text-white drop-shadow-lg">
                  {TIME_ICON[state.timeOfDay]} {TIME_LABEL[state.timeOfDay]}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <IconButton onClick={reset} label="Resetear zoom">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </IconButton>
                <IconButton onClick={() => handlers.onWheel({ preventDefault: () => {}, deltaY: -100 } as any)} label="Acercar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" strokeLinecap="round" />
                  </svg>
                </IconButton>
                <IconButton onClick={() => handlers.onWheel({ preventDefault: () => {}, deltaY: 100 } as any)} label="Alejar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35M8 11h6" strokeLinecap="round" />
                  </svg>
                </IconButton>
              </div>
            </div>

            {/* Instrucciones iniciales */}
            <AnimatePresence>
              {scale === 1 && x === 0 && y === 0 && (
                <motion.div
                  className="absolute top-20 left-1/2 z-20 -translate-x-1/2"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <div className="rounded-full bg-black/50 px-4 py-2 text-xs text-white backdrop-blur-sm">
                    Pellizca para zoom · Arrastra para recorrer
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tarjeta de info */}
            <InfoCard state={state} />

            {/* Indicador de zoom */}
            <motion.div
              className="absolute bottom-6 right-4 z-20 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
              animate={{ opacity: scale > 1 ? 1 : 0.5 }}
            >
              {Math.round(scale * 100)}%
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default GardenFullscreen;
