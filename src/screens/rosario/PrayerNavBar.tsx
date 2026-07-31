type Props = {
  holding: boolean;
  completedRatio: number;
  disabled?: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onExit: () => void;
  onOpenGallery?: () => void;
};

/**
 * Barra inferior del Rosario Activo. El ítem central "Rosario" se
 * transforma en un botón de acción 🙏 grande que sobresale de la barra,
 * con anillo de progreso de consenso en su borde.
 */
export function PrayerNavBar({
  holding,
  completedRatio,
  disabled,
  onHoldStart,
  onHoldEnd,
  onExit,
  onOpenGallery,
}: Props) {
  const size = 76;
  const r = 35;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, Math.max(0, completedRatio));

  return (
    <nav className="relative z-30 shrink-0 border-t border-white/10 bg-[#0a0a0b]/90 backdrop-blur-xl landscape:absolute landscape:left-0 landscape:top-0 landscape:bottom-0 landscape:w-auto landscape:border-r landscape:border-t-0">
      <div className="mx-auto flex max-w-md items-end justify-between px-6 pb-5 pt-2 pb-[env(safe-area-inset-bottom)] landscape:max-w-none landscape:flex-col landscape:items-center landscape:justify-center landscape:px-3 landscape:py-4 landscape:pl-[env(safe-area-inset-top)]">
        {/* Left: Salir */}
        <button
          onClick={onExit}
          className="flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-1 text-white/45 landscape:flex-row landscape:gap-1.5 landscape:w-full"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M9 8l-4 4 4 4M5 12h11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px]">Salir</span>
        </button>

        {/* Center: acción 🙏 sobresaliente con anillo de consenso */}
        <div className="relative flex flex-1 justify-center">
          <div className="absolute -top-8" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="absolute inset-0 -rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="var(--gold)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: "stroke-dasharray 0.4s ease" }}
              />
            </svg>
            <button
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault();
                if (!disabled) onHoldStart();
              }}
              onPointerUp={onHoldEnd}
              onPointerLeave={() => holding && onHoldEnd()}
              className={`absolute inset-[6px] flex select-none items-center justify-center rounded-full text-3xl transition-all duration-200 ${
                holding
                  ? "scale-95 bg-[var(--gold)] shadow-[0_0_46px_rgba(212,175,106,0.65)]"
                  : "bg-[#17181b] shadow-[0_6px_18px_rgba(0,0,0,0.5)] active:scale-95"
              } ${disabled ? "opacity-40" : ""}`}
              aria-label="Mantén presionado para orar"
            >
              🙏
            </button>
          </div>
          <span className="mt-11 text-[10px] text-white/45">
            {holding ? "Orando…" : "Mantén"}
          </span>
        </div>

        {/* Right: Galería */}
        <button
          onClick={onOpenGallery}
          className="flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-1 text-white/45 landscape:flex-row landscape:gap-1.5 landscape:w-full"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="M4 15l4-4 4 4 3-3 5 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px]">Galería</span>
        </button>
      </div>
    </nav>
  );
}
