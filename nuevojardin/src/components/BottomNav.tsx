import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

export type Tab = "camino" | "regla" | "rosario" | "comunidad" | "perfil";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  dark?: boolean;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "camino",
    label: "Camino",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={22} height={22}>
        <path d="M3 21l9-18 9 18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 3v18" strokeLinecap="round" strokeDasharray="2 3" />
        <path d="M9 12h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "regla",
    label: "Regla",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={22} height={22}>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "rosario",
    label: "Rosario",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={22} height={22}>
        <circle cx="12" cy="5" r="2" />
        <circle cx="19" cy="10" r="1.5" />
        <circle cx="19" cy="16" r="1.5" />
        <circle cx="12" cy="20" r="1.5" />
        <circle cx="5" cy="16" r="1.5" />
        <circle cx="5" cy="10" r="1.5" />
        <path d="M12 7 Q17 8 19 10" strokeLinecap="round" />
        <path d="M19 12v4" strokeLinecap="round" />
        <path d="M19 16 Q17 20 12 20" strokeLinecap="round" />
        <path d="M12 20 Q7 20 5 16" strokeLinecap="round" />
        <path d="M5 16v-6" strokeLinecap="round" />
        <path d="M5 10 Q7 8 12 7" strokeLinecap="round" />
        <line x1="12" y1="3" x2="12" y2="1" strokeLinecap="round" />
        <line x1="11" y1="1" x2="13" y2="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "comunidad",
    label: "Comunidad",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={22} height={22}>
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="8" r="3" />
        <path d="M2 20c0-3.3 2.7-6 6-6h8c3.3 0 6 2.7 6 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "perfil",
    label: "Perfil",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={22} height={22}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function BottomNav({ active, onChange, dark = false }: Props) {
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-30 flex items-end",
        dark ? "bg-[#0a0a0b]" : "bg-white/90 backdrop-blur-md"
      )}
      style={{
        borderTop: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium tracking-wide transition-colors",
              isActive
                ? dark
                  ? "text-[#d4af6a]"
                  : "text-[#1c1c1e]"
                : dark
                ? "text-white/30"
                : "text-[#8a8a90]"
            )}
            whileTap={{ scale: 0.92 }}
            aria-label={tab.label}
          >
            <div className={cn("relative flex items-center justify-center", isActive && "scale-105")}>
              {tab.icon}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className={cn(
                    "absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full",
                    dark ? "bg-[#d4af6a]" : "bg-[#1c1c1e]"
                  )}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </div>
            <span>{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
