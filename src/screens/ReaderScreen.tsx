import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Props = {
  eyebrow: string;
  title: string;
  ref?: string;
  body: string;
  onClose: () => void;
  onComplete?: () => void;
  completeLabel?: string;
  gospel?: {
    evangelist?: string;
    threeCrosses?: boolean;
    responseLabel?: string;
    response?: string;
  };
  psalmResponse?: string;
};

export function ReaderScreen({
  eyebrow,
  title,
  ref: reference,
  body,
  onClose,
  onComplete,
  completeLabel = "Marcar como rezado",
  gospel,
  psalmResponse,
}: Props) {
  const isGospel = Boolean(gospel);
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#faf7f0] text-[#1c1c1e]">
      <div className="relative flex items-center justify-between px-5 pb-2 pt-12">
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-[#8a8a90] transition hover:bg-black/5" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="text-[11px] font-semibold tracking-[0.2em] text-[#a07a3c]">{eyebrow}</div>
        <div className="w-11" />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-7 pt-2 landscape:overflow-auto">
        {isGospel && gospel?.threeCrosses !== false && <ThreeCrossesRite />}

{isGospel && gospel?.evangelist && (
  () => {
    const ev = gospel.evangelist!;
    const name = ev.startsWith("San ") || ev.startsWith("san ") ? ev : `San ${ev}`;
    return (
      <p className="font-serif-holy text-[19px] italic leading-snug text-[#5a4a2a]">
        Lectura del santo Evangelio según {name}
      </p>
    );
  }
)()}

        <h1 className="mt-3 font-serif-holy text-3xl font-bold leading-tight">{title}</h1>
        {reference && <p className="mt-2 text-sm font-medium tracking-wide text-[#a07a3c]">{reference}</p>}
        <div className="my-5 h-px w-12 rounded-full bg-[#a07a3c]" />
        {isGospel ? (
          <p className="whitespace-pre-line font-serif-holy text-[19px] leading-[1.75] text-[#2a2a2e]">{body}</p>
        ) : (
          <PsalmBody body={body} response={psalmResponse} />
        )}

        {isGospel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="my-6 rounded-2xl border-l-4 border-[#8a5a2a] bg-white/70 p-4"
          >
            <p className="font-serif-holy text-[18px]">{gospel?.responseLabel ?? "Palabra del Señor"}</p>
            <p className="mt-1 font-serif-holy text-[18px] font-semibold text-[#8a5a2a]">
              R. {gospel?.response ?? "Gloria a ti, Señor Jesús"}
            </p>
          </motion.div>
        )}
        <div className="h-8" />
      </div>

      {onComplete && (
        <div className="px-6 pb-10 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onComplete}
            className="h-14 w-full rounded-full bg-[#1c1c1e] text-[15px] font-medium text-white transition active:scale-[0.99]"
          >
            {completeLabel}
          </motion.button>
        </div>
      )}
    </div>
  );
}

export function PsalmBody({ body, response }: { body: string; response?: string }) {
  if (!response) {
    return <p className="whitespace-pre-line font-serif-holy text-[19px] leading-[1.75] text-[#2a2a2e]">{body}</p>;
  }

  const segments = body.split(/(\.\n)/g);

  return (
    <div className="font-serif-holy text-[19px] leading-[1.75] text-[#2a2a2e]">
      {segments.map((seg, i) => {
        if (seg === ".\n") {
          return (
            <p key={i} className="mt-3 mb-1 font-semibold text-[#a07a3c]">
              R. {response}
            </p>
          );
        }
        if (!seg) return null;
        return <p key={i} className="whitespace-pre-line my-0">{seg}</p>;
      })}
    </div>
  );
}

function ThreeCrossesRite() {
  const [active, setActive] = useState(0);
  const labels = ["Frente", "Labios", "Pecho"];
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % 3), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-5 rounded-2xl bg-[#f0e8d8] p-4"
    >
      <p className="text-center text-[12px] tracking-wide text-[#8a6f3a]">
        Signa con tres pequeñas cruces mientras dices en silencio:
      </p>
      <div className="mt-3 flex items-center justify-center gap-6">
        {labels.map((l, i) => (
          <div key={l} className="flex flex-col items-center gap-1.5">
            <motion.div
              animate={{ scale: active === i ? 1.2 : 0.8, opacity: active === i ? 1 : 0.4 }}
              transition={{ duration: 0.6 }}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: active === i ? "#8a5a2a26" : "transparent" }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#8a5a2a" strokeWidth={2.4} strokeLinecap="round">
                <path d="M12 5v14M7 10h10" />
              </svg>
            </motion.div>
            <span className="text-[10px] text-[#8a6f3a]">{l}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
