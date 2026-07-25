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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
    }
  }, []);

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
    <div className={isAngelus ? "absolute inset-0 z-40 flex flex-col overflow-hidden text-[#1c1c1e]" : "absolute inset-0 z-40 flex flex-col overflow-hidden text-white"}>
      {isAngelus ? <AngelusAtmosphere /> : <AmbientSky mood={mood} />}

      <header className={`relative z-10 flex shrink-0 items-center justify-between px-5 pb-2 pt-12 ${isAngelus ? "" : ""}`}>
        <button
          onClick={onClose}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
            isAngelus ? "text-[#8a8a90] hover:bg-black/5" : "text-white/70 hover:bg-white/10"
          }`}
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isAngelus ? "text-[#a07a3c]" : "text-white/80"}`}>{meta.label}</span>
        </div>
        <div className={`min-w-[44px] text-right text-xs tabular-nums ${isAngelus ? "text-[#9a9a9f]" : "text-white/60"}`}>{current + 1}/{total}</div>
      </header>

      <div className={`relative z-10 mx-5 h-1 shrink-0 overflow-hidden rounded-full ${isAngelus ? "bg-[#e5e5e5]" : "bg-white/15"}`}>
        <motion.div
          className={`h-full rounded-full ${isAngelus ? "bg-[#d4af6a]" : "bg-white/90"}`}
          animate={{ width: `${((current + 1) / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 22 }}
        />
      </div>

      <div className={`no-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto ${isAngelus ? "px-2 py-4" : "px-7 py-6"}`}>
        <AnimatePresence mode="wait">
          {isAngelus ? (
            <motion.div key={`v-${verseIndex}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="min-h-full">
              <AngelusView
                angelus={angelus}
                verseIndex={verseIndex}
                setVerseIndex={setVerseIndex}
                audioUrl={angelusAudio}
                audioLabel={angelus?.audioLabel}
                isImmersive
              />
            </motion.div>
          ) : (
            <motion.div key={`p-${partIndex}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="min-h-full">
              {parts[partIndex] ? <PartView part={parts[partIndex]} /> : <EmptyHour label={meta.label} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`relative z-10 shrink-0 border-t px-6 pb-8 pt-4 backdrop-blur ${isAngelus ? "border-[#e6e3db] bg-white/60" : "border-white/10 bg-black/25"}`}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={goNext}
          className={`flex h-14 w-full items-center justify-center rounded-full text-[15px] font-semibold shadow-lg transition active:scale-[0.99] ${
            isAngelus
              ? "bg-[#d4af6a] text-white shadow-[0_8px_24px_rgba(212,175,106,0.35)]"
              : "bg-white text-[#1c1c1e] shadow-lg"
          }`}
        >
          {isLast ? `He rezado ${meta.label}` : "Continuar"}
        </motion.button>
        {current > 0 && (
          <button
            onClick={goPrev}
            className={`mt-1 h-10 w-full text-xs transition ${isAngelus ? "text-[#9a9a9f] hover:text-[#1c1c1e]" : "text-white/60 hover:text-white"}`}
          >
            ← Anterior
          </button>
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
  isImmersive,
}: {
  angelus?: AngelusLiturgy;
  verseIndex: number;
  setVerseIndex: (n: number) => void;
  audioUrl?: string;
  audioLabel?: string;
  isImmersive?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const verses = useMemo(() => {
    const base = angelus?.verses ?? angelusLyrics;
    return base.map((v, i) => ({
      text: v.leader ?? v.text,
      at: typeof v.at === "number" ? v.at : typeof (v as any).start === "number" ? (v as any).start : base.length ? i / base.length : 0,
    }));
  }, [angelus]);

  const activeLine = useMemo(() => {
    if (!duration) return 0;
    const p = currentTime / duration;
    let idx = 0;
    for (let i = 0; i < verses.length; i++) if (verses[i].at <= p + 0.001) idx = i;
    return idx;
  }, [currentTime, duration, verses]);

  useEffect(() => {
    setVerseIndex(activeLine);
  }, [activeLine, setVerseIndex]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onDuration = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onDuration);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onDuration);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        // autoplay bloqueado por el navegador
      }
    }
  };

  const seek = (t: number) => {
    const el = audioRef.current;
    if (el && duration > 0) {
      el.currentTime = Math.max(0, Math.min(t, duration));
      setCurrentTime(el.currentTime);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex min-h-full flex-col">
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1c1c1e] text-white transition active:scale-95"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-[#1c1c1e]">{audioLabel ?? "Ángelus · Papa Francisco"}</div>
          <div className="text-[11px] text-[#9a9a9f]">Audio sincronizado</div>
        </div>
        <div className="text-right text-[11px] tabular-nums text-[#9a9a9f]">
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
        </div>
      </div>

      <div className="relative mb-8 h-1 w-full cursor-pointer overflow-hidden rounded-full bg-[#e5e5e5]">
        <div className="h-full rounded-full bg-[#d4af6a] transition-all duration-300" style={{ width: `${progress}%` }} />
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-1 py-2">
        <div className="mx-auto max-w-2xl space-y-5">
          {verses.map((line, i) => {
            const isActive = i === activeLine;
            const isPast = i < activeLine;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const t = line.at * duration;
                  if (t > 0) seek(t);
                }}
                className="w-full text-left font-serif-holy text-center text-[22px] leading-[1.6] transition-all duration-500 focus:outline-none"
                style={{ opacity: isActive ? 1 : isPast ? 0.45 : 0.25 }}
              >
                {line.text}
              </button>
            );
          })}
        </div>
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
        Los {label} aún no están disponibles en este momento.
      </p>
    </div>
  );
}

/* --------------------------- Letras Ángelus --------------------------- */

const angelusLyrics = [
  { start: 0, end: 2.81, text: "El ángel del Señor anunció a María." },
  { start: 3.69, end: 5.64, text: "Y concibió por obra y gracia del Espíritu Santo." },
  { start: 5.64, end: 22.24, text: "Dios te salve, María..." },
  { start: 22.24, end: 24.44, text: "He aquí la esclava del Señor." },
  { start: 24.44, end: 26.62, text: "Hágase en mí según tu palabra." },
  { start: 26.62, end: 41.98, text: "Dios te salve, María..." },
  { start: 41.98, end: 43.96, text: "Y el Verbo de Dios se hizo carne." },
  { start: 43.96, end: 45.40, text: "Y habitó entre nosotros." },
  { start: 45.40, end: 62.10, text: "Dios te salve, María..." },
  { start: 62.10, end: 64.74, text: "Ruega por nosotros, Santa Madre de Dios," },
  { start: 64.74, end: 69.50, text: "para que seamos dignos de alcanzar las promesas de Jesucristo." },
  { start: 69.50, end: 70.44, text: "Oremos." },
  { start: 70.44, end: 73.24, text: "Oh Padre, Infunde en nuestra alma tu gracia." },
  { start: 73.24, end: 78.08, text: "Tú, que en la anunciación del Ángel nos has revelado la encarnación de tu Hijo," },
  { start: 78.08, end: 82.40, text: "por su pasión y su cruz condúcenos a la gloria de la resurrección." },
  { start: 82.40, end: 84.55, text: "Por Cristo, Nuestro Señor. Amén." },
];

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

function AngelusAtmosphere() {
  return (
    <div className="absolute inset-0 bg-[#fafaf9]">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f5f0e6]/80 to-transparent" />
    </div>
  );
}
