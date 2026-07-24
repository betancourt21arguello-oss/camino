import { AnimatePresence, motion } from "framer-motion";

type Props = {
  topLabel: string;
  centerMain: string;
  centerSub?: string;
  centerVariant?: "number" | "text";
  progress: number;
  beadTotal?: number;
  beadDone?: number;
  /** Índice de la cuenta en curso (resaltada con halo). -1 o undefined = ninguna. */
  activeBead?: number;
  glow?: boolean;
  size?: number;
};

export function RosaryRing({
  topLabel,
  centerMain,
  centerSub,
  centerVariant = "number",
  progress,
  beadTotal = 0,
  beadDone = 0,
  activeBead = -1,
  glow = false,
  size = 240,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.385;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, progress));
  const centerSize = size * 0.62;
  const fontSize = centerVariant === "number" ? size * 0.27 : size * 0.085;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* anillo de progreso */}
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          initial={false}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>

      {/* cuentas */}
      {beadTotal > 0 && (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          {Array.from({ length: beadTotal }).map((_, i) => {
            const a = (i / beadTotal) * 2 * Math.PI;
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            const done = i < beadDone;
            const isActive = i === activeBead;
            return (
              <g key={i}>
                {isActive && (
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={7}
                    fill="var(--gold)"
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: [0.5, 0.15, 0.5], r: [6, 9, 6] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <motion.circle
                  cx={x}
                  cy={y}
                  r={isActive ? 4.6 : done ? 4 : 3}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.04 * i + 0.1, type: "spring", stiffness: 320, damping: 22 }}
                  fill={done || isActive ? "var(--gold)" : "rgba(255,255,255,0.18)"}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* centro */}
      <div
        className={`absolute flex flex-col items-center justify-center rounded-full text-center transition-shadow duration-500 ${
          glow ? "shadow-[0_0_44px_rgba(212,175,106,0.45)]" : ""
        }`}
        style={{
          left: (size - centerSize) / 2,
          top: (size - centerSize) / 2,
          width: centerSize,
          height: centerSize,
        }}
      >
        <div
          className="font-medium uppercase tracking-[0.22em] text-[var(--gold)]"
          style={{ fontSize: Math.max(9, size * 0.042) }}
        >
          {topLabel}
        </div>

        <div className="relative my-0.5 overflow-hidden" style={{ height: fontSize * 1.15 }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={centerMain}
              className={`block font-serif-holy font-semibold leading-none text-white ${
                centerVariant === "text" ? "px-2" : ""
              }`}
              style={{ fontSize }}
              initial={{ y: fontSize * 0.4, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -fontSize * 0.4, opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {centerMain}
            </motion.span>
          </AnimatePresence>
        </div>

        {centerSub && (
          <div className="text-white/45" style={{ fontSize: Math.max(10, size * 0.05) }}>
            {centerSub}
          </div>
        )}
      </div>
    </div>
  );
}
