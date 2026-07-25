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

  const isSoundCloud = useMemo(() => {
    if (!audioUrl) return false;
    return /soundcloud\.com/.test(audioUrl);
  }, [audioUrl]);

  if (isSoundCloud) {
    return (
      <SoundCloudAngelus
        angelus={angelus}
        audioUrl={audioUrl}
        audioLabel={audioLabel}
        verses={withAt}
        verseIndex={verseIndex}
        setVerseIndex={setVerseIndex}
        isImmersive={isImmersive}
      />
    );
  }

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
        Los {label} aún no están disponibles en este momento.
      </p>
    </div>
  );
}

/* --------------------------- SoundCloud Ángelus --------------------------- */

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

const SC_ANGELUS_URL = "https://soundcloud.com/opusdei/angelus-con-el-papa-francisco";

function SoundCloudAngelus({
  audioUrl,
  audioLabel,
  verses,
  verseIndex,
  setVerseIndex,
  isImmersive,
}: {
  angelus?: AngelusLiturgy;
  audioUrl: string;
  audioLabel?: string;
  verses: { at?: number; leader?: string; response?: string }[];
  verseIndex: number;
  setVerseIndex: (n: number) => void;
  isImmersive?: boolean;
}) {
  const widgetRef = useRef<HTMLIFrameElement>(null);
  const widgetInstanceRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const activeLine = useMemo(() => {
    const t = currentTime;
    let idx = 0;
    for (let i = 0; i < angelusLyrics.length; i++) {
      if (t >= angelusLyrics[i].start) idx = i;
    }
    return idx;
  }, [currentTime]);

  useEffect(() => {
    setVerseIndex(activeLine);
  }, [activeLine, setVerseIndex]);

  useEffect(() => {
    const scriptId = "sc-widget-api";
    if (document.getElementById(scriptId)) {
      window.addEventListener("load", initWidget, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    document.body.appendChild(script);
    window.addEventListener("load", initWidget, { once: true });
    return () => {
      window.removeEventListener("load", initWidget);
    };
  }, []);

  const initWidget = () => {
    const el = widgetRef.current;
    if (!el) return;
    // @ts-ignore
    const SC = window.SC;
    if (!SC || !SC.Widget) return;
    const widget = SC.Widget(el);
    widgetInstanceRef.current = widget;

    widget.bind(SC.Widget.Events.READY, () => {
      setReady(true);
      widget.getDuration((d: any) => setDuration(d));
    });

    widget.bind(SC.Widget.Events.PLAY_PROGRESS, (e: any) => {
      setCurrentTime(e.currentPosition / 1000);
    });

    widget.bind(SC.Widget.Events.PLAY, () => setPlaying(true));
    widget.bind(SC.Widget.Events.PAUSE, () => setPlaying(false));
    widget.bind(SC.Widget.Events.FINISH, () => setPlaying(false));
  };

  const toggle = async () => {
    const widget = widgetInstanceRef.current;
    if (!widget) return;
    if (playing) {
      widget.pause();
    } else {
      widget.play();
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isImmersive) {
    return (
      <div className="flex min-h-full flex-col">
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
          <div className="text-right text-xs tabular-nums text-white/60">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
          </div>
        </div>

        <div className="relative z-10 mx-5 h-1 shrink-0 overflow-hidden rounded-full bg-white/15">
          <motion.div className="h-full rounded-full bg-white/90" animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 90, damping: 22 }} />
        </div>

        <div className="no-scrollbar relative z-10 mt-6 flex-1 overflow-y-auto px-1 py-2">
          <div className="mx-auto max-w-2xl space-y-5">
            {angelusLyrics.map((line, i) => {
              const isActive = i === activeLine;
              const isPast = i < activeLine;
              return (
                <motion.p
                  key={i}
                  animate={{ opacity: isActive ? 1 : isPast ? 0.5 : 0.35, scale: isActive ? 1.02 : 1 }}
                  transition={{ duration: 0.35 }}
                  className={`font-serif-holy text-center text-[22px] leading-relaxed transition-colors ${
                    isActive ? "text-white" : "text-white/70"
                  }`}
                >
                  {line.text}
                </motion.p>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Progreso</span>
            <span className="text-xs tabular-nums text-white/90">{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}</span>
          </div>
        </div>

        <iframe
          ref={widgetRef}
          id="sc-angelus-widget"
          width="100%"
          height="166"
          scrolling="no"
          frameborder="no"
          allow="autoplay"
          style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
          src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/opusdei/angelus-con-el-papa-francisco&color=%23d4af6a&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={toggle}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_0_0_2px_rgba(212,175,106,0.35)] transition hover:shadow-[0_0_0_4px_rgba(212,175,106,0.55)]"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#1c1c1e]" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 text-[#1c1c1e]" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div>
          <div className="font-serif-holy text-lg text-[#1c1c1e]">{audioLabel ?? "Ángelus · Papa Francisco"}</div>
          <div className="text-xs text-[#8a8a90]">Audio sincronizado con el texto</div>
        </div>
      </div>

      <div className="relative z-10 mx-5 h-1.5 shrink-0 overflow-hidden rounded-full bg-[#e5e5e5]">
        <motion.div className="h-full rounded-full bg-[#d4af6a]" animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 90, damping: 22 }} />
      </div>

      <div className="no-scrollbar relative z-10 mt-8 flex-1 overflow-y-auto px-2 py-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {angelusLyrics.map((line, i) => {
            const isActive = i === activeLine;
            const isPast = i < activeLine;
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => {
                  const t = line.start;
                  const widget = widgetInstanceRef.current;
                  if (widget && ready) widget.seekTo(t * 1000);
                }}
                animate={{
                  opacity: isActive ? 1 : isPast ? 0.45 : 0.25,
                  scale: isActive ? 1.02 : 1,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className={`w-full text-left font-serif-holy text-center text-[28px] leading-[1.6] transition-colors focus:outline-none ${
                  isActive ? "text-[#1c1c1e]" : "text-[#8a8a90]"
                }`}
              >
                {line.text}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 shrink-0 border-t border-[#e6e3db] bg-white/60 px-6 pb-10 pt-6 backdrop-blur-sm">
        <div className="mx-auto max-w-xs">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggle}
            className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-[#d4af6a] shadow-[0_10px_30px_rgba(212,175,106,0.4)] transition active:scale-[0.97]"
            aria-label={playing ? "Pausar" : "Reproducir"}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 text-white" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </motion.button>
          <p className="mt-4 text-center text-xs text-[#9a9a9f]">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
          </p>
        </div>
      </div>

      <iframe
        ref={widgetRef}
        id="sc-angelus-widget"
        width="100%"
        height="166"
        scrolling="no"
        frameborder="no"
        allow="autoplay"
        style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
        src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/opusdei/angelus-con-el-papa-francisco&color=%23d4af6a&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false"
      />
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

function AngelusAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #e8f0f8 0%, #f5f7fa 30%, #ffffff 100%)",
        }}
        animate={{ opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212,175,106,0.18) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/3"
        style={{
          background: "linear-gradient(to top, rgba(232,240,248,0.9), transparent)",
        }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
