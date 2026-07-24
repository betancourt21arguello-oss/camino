import { motion } from "framer-motion";

/**
 * Guía visual paso a paso para añadir Camino a la pantalla de inicio en
 * iPhone / iPad (Safari). iOS no expone una API de instalación, así que
 * mostramos instrucciones claras con los íconos del sistema dibujados.
 */
export function InstallIOSGuide({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-[60] flex items-end bg-black/55 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full overflow-hidden rounded-t-[28px] bg-gradient-to-b from-white to-[#fbf7ee] px-6 pb-8 pt-3 shadow-[0_-20px_60px_-20px_rgba(60,40,10,0.4)]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute inset-x-0 -top-1 h-1.5 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-70" />
        <div className="mx-auto mb-5 mt-2 h-1.5 w-12 rounded-full bg-[#d8d2c4]" />

        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="Camino" className="h-12 w-12 rounded-2xl shadow-sm" />
          <div className="min-w-0">
            <div className="font-serif-holy text-[22px] leading-tight text-[#1c1c1e]">
              Añadir a Inicio
            </div>
            <div className="text-[12px] text-[#77736b]">Tres toques en Safari</div>
          </div>
        </div>

        <ol className="mt-6 space-y-4">
          <Step
            n={1}
            title="Toca Compartir"
            body="En la barra inferior de Safari, pulsa el ícono del cuadrado con la flecha hacia arriba."
            icon={<ShareGlyph />}
          />
          <Step
            n={2}
            title="Añadir a pantalla de inicio"
            body="Desliza la hoja hacia arriba y toca «Añadir a pantalla de inicio» (el cuadrado con el +)."
            icon={<AddHomeGlyph />}
          />
          <Step
            n={3}
            title="Confirma con Añadir"
            body="Camino quedará junto a tus apps. La próxima vez ábrela con un solo toque, sin navegador."
            icon={<CheckGlyph />}
          />
        </ol>

        <button
          onClick={onClose}
          className="mt-7 flex w-full items-center justify-center rounded-full bg-[#1c1c1e] text-[15px] font-medium text-white transition hover:bg-black active:scale-[0.98]"
          style={{ height: 52 }}
        >
          Entendido
        </button>
      </motion.div>
    </motion.div>
  );
}

function Step({
  n,
  title,
  body,
  icon,
}: {
  n: number;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.li
      className="flex items-start gap-4"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + n * 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e3d8bb] bg-[#fbf4e2] font-serif-holy text-[20px] text-[#a6823f]">
        {n}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-[15px] font-semibold text-[#1c1c1e]">{title}</div>
        <div className="mt-0.5 text-[13px] leading-snug text-[#77736b]">{body}</div>
      </div>
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
        {icon}
      </div>
    </motion.li>
  );
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#3478f6]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

function AddHomeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#3478f6]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#3aa757]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}
