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

function getYouTubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  let m = trimmed.match(/[?&]v=([^&]+)/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`;
  m = trimmed.match(/youtu\.be\/([^?&#]+)/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`;
  m = trimmed.match(/youtube\.com\/embed\/([^?&#]+)/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`;
  return null;
}

export function DailyPrayerPortal({ kind, liturgy, assets, onClose, onComplete }: Props) {
  const meta = HOUR_META[kind];
  const hour: HourLiturgy | undefined =
    kind === "laudes" ? liturgy?.laudes : kind === "vespers" ? liturgy?.vespers : kind === "compline" ? liturgy?.compline : undefined;
  const angelus: AngelusLiturgy | undefined = kind === "angelus" ? liturgy?.angelus : undefined;
  const mood = hour?.mood ?? meta.mood;
  const isAngelus = kind === "angelus";
  const isLaudes = kind === "laudes";

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

  const dawnColors = {
    sky: "from-[#fef3e2] via-[#fde4c8] to-[#f5d5a0]",
    accent: "#d4943a",
    accentLight: "#f5d78a",
    accentGlow: "rgba(212,148,58,0.15)",
    text: "#2a1f0e",
    textMuted: "#8a7a5a",
    cardBg: "rgba(255,255,255,0.6)",
    cardBorder: "rgba(212,148,58,0.2)",
    cardShadow: "rgba(212,148,58,0.08)",
  };

  const noonColors = {
    sky: "from-[#e8eef2] via-[#d0dce4] to-[#b8c8d0]",
    accent: "#4a7a8a",
    accentLight: "#8ab0c0",
    accentGlow: "rgba(74,122,138,0.15)",
    text: "#1c1c1e",
    textMuted: "#6b6b70",
    cardBg: "rgba(255,255,255,0.6)",
    cardBorder: "rgba(74,122,138,0.2)",
    cardShadow: "rgba(74,122,138,0.08)",
  };

  const duskColors = {
    sky: "from-[#2a2438] via-[#4a3a52] to-[#6a4a62]",
    accent: "#c49a6a",
    accentLight: "#e0b88a",
    accentGlow: "rgba(196,154,106,0.2)",
    text: "#f0e8d8",
    textMuted: "#a09080",
    cardBg: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(196,154,106,0.25)",
    cardShadow: "rgba(0,0,0,0.2)",
  };

  const nightColors = {
    sky: "from-[#0e1420] via-[#1a2438] to-[#2a3a52]",
    accent: "#8ab4d0",
    accentLight: "#b0d0e0",
    accentGlow: "rgba(138,180,208,0.15)",
    text: "#e8e0d0",
    textMuted: "#8a8070",
    cardBg: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(138,180,208,0.2)",
    cardShadow: "rgba(0,0,0,0.3)",
  };

  const palette = { dawn: dawnColors, noon: noonColors, dusk: duskColors, night: nightColors }[mood] ?? dawnColors;

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-gradient-to-b from-[#fef3e2] via-[#fde4c8] to-[#f5d5a0] text-[#2a1f0e]">
      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 pb-2 pt-12">
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-black/5" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.icon}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: palette.accent }}>{meta.label}</span>
          </div>
          {!isAngelus && hour?.hour && (
            <span className="text-[10px] tabular-nums" style={{ color: palette.accent, opacity: 0.7 }}>{hour.hour}</span>
          )}
        </div>
        <div className="min-w-[44px] text-right text-xs tabular-nums" style={{ color: palette.textMuted }}>{current + 1}/{total}</div>
      </header>

      {showSteps && (
        <div className="relative z-10 flex shrink-0 justify-center gap-2 px-6 pb-3">
          {parts.map((_, i) => (
            <button
              key={i}
              onClick={() => setPartIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === partIndex
                  ? "w-6 shadow-sm"
                  : i < partIndex
                    ? "w-2"
                    : "w-2"
              }`}
              style={i === partIndex ? { background: palette.accent, boxShadow: `0 0 12px ${palette.accentGlow}` } : i < partIndex ? { background: palette.accent, opacity: 0.5 } : { background: "rgba(0,0,0,0.08)" }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 mx-5 h-1 shrink-0 overflow-hidden rounded-full" style={{ background: palette.cardBorder }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: palette.accent }}
          animate={{ width: `${((current + 1) / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 22 }}
        />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-5 py-6">
        {isAngelus ? (
          <AngelusView
            setVerseIndex={setVerseIndex}
            audioUrl={angelusAudio}
            audioLabel={angelus?.audioLabel}
            onPlayPause={togglePlay}
            onSeek={seekTo}
            isPlaying={isPlaying}
            currentTime={currentTime}
            palette={palette}
          />
        ) : (
          <LaudesView
            hour={hour}
            partIndex={partIndex}
            laudesAudio={laudesAudio}
            laudesPlaying={laudesPlaying}
            onPlayPause={toggleLaudesPlay}
            palette={palette}
            label={meta.label}
            icon={meta.icon}
          />
        )}
      </div>

      <div className="relative z-10 shrink-0 border-t px-5 py-4" style={{ borderColor: palette.cardBorder, background: palette.cardBg, backdropFilter: "blur(12px)" }}>
        <div className="flex gap-3">
          {current > 0 && (
            <button
              onClick={goPrev}
              className="h-12 flex-1 rounded-xl border text-sm font-medium transition active:scale-[0.98]"
              style={{ borderColor: palette.cardBorder, background: palette.cardBg, color: palette.text }}
            >
              ← Anterior
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={goNext}
            className="h-12 flex-1 rounded-xl text-[15px] font-semibold shadow-sm transition active:scale-[0.99]"
            style={{ background: palette.accent, color: "#fff", boxShadow: `0 4px 16px ${palette.accentGlow}` }}
          >
            {isLast ? `He rezado ${meta.label}` : "Continuar"}
          </motion.button>
        </div>
      </div>

      {isAngelus && <audio ref={audioRef} src={angelusAudio} preload="auto" playsInline className="absolute opacity-0 w-0 h-0 overflow-hidden pointer-events-none" />}
      {isLaudes && laudesAudio && (
        <audio ref={laudesAudioRef} src={laudesAudio} preload="auto" playsInline className="absolute opacity-0 w-0 h-0 overflow-hidden pointer-events-none" />
      )}
    </div>
  );
}

/* --------------------------- Laudes View --------------------------- */

function LaudesView({
  hour,
  partIndex,
  laudesAudio,
  laudesPlaying,
  onPlayPause,
  palette,
  label,
  icon,
}: {
  hour?: HourLiturgy;
  partIndex: number;
  laudesAudio?: string;
  laudesPlaying: boolean;
  onPlayPause: () => void;
  palette: Record<string, string>;
  label: string;
  icon: string;
}) {
  const part = hour?.parts?.[partIndex];
  const hasParts = Array.isArray(hour?.parts) && hour.parts.length > 0;
  const isVideo = (part as any)?.type === "video" || (part as any)?.kind === "video";
  const videoContent = (part as any)?.content;
  const partKind = (part as any)?.kind || (part as any)?.type || "reading";

  if (!hour) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${palette.accentGlow}, transparent 70%)` }} />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${palette.accentLight}, ${palette.accent})`, boxShadow: `0 8px 32px ${palette.accentGlow}` }}>
            <span className="text-3xl">{icon}</span>
          </div>
        </div>
        <p className="font-serif-holy text-[22px] leading-relaxed" style={{ color: palette.text }}>
          {label} aún no están disponibles.
        </p>
      </div>
    );
  }

  if (!hasParts) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${palette.accentGlow}, transparent 70%)` }} />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${palette.accentLight}, ${palette.accent})`, boxShadow: `0 8px 32px ${palette.accentGlow}` }}>
            <span className="text-3xl">{icon}</span>
          </div>
        </div>
        <p className="font-serif-holy text-[22px] leading-relaxed" style={{ color: palette.text }}>
          La oración de {label} está en preparación.
        </p>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-4">✨</span>
        <p className="font-serif-holy text-[22px] leading-relaxed" style={{ color: palette.text }}>Fin de la oración.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {laudesAudio && (
        <div className="mb-8 flex flex-col items-center">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onPlayPause}
            className="relative flex h-20 w-20 items-center justify-center rounded-full shadow-xl transition-shadow hover:shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${palette.accentLight}, ${palette.accent})`, boxShadow: `0 8px 32px ${palette.accentGlow}, 0 2px 8px rgba(0,0,0,0.1)` }}
          >
            {laudesPlaying ? (
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.button>
          <p className="mt-3 text-[11px] font-medium tracking-wide" style={{ color: palette.textMuted }}>
            {laudesPlaying ? "Reproduciendo" : "Tocar audio"}
          </p>
        </div>
      )}

      <motion.div
        key={partIndex}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-6"
        style={{ background: palette.cardBg, border: `1px solid ${palette.cardBorder}`, boxShadow: `0 2px 16px ${palette.cardShadow}` }}
      >
        <div className="flex flex-col gap-1 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: palette.accent }}>
            {part.label || RUBRIC[partKind as keyof typeof RUBRIC] || "Contenido"}
          </p>
          {part.rubric && (
            <p className="font-serif-holy text-[14px] italic leading-relaxed" style={{ color: palette.textMuted }}>
              {part.rubric}
            </p>
          )}
        </div>

        {isVideo && (
          <div className="mt-2">
            {videoContent ? (() => {
              const ytEmbed = getYouTubeEmbedUrl(videoContent);
              if (ytEmbed) {
                return (
                  <iframe
                    src={ytEmbed}
                    title="Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full rounded-xl aspect-video"
                    style={{ background: "#000", border: "none" }}
                  />
                );
              }
              return (
                <video controls src={videoContent} className="w-full rounded-xl" style={{ background: "#000" }} />
              );
            })() : (
              <p className="font-serif-holy text-[20px] leading-relaxed" style={{ color: palette.text }}>
                El video de esta sección estará disponible pronto.
              </p>
            )}
          </div>
        )}

        {!isVideo && part.text && (
          <p className="whitespace-pre-line font-serif-holy text-[26px] leading-[1.7] tracking-wide" style={{ color: palette.text }}>
            {part.text}
          </p>
        )}

        {!isVideo && !part.text && (
          <p className="whitespace-pre-line font-serif-holy text-[20px] leading-relaxed" style={{ color: palette.textMuted }}>
            {videoContent || "Contenido no disponible."}
          </p>
        )}

        {part.response && !isVideo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-8 rounded-2xl p-5"
            style={{ background: `linear-gradient(135deg, ${palette.accentGlow}, transparent)`, border: `1px solid ${palette.cardBorder}` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accent }}>Respuesta</p>
            <p className="mt-2 font-serif-holy text-[20px] italic leading-relaxed" style={{ color: palette.text }}>
              R. {part.response}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/* --------------------------- Ángelus View --------------------------- */

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

function AngelusView({
  setVerseIndex,
  audioUrl,
  audioLabel,
  onPlayPause,
  onSeek,
  isPlaying,
  currentTime,
  palette,
}: {
  setVerseIndex: (n: number) => void;
  audioUrl?: string;
  audioLabel?: string;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  currentTime: number;
  palette: Record<string, string>;
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

  return (
    <div className="flex flex-col items-center">
      {audioLabel && (
        <div className="mb-5 flex items-center justify-center gap-2 rounded-full border px-4 py-1.5" style={{ borderColor: palette.cardBorder, background: palette.cardBg }}>
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: palette.accent }} />
          <p className="text-[12px] font-medium tracking-wide" style={{ color: palette.text }}>{audioLabel}</p>
        </div>
      )}

      {audioUrl && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onPlayPause}
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-shadow hover:shadow-xl"
          style={{ background: `linear-gradient(135deg, ${palette.accentLight}, ${palette.accent})`, boxShadow: `0 4px 20px ${palette.accentGlow}` }}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </motion.button>
      )}

      <div className="w-full max-w-md space-y-4 text-center">
        {angelusLyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isPast = idx < activeIndex;
          return (
            <div
              key={idx}
              ref={(el) => { lineRefs.current[idx] = el; }}
              onClick={() => onSeek(line.start)}
              className={`cursor-pointer transition-all duration-500 ${
                isActive
                  ? "scale-[1.02] text-[22px] font-bold leading-relaxed"
                  : isPast
                    ? "text-[18px] leading-relaxed"
                    : "text-[18px] leading-relaxed"
              }`}
              style={{
                color: isActive ? palette.text : isPast ? palette.textMuted : "rgba(138,122,90,0.5)",
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- Rubric mapping --------------------------- */

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
  video: "Video",
};