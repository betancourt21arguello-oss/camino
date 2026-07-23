type Props = {
  topLabel: string;
  centerMain: string;
  centerSub?: string;
  centerVariant?: "number" | "text";
  progress: number; // 0..1 arc
  beadTotal?: number;
  beadDone?: number;
  glow?: boolean;
};

export function RosaryRing({
  topLabel,
  centerMain,
  centerSub,
  centerVariant = "number",
  progress,
  beadTotal = 0,
  beadDone = 0,
  glow = false,
}: Props) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = 100;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, progress));

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.5s linear" }}
        />
      </svg>

      {beadTotal > 0 && (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          {Array.from({ length: beadTotal }).map((_, i) => {
            const a = (i / beadTotal) * 2 * Math.PI;
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            const done = i < beadDone;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={done ? 4.5 : 3.5}
                fill={done ? "var(--gold)" : "rgba(255,255,255,0.18)"}
              />
            );
          })}
        </svg>
      )}

      <div
        className={`absolute inset-6 flex flex-col items-center justify-center rounded-full text-center transition-shadow duration-300 ${
          glow ? "shadow-[0_0_40px_rgba(212,175,106,0.45)]" : ""
        }`}
      >
        <div className="text-[10px] font-medium tracking-[0.22em] text-[var(--gold)]">
          {topLabel}
        </div>
        {centerVariant === "number" ? (
          <div className="font-serif-holy text-6xl font-semibold leading-none text-white">
            {centerMain}
          </div>
        ) : (
          <div className="mt-1 max-w-[150px] font-serif-holy text-xl font-semibold leading-tight text-white">
            {centerMain}
          </div>
        )}
        {centerSub && <div className="mt-1 text-sm text-white/50">{centerSub}</div>}
      </div>
    </div>
  );
}
