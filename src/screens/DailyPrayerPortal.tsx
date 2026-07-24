import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { assetsByTag } from "../media/registry";
import type { WhatsAppAsset } from "../media/types";
import type { AngelusLiturgy, DailyLiturgy, HourLiturgy, HourPart } from "../liturgy/types";

type HourKind = "laudes" | "angelus" | "vespers" | "compline";

type Props = {
  kind: HourKind;
  liturgy: DailyLiturgy | null;
  assets: WhatsAppAsset[];
  onClose: () => void;
  onComplete: () => void;
};

const HOUR_META: Record<HourKind, { label: string; mood: "dawn" | "noon" | "dusk" | "night"; icon: string }> = {
  laudes: { label: "Laudes", mood: "dawn", icon: "🌅" },
  angelus: { label: "Ángelus", mood: "noon", icon: "🕊️" },
  vespers: { label: "Vísperas", mood: "dusk", icon: "🌇" },
  compline: { label: "Completas", mood: "night", icon: "🌙" },
};

export function DailyPrayerPortal({ kind, liturgy, assets, onClose, onComplete }: Props) {
  const meta = HOUR_META[kind];
  const hour: HourLiturgy | undefined =
    kind === "laudes" ? liturgy?.laudes : kind === "vespers" ? liturgy?.vespers : kind === "compline" ? liturgy?.compline : undefined;
  const angelus: AngelusLiturgy | undefined = kind === "angelus" ? liturgy?.angelus : undefined;
  const mood = hour?.mood ?? meta.mood;

  const isAngelus = kind === "angelus";
  const angelusAudio = useMemo(() => {
    if (angelus?.audioUrl) return angelus.audioUrl;
    const a = assetsByTag("angelus", assets)[0];
    return a?.audioUrl;
  }, [angelus, assets]);

  const [partIndex, setPartIndex] = useState(0);
  const [verseIndex, setVerseIndex] = useState(0);

  const parts = hour?.parts ?? [];
  const verses = angelus?.verses ?? [];
  const total = isAngelus ? Math.max(verses.length, 1) : Math.max(parts.length, 1);
  const current = isAngelus ? verseIndex : partIndex;
  const isLast = current >= total - 1;

  const goNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    if (isAngelus) setVerseIndex((v) => Math.min(v + 1, verses.length - 1));
    else setPartIndex((p) => Math.min(p + 1, parts.length - 1));
  };
  const goPrev = () => {
    if (isAngelus) setVerseIndex((v) => Math.max(v - 1, 0));
    else setPartIndex((p) => Math.max(p - 1, 0));
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden text-white">
      <AmbientSky mood={mood} />

      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 pb-2 pt-12">
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">{meta.label}</span>
        </div>
        <div className="min-w-[44px] text-right text-xs tabular-nums text-white/60">{current + 1}/{total}</div>
      </header>

      <div className="relative z-10 mx-5 h-1 shrink-0 overflow-hidden rounded-full bg-white/15">
        <motion.div className="h-full rounded-full bg-white/90" animate={{ width: `${((current + 1) / total) * 100}%` }} transition={{ type: "spring", stiffness: 90, damping: 22 }} />
      </div>

      <div className="no-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto px-7 py-6">
        <AnimatePresence mode="wait">
          {isAngelus ? (
            <motion.div key={`v-${verseIndex}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="min-h-full">
              <AngelusView
                angelus={angelus}
                verseIndex={verseIndex}
                setVerseIndex={setVerseIndex}
                audioUrl={angelusAudio}
                audioLabel={angelus?.audioLabel}
              />
            </motion.div>
          ) : (
            <motion.div key={`p-${partIndex}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="min-h-full">
              {parts[partIndex] ? <PartView part={parts[partIndex]} /> : <EmptyHour label={meta.label} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 shrink-0 border-t border-white/10 bg-black/25 px-6 pb-8 pt-4 backdrop-blur">
        <motion.button whileTap={{ scale: 0.97 }} onClick={goNext} className="flex h-14 w-full items-center justify-center rounded-full bg-white text-[15px] font-semibold text-[#1c1c1e] shadow-lg transition active:scale-[0.99]">
          {isLast ? `He rezado ${meta.label}` : "Continuar"}
        </motion.button>
        {current > 0 && (
          <button onClick={goPrev} className="mt-1 h-10 w-full text-xs text-white/60 transition hover:text-white">← Anterior</button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Ángelus ------------------------------ */

function AngelusView({
  angelus,
  verseIndex,
  setVerseIndex,
  audioUrl,
  audioLabel,
}: {
  angelus?: AngelusLiturgy;
  verseIndex: number;
  setVerseIndex: (n: number) => void;
  audioUrl?: string;
  audioLabel?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const verses = angelus?.verses ?? [];

  // asigna fracciones si el prompt no las trajo
  const withAt = useMemo(
    () =>
      verses.map((v, i) => ({
        ...v,
        at: typeof v.at === "number" ? v.at : verses.length ? i / verses.length : 0,
      })),
    [verses],
  );

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    const onTime = () => {
      if (!el.duration) return;
      const p = el.currentTime / el.duration;
      let idx = 0;
      for (let i = 0; i < withAt.length; i++) if (withAt[i].at <= p + 0.001) idx = i;
      setVerseIndex(idx);
    };
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [audioUrl, withAt, setVerseIndex]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      await el.play();
      setPlaying(true);
    }
  };

  const v = withAt[verseIndex];

  return (
    <div className="flex min-h-full flex-col">
      {audioUrl && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
          <button onClick={toggle} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1c1c1e]" aria-label={playing ? "Pausar" : "Reproducir"}>
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{audioLabel ?? "Ángelus · Papa Francisco"}</div>
            <div className="text-[11px] text-white/55">Audio sincronizado con el texto</div>
          </div>
          <audio ref={audioRef} src={audioUrl} preload="metadata" />
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Verso {verseIndex + 1} de {withAt.length || 1}</p>
        {v ? (
          <>
            <p className="font-serif-holy text-[24px] leading-[1.4] text-white">{v.leader}</p>
            {v.response && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-5 border-l-2 border-white/40 pl-4 font-serif-holy text-[20px] italic text-white/85">
                R. {v.response}
              </motion.p>
            )}
          </>
        ) : (
          <p className="font-serif-holy text-[22px] leading-relaxed text-white/90">{angelus?.body ?? "El Ángel del Señor anunció a María…"}</p>
        )}
      </div>

      {angelus?.closingPrayer && verseIndex === withAt.length - 1 && (
        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          <p className="font-serif-holy text-[16px] leading-relaxed text-white/90">{angelus.closingPrayer}</p>
        </div>
      )}

      {/* puntos de progreso de versos */}
      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        {withAt.map((_, i) => (
          <button key={i} onClick={() => setVerseIndex(i)} className={`h-1.5 rounded-full transition-all ${i === verseIndex ? "w-5 bg-white" : "w-1.5 bg-white/30"}`} aria-label={`Verso ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Hora litúrgica --------------------------- */

const RUBRIC: Record<HourPart["kind"], string> = {
  invitatory: "Invitatorio",
  hymn: "Himno",
  psalmody: "Salmodia",
  reading: "Lectura breve",
  gospelCanticle: "Cántico evangélico",
  intercessions: "Preces",
  ourFather: "Padre nuestro",
  concludingPrayer: "Oración conclusiva",
  marianAntiphon: "Antífona mariana",
  examination: "Examen de conciencia",
  commendation: "Encomienda",
  response: "Respuesta",
};

function PartView({ part }: { part: HourPart }) {
  return (
    <div className="flex min-h-full flex-col justify-center">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">{part.label || RUBRIC[part.kind]}</p>
      {part.rubric && <p className="mb-3 text-[13px] italic text-white/55">{part.rubric}</p>}
      <p className="whitespace-pre-line font-serif-holy text-[22px] leading-[1.5] text-white">{part.text}</p>
      {part.response && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-5 border-l-2 border-white/40 pl-4 font-serif-holy text-[19px] italic text-white/85">
          R. {part.response}
        </motion.p>
      )}
    </div>
  );
}

function EmptyHour({ label }: { label: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center text-center">
      <p className="font-serif-holy text-[24px] leading-relaxed text-white/90">
        Los {label} de hoy aún no están disponibles. Pulsa «Generar con Gemini» en el inicio.
      </p>
    </div>
  );
}

/* --------------------------- Cielo ambientado --------------------------- */

function AmbientSky({ mood }: { mood: "dawn" | "noon" | "dusk" | "night" }) {
  const bg: Record<string, string> = {
    dawn: "linear-gradient(180deg,#3a4a6b 0%,#8a6f7a 45%,#d9a06a 100%)",
    noon: "linear-gradient(180deg,#3f7fa0 0%,#7fb4c8 55%,#e6d8a8 100%)",
    dusk: "linear-gradient(180deg,#2a2440 0%,#7a4a6a 50%,#d98a4a 100%)",
    night: "linear-gradient(180deg,#0a0e1e 0%,#1a2138 60%,#2a3350 100%)",
  };
  return (
    <div className="absolute inset-0" style={{ background: bg[mood] }}>
      {/* estrellas en noche / vísperas tardías */}
      {(mood === "night" || mood === "dusk") &&
        Array.from({ length: 40 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 55}%`, width: i % 4 === 0 ? 2.5 : 1.5, height: i % 4 === 0 ? 2.5 : 1.5 }}
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 2.5 + (i % 5), repeat: Infinity, delay: (i % 7) * 0.3 }}
          />
        ))}
      {/* sol / luna */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: mood === "dawn" ? "18%" : mood === "dusk" ? "70%" : "50%",
          top: mood === "noon" ? "16%" : mood === "night" ? "14%" : "40%",
          width: mood === "night" ? 64 : 96,
          height: mood === "night" ? 64 : 96,
          background:
            mood === "night"
              ? "radial-gradient(circle at 38% 38%,#f3f0e0,#cfc8ad)"
              : mood === "noon"
                ? "radial-gradient(circle,#fff6d0,#f2c873)"
                : "radial-gradient(circle,#ffe2a8,#e08a4a)",
          boxShadow: mood === "night" ? "0 0 60px 10px #f3f0e033" : "0 0 90px 20px #ffd98a55",
        }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* halo inferior */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}
