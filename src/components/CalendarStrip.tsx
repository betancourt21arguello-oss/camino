import { monthEvents, pastProgress, TODAY_DAY } from "../liturgy/today";

const rankTint: Record<string, string> = {
  solemnidad: "#c9302c",
  fiesta: "#d4af6a",
  memoria: "#7a8a5c",
  feria: "#b8b4a8",
};

export function CalendarStrip({ onOpenDay }: { onOpenDay?: (day: number) => void }) {
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between px-6 text-[11px] tracking-[0.15em] text-[#9a9a9f]">
        <span>← DÍAS PASADOS</span>
        <span>CALENDARIO LITÚRGICO →</span>
      </div>
      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-6 pb-1">
        {monthEvents.map((ev) => {
          const isToday = ev.day === TODAY_DAY;
          const isPast = ev.day < TODAY_DAY;
          const prog = pastProgress[ev.day];
          return (
            <button
              key={ev.date}
              onClick={() => onOpenDay?.(ev.day)}
              className={`flex min-h-[44px] shrink-0 snap-center flex-col items-center justify-center rounded-2xl border px-3 py-2 transition ${
                isToday
                  ? "border-[#1c1c1e] bg-[#1c1c1e] text-white"
                  : "border-[#e6e3db] bg-white text-[#1c1c1e]"
              }`}
              style={{ width: 68 }}
            >
              <span
                className={`text-[9px] font-medium uppercase tracking-wide ${
                  isToday ? "text-white/60" : "text-[#a8a8ad]"
                }`}
              >
                {isToday ? "HOY" : isPast ? "" : "PRÓX"}
              </span>
              <span className="text-lg font-semibold leading-tight">{ev.day}</span>

              {/* Past = progress dot; Future = liturgical rank dot */}
              {isPast ? (
                <span
                  className="mt-0.5 h-1.5 w-1.5 rounded-full"
                  style={{
                    background: prog?.done ? "#7a8a5c" : "#e0ddd4",
                  }}
                />
              ) : (
                <span
                  className="mt-0.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: rankTint[ev.rank] }}
                />
              )}

              <span
                className={`mt-1 line-clamp-2 text-center text-[8px] leading-tight ${
                  isToday ? "text-white/70" : "text-[#9a9a9f]"
                }`}
              >
                {ev.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
