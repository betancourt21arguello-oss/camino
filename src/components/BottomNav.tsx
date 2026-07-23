import type { ReactNode } from "react";

export type Tab = "camino" | "regla" | "rosario" | "comunidad" | "perfil";

const items: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "camino",
    label: "Camino",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 3v18M8 7h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "regla",
    label: "Regla",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M9 9l1.5 1.5L13 8M9 15h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "rosario",
    label: "Rosario",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="8" r="4" />
        <path d="M12 12v3M10 18h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "comunidad",
    label: "Comunidad",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 3c-1 4-1 14 0 18M8 5c3 2 5 2 8 0M8 19c3-2 5-2 8 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "perfil",
    label: "Perfil",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.5-3.5 12.5-3.5 14 0" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function BottomNav({
  active,
  onChange,
  dark,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  dark: boolean;
}) {
  return (
    <nav
      className={`absolute inset-x-0 bottom-0 z-20 border-t backdrop-blur-xl ${
        dark ? "border-white/10 bg-[#0a0a0b]/85" : "border-[#e6e3db] bg-[#f7f6f3]/90"
      }`}
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-1 pb-5 pt-2">
        {items.map((it) => {
          const on = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1"
            >
              <span
                className={
                  on ? "text-[var(--gold)]" : dark ? "text-white/45" : "text-[#9a9a9f]"
                }
              >
                {it.icon}
              </span>
              <span
                className={`text-[10px] ${
                  on
                    ? "font-medium text-[var(--gold)]"
                    : dark
                      ? "text-white/45"
                      : "text-[#9a9a9f]"
                }`}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
