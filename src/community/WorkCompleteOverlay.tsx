import { motion } from "framer-motion";
import { CommunityWorkSvg } from "./CommunityWorkSvg";
import { COMPOSITION_LABELS } from "./composition";
import type { CommunityWorkSeed } from "./types";

export function WorkCompleteOverlay({
  work,
  onClose,
  onOpenGallery,
}: {
  work: CommunityWorkSeed;
  onClose: () => void;
  onOpenGallery: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#070708] text-white">
      <div className="flex items-center justify-between px-5 pt-12">
        <div className="text-[10px] tracking-[0.22em] text-[var(--gold)]">
          OBRA NACIDA DE LA ORACIÓN
        </div>
        <button onClick={onClose} className="h-10 px-2 text-sm text-white/45">
          Cerrar
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mx-auto mt-4 max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-black"
        >
          <CommunityWorkSvg
            communitySeed={work.communitySeed}
            composition={work.composition}
            signatures={work.signatures}
            progress={1}
            complete
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-6 text-center"
        >
          <div className="text-[11px] tracking-[0.2em] text-white/40">
            {COMPOSITION_LABELS[work.composition].toUpperCase()}
          </div>
          <h2 className="mt-2 font-serif-holy text-3xl font-semibold text-[var(--gold)]">
            {work.title}
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
            Esta obra nació de la oración compartida de{" "}
            <span className="text-white">{work.participants} personas</span>. Cada
            hoja, cada flor y cada destello proviene de la identidad espiritual de
            quienes rezaron este Rosario. Ninguna obra volverá a repetirse.
          </p>
        </motion.div>

        <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3">
          <Stat label="Participantes" value={`🙏 ${work.participants}`} />
          <Stat label="Intenciones" value={`🕯️ ${work.intentions}`} />
          <Stat label="Avemarías" value={`🌹 ${work.aveMarias.toLocaleString("es")}`} />
          <Stat label="Rosario" value="📿 1 completado" />
        </div>

        <p className="mx-auto mt-6 max-w-sm text-center text-xs leading-relaxed text-white/35">
          No se guardó ninguna imagen. Solo la semilla comunitaria (
          {work.communitySeed.slice(0, 8)}…) y las firmas. Cualquier dispositivo
          puede reconstruir exactamente esta misma obra.
        </p>

        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
          <button
            onClick={onOpenGallery}
            className="h-14 rounded-full bg-[var(--gold)] font-semibold text-black"
          >
            Ver en la Galería de Oración
          </button>
          <button
            onClick={onClose}
            className="h-12 rounded-full border border-white/15 text-sm text-white/70"
          >
            Volver al silencio
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center">
      <div className="text-sm font-medium text-white">{value}</div>
      <div className="mt-1 text-[10px] tracking-[0.14em] text-white/40">{label}</div>
    </div>
  );
}
