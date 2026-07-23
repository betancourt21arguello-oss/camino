import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AudioPlayer } from "../components/AudioPlayer";
import { angelusSteps, laudesSteps } from "../devotions/daily";
import { assetsByTag } from "../media/registry";
import type { WhatsAppAsset } from "../media/types";
import { useDailyPrayerPresence } from "../prayer/useDailyPrayerPresence";

type PortalKind = "laudes" | "angelus";

export function DailyPrayerPortal({
  kind,
  assets: allAssets,
  generated,
  onClose,
  onComplete,
}: {
  kind: PortalKind;
  assets: WhatsAppAsset[];
  generated?: { title: string; body: string };
  onClose: () => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const steps = useMemo(() => {
    if (!generated?.body) return kind === "laudes" ? laudesSteps : angelusSteps;
    const parts = generated.body.split(/\n\s*\n/).filter(Boolean);
    return parts.map((text, i) => ({
      id: `gemini-${kind}-${i}`,
      title: i === 0 ? generated.title : `${generated.title} · ${i + 1}`,
      role: "todos" as const,
      text,
      response: undefined,
    }));
  }, [generated, kind]);
  const assets = assetsByTag(kind, allAssets);
  const step = steps[index];
  const last = index === steps.length - 1;
  const isLaudes = kind === "laudes";
  const presence = useDailyPrayerPresence(kind, true);

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#f8f6f0] text-[#1c1c1e]">
      <div className="flex items-center justify-between px-5 pb-2 pt-12">
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#8a8a90]"
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="text-center">
          <div className="text-[10px] font-semibold tracking-[0.2em] text-[#a68b4e]">
            {isLaudes ? "ORACIÓN DE LA MAÑANA" : "ORACIÓN DEL MEDIODÍA"}
          </div>
          <div className="font-serif-holy text-xl font-semibold">
            {isLaudes ? "Laudes del día" : "Ángelus del día"}
          </div>
          {presence.hasPeople && (
            <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-[#6e875e]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6e9f6f]" />
              {presence.count} {presence.count === 1 ? "persona rezando" : "personas rezando"}
            </div>
          )}
        </div>
        <div className="w-11 text-right text-xs tabular-nums text-[#9a9a9f]">
          {index + 1}/{steps.length}
        </div>
      </div>

      <div className="mx-6 mt-2 h-1 overflow-hidden rounded-full bg-[#e7e2d7]">
        <motion.div
          className="h-full rounded-full bg-[#c4a35a]"
          animate={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-5">
        {index === 0 && assets.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-[#9a9a9f]">
              AUDIO RECIBIDO POR WHATSAPP
            </div>
            {assets.map((asset) => (
              <AudioPlayer key={asset.id} asset={asset} />
            ))}
          </div>
        )}

        <div className="flex min-h-[430px] items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-full"
            >
              <div className="text-[11px] font-semibold tracking-[0.2em] text-[#a68b4e]">
                {step.role === "guía" ? "GUÍA" : "TODOS"}
              </div>
              <h2 className="mt-2 font-serif-holy text-3xl font-semibold">{step.title}</h2>
              <p className="mt-6 font-serif-holy text-[22px] leading-relaxed text-[#2b2b2d]">
                {step.text}
              </p>
              {step.response && (
                <div className="mt-7 border-l-2 border-[#c4a35a] pl-4">
                  <div className="text-[10px] font-semibold tracking-[0.16em] text-[#9a9a9f]">
                    RESPUESTA
                  </div>
                  <p className="mt-1 font-serif-holy text-xl leading-relaxed text-[#5c654e]">
                    {step.response}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="px-6 pb-10 pt-2">
        <button
          onClick={() => {
            if (last) onComplete();
            else setIndex((value) => value + 1);
          }}
          className="h-14 w-full rounded-full bg-[#1c1c1e] text-[15px] font-medium text-white transition active:scale-[0.99]"
        >
          {last ? `He rezado ${isLaudes ? "los Laudes" : "el Ángelus"}` : "Continuar"}
        </button>
        {index > 0 && !last && (
          <button
            onClick={() => setIndex((value) => value - 1)}
            className="mt-1 h-10 w-full text-sm text-[#8a8a90]"
          >
            Anterior
          </button>
        )}
      </div>
    </div>
  );
}
