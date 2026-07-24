import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type InstallController } from "./useInstallPrompt";
import { InstallIOSGuide } from "./InstallIOSGuide";

/**
 * Tarjeta de invitación a instalar la app como PWA.
 * - Android / Chrome desktop: dispara el prompt nativo del navegador.
 * - iPhone / iPad: abre una guía visual paso a paso.
 * Diseño con halo dorado ambiental, ícono con glow, tipografía con
 * fuerte contraste y micro-interacciones con propósito.
 */
export function InstallBanner({ install }: { install: InstallController }) {
  const [showGuide, setShowGuide] = useState(false);

  const handlePrimary = () => {
    if (install.mode === "prompt") void install.promptInstall();
    else setShowGuide(true);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-6 mt-5 overflow-hidden rounded-[24px] border border-[#e7ddc6] bg-gradient-to-b from-white to-[#fbf7ee] p-4 shadow-[0_14px_38px_-22px_rgba(120,90,30,0.55)]"
      >
        {/* halo ambiental dorado */}
        <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.32),transparent_68%)]" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(122,138,92,0.16),transparent_70%)]" />

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <span className="absolute inset-0 animate-[pulse_3.2s_ease-in-out_infinite] rounded-2xl bg-[#d4af6a]/35 blur-md" />
            <img
              src="/icons/icon-192.png"
              alt="Camino"
              className="relative h-14 w-14 rounded-2xl shadow-[0_6px_16px_-6px_rgba(60,40,10,0.5)]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-serif-holy text-[20px] leading-[1.1] text-[#1c1c1e]">
              Lleva Camino contigo
            </div>
            <p className="mt-1 text-[13px] leading-snug text-[#77736b]">
              Instálala como app y entra a rezar con un solo toque, sin navegador.
            </p>
          </div>
          <button
            onClick={install.dismiss}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b0a99a] transition hover:bg-black/5 hover:text-[#77736b]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="relative mt-4 flex items-center gap-2">
          <motion.button
            onClick={handlePrimary}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="group flex h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-[#1c1c1e] text-[14px] font-medium text-white shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)] transition-colors hover:bg-black"
          >
            {install.mode === "prompt" ? "Instalar Camino" : "Cómo instalar en iPhone"}
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </motion.button>
          <button
            onClick={install.dismiss}
            className="h-[46px] shrink-0 rounded-full px-4 text-[12px] text-[#9a948a] transition hover:text-[#1c1c1e]"
          >
            Ahora no
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showGuide && (
          <InstallIOSGuide
            onClose={() => {
              setShowGuide(false);
              install.dismiss();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
