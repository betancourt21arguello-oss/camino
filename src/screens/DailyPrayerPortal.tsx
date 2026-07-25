import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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

const R2_ANGELUS_AUDIO_URL = "https://pub-8fb2af7acc7246b4b90aa917bb377f90.r2.dev/Angelus-Papa-Francisco.MP3";

export function DailyPrayerPortal({ kind, liturgy, assets, onClose, onComplete }: Props) {
  const meta = HOUR_META[kind];
  const hour: HourLiturgy | undefined =
    kind === "laudes" ? liturgy?.laudes : kind === "vespers" ? liturgy?.vespers : kind === "compline" ? liturgy?.compline : undefined;
  const angelus: AngelusLiturgy | undefined = kind === "angelus" ? liturgy?.angelus : undefined;
  const mood = hour?.mood ?? meta.mood;
  const isAngelus = kind === "angelus";

  const angelusAudio = useMemo(() => {
    if (angelus?.audioUrl && angelus.audioUrl.trim().length > 0 && !angelus.audioUrl.includes("soundcloud.com")) {
      return angelus.audioUrl;
    }
    const a = assetsByTag("angelus", assets)[0];
    if (a?.audioUrl && a.audioUrl.trim().length > 0 && !a.audioUrl.includes("soundcloud.com")) {
      return a.audioUrl;
    }
    return R2_ANGELUS_AUDIO_URL;
  }, [angelus, assets]);

  const laudesAudio = useMemo(() => {
    if (kind !== "laudes") return undefined;
    const a = assetsByTag("laudes", assets)[0];
    if (a?.audioUrl && a.audioUrl.trim().length > 0) {
      return a.audioUrl;
    }
    return undefined;
  }, [kind, assets]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [laudesPlaying, setLaudesPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const laudesAudioRef = useRef<HTMLAudioElement>(null);

  const [partIndex, setPartIndex] = useState(0);
  const [verseIndex, setVerseIndex] = useState(0);

  const parts = hour?.parts ?? [];
  const verses = angelus?.verses ?? [];
  const total = isAngelus ? Math.max(verses.length, 1) : Math.max(parts.length, 1);
  const current = isAngelus ? verseIndex : partIndex;
  const isLast = current >= total - 1;
  const showSteps = !isAngelus && total > 1;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && audio.duration > 0) setCurrentTime(audio.duration);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const audio = laudesAudioRef.current;
    if (!audio || kind !== "laudes") return;
    const onPlay = () => setLaudesPlaying(true);
    const onPause = () => setLaudesPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    if (!isAngelus) return;
    const timer = setTimeout(() => {
      const audio = audioRef.current;
      if (audio) audio.play().catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [isAngelus]);

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

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const toggleLaudesPlay = () => {
    const audio = laudesAudioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const bgClass = {
    dawn: "bg-gradient-to-b from-[#f5f0e8] to-[#e8dcc8]",
    noon: "bg-gradient-to-b from-[#e8eef2] to-[#d0dce4]",
    dusk: "bg-gradient-to-b from-[#2a2438] to-[#4a3a52]",
    night: "bg-gradient-to-b from-[#141824] to-[#1e2438]",
  }[mood];

  const textPrimary = isAngelus ? "text-[#1c1c1e]" : "text-[#1c1c1e]";
  const textMuted = isAngelus ? "text-[#6b6b70]" : "text-[#6b6b70]";

  return (
    <div className={`absolute inset-0 z-40 flex flex-col overflow-hidden ${bgClass} ${textPrimary}`}>
      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 pb-3 pt-12">
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-black/5" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{meta.icon}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07a3c]">{meta.label}</span>
          </div>
          {!isAngelus && hour?.hour && (
            <span className="text-[10px] tabular-nums text-[#a07a3c]/70">{hour.hour}</span>
          )}
        </div>
        <div className={`min-w-[44px] text-right text-xs tabular-nums ${textMuted}`}>{current + 1}/{total}</div>
      </header>

      {showSteps && (
        <div className="relative z-10 flex shrink-0 justify-center gap-1.5 px-6 pb-2">
          {parts.map((_, i) => (
            <button
              key={i}
              onClick={() => setPartIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === partIndex
                  ? "w-6 bg-[#d4af6a] shadow-sm"
                  : i < partIndex
                    ? "w-2 bg-[#a07a3c]/40"
                    : "w-2 bg-black/10"
              }`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 mx-5 h-1 shrink-0 overflow-hidden rounded-full bg-black/10">
        <motion.div
          className="h-full rounded-full bg-[#d4af6a]"
          animate={{ width: `${((current + 1) / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 22 }}
        />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-5 py-6">
        {isAngelus ? (
          <AngelusMinimal
            angelus={angelus}
            verseIndex={verseIndex}
            setVerseIndex={setVerseIndex}
            audioUrl={angelusAudio}
            audioLabel={angelus?.audioLabel}
            onPlayPause={togglePlay}
            onSeek={seekTo}
            isPlaying={isPlaying}
            currentTime={currentTime}
            audioRef={audioRef}
          />
        ) : (
          <>
            {laudesAudio && kind === "laudes" && (
              <div className="mb-6 flex justify-center">
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={toggleLaudesPlay}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d4af6a] text-white shadow-xl"
                >
                  {laudesPlaying ? (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </motion.button>
              </div>
            )}
            <HourMinimal hour={hour} partIndex={partIndex} label={meta.label} />
          </>
        )}
      </div>

      <div className="relative z-10 shrink-0 border-t border-black/10 bg-white/80 px-5 pb-8 pt-4 backdrop-blur">
        <div className="flex gap-3">
          {current > 0 && (
            <button
              onClick={goPrev}
              className={`h-12 flex-1 rounded-xl border border-[#d4d0c8] bg-white text-sm font-medium transition active:scale-[0.98] ${textPrimary}`}
            >
              ← Anterior
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={goNext}
            className={`h-12 flex-1 rounded-xl text-[15px] font-semibold shadow-sm transition active:scale-[0.99] ${
              isLast ? "bg-[#1c1c1e] text-white shadow-lg" : "bg-[#d4af6a] text-white shadow-md"
            }`}
          >
            {isLast ? `He rezado ${meta.label}` : "Continuar"}
          </motion.button>
        </div>
      </div>

      {isAngelus && <audio ref={audioRef} src={angelusAudio} preload="auto" playsInline className="absolute opacity-0 w-0 h-0 overflow-hidden pointer-events-none" />}
      {kind === "laudes" && laudesAudio && (
        <audio ref={laudesAudioRef} src={laudesAudio} preload="auto" playsInline className="absolute opacity-0 w-0 h-0 overflow-hidden pointer-events-none" />
      )}
    </div>
  );
}

/* --------------------------- Ángelus minimal --------------------------- */

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
  { start: 70.44, end: 73.24, text: "Oh Padre, infunde en nuestra alma tu gracia." },
  { start: 73.24, end: 78.08, text: "Tú, que en la anunciación del Ángel nos has revelado la encarnación de tu Hijo," },
  { start: 78.08, end: 82.40, text: "por su pasión y su cruz condúcenos a la gloria de la resurrección." },
  { start: 82.40, end: 84.55, text: "Por Cristo, Nuestro Señor. Amén." },
];

function AngelusMinimal({
  angelus,
  verseIndex,
  setVerseIndex,
  audioUrl,
  audioLabel,
  onPlayPause,
  onSeek,
  isPlaying,
  currentTime,
  audioRef,
}: {
  angelus?: AngelusLiturgy;
  verseIndex: number;
  setVerseIndex: (n: number) => void;
  audioUrl?: string;
  audioLabel?: string;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  currentTime: number;
  audioRef: React.RefObject<HTMLAudioElement>;
}) {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const activeIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < angelusLyrics.length; i++) {
      if (currentTime >= angelusLyrics[i].start - 0.2) {
        idx = i;
      }
    }
    return idx;
  }, [currentTime]);

  useEffect(() => {
    setVerseIndex(activeIndex);
  }, [activeIndex, setVerseIndex]);

  useEffect(() => {
    const el = lineRefs.current[activeIndex];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-full flex-col items-center">
      {audioLabel && (
        <div className="mb-5 flex items-center justify-center gap-2 rounded-full border border-[#d4af6a]/30 bg-white/70 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#d4af6a]" />
          <p className="text-[12px] font-medium tracking-wide text-[#3c4a5e]">{audioLabel}</p>
        </div>
      )}

      {audioUrl && (
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onPlayPause}
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#d4af6a] text-white shadow-lg"
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </motion.button>
      )}

      <div className="w-full max-w-md space-y-5 text-center">
        {angelusLyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isPast = idx < activeIndex;
          return (
            <div
              key={idx}
              ref={(el) => (lineRefs.current[idx] = el)}
              onClick={() => onSeek(line.start)}
              className={`cursor-pointer transition-all duration-500 ${
                isActive
                  ? "scale-[1.02] text-[22px] font-bold leading-relaxed text-[#142642]"
                  : isPast
                    ? "text-[18px] leading-relaxed text-[#5a5a5e]"
                    : "text-[18px] leading-relaxed text-[#9a9a9f]"
              }`}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- Hora litúrgica minimal --------------------------- */

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

function HourMinimal({ hour, partIndex, label }: { hour?: HourLiturgy; partIndex: number; label: string }) {
  const part = hour?.parts?.[partIndex];

  if (!part) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="font-serif-holy text-[22px] leading-relaxed text-[#3a3a3e]">
          {hour ? "Fin de la oración." : `Los ${label} aún no están disponibles.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col justify-center">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07a3c]">
          {part.label || RUBRIC[part.kind]}
        </p>
        {part.rubric && (
          <p className="font-serif-holy text-[15px] italic leading-relaxed text-[#7a7a7e]">
            {part.rubric}
          </p>
        )}
      </div>
      <p className="mt-5 whitespace-pre-line font-serif-holy text-[24px] leading-[1.65] text-[#1c1c1e]">
        {part.text}
      </p>
      {part.response && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-8 rounded-2xl border border-[#d4af6a]/40 bg-[#fdfaf3] p-5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a07a3c]">Respuesta</p>
          <p className="mt-2 font-serif-holy text-[20px] italic leading-relaxed text-[#5a4a2a]">
            R. {part.response}
          </p>
        </motion.div>
      )}
    </div>
  );
}