import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "../../components/Avatar";
import { RosaryRing } from "../../components/RosaryRing";
import type { RosarioApi } from "../../engine/useRosario";
import { CommunityWorkSvg } from "../../community/CommunityWorkSvg";
import { useCommunityWork } from "../../community/useCommunityWork";
import { WorkCompleteOverlay } from "../../community/WorkCompleteOverlay";
import { COMPOSITION_LABELS } from "../../community/composition";
import { PrayerNavBar } from "./PrayerNavBar";
import { usePrayerVoiceControl } from "../../engine/usePrayerVoiceControl";
import { keywordsForStep } from "../../engine/keywords";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.max(0, Math.floor(s % 60));
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function LiveSession({
  rosario,
  intentions = [],
  onOpenGallery,
}: {
  rosario: RosarioApi;
  intentions?: string[];
  onOpenGallery?: () => void;
}) {
  const { state, current, myRole, membersSample, meta } = rosario;
  const [holding, setHolding] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const sessionKey = useMemo(() => `session-${meta.title}-${state.mode}`, []);

  const work = useCommunityWork({
    active: state.status === "running" || state.status === "completed",
    sessionKey,
    members: membersSample,
    intentionsCount: intentions.length,
    aveMarias: Math.max(10, state.flatIndex * 3 + state.repeatIndex),
    season: "ordinary",
    intentionTheme: intentions[0] ?? "paz",
    completed: state.status === "completed",
  });

  const step = current?.step ?? null;
  const isReflection = step?.type === "reflection";
  const isRepeat = !!step?.repeat;

  const stepKeywords = useMemo(
    () => (step && !isReflection ? keywordsForStep(step) : []),
    [step, isReflection],
  );
  const advanceByVoice = () => {
    work.offerMyPrayer();
    rosario.markDone();
  };
  const voice = usePrayerVoiceControl(stepKeywords, advanceByVoice);

  useEffect(() => {
    if (state.status === "completed" && work.savedWork) setShowComplete(true);
  }, [state.status, work.savedWork]);

  if (!current || !step) return null;

  const releasePrayer = () => {
    setHolding(false);
    work.offerMyPrayer();
    rosario.markDone();
  };

  const remaining = Math.max(0, (step.duration ?? 0) - state.stepElapsed);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0a0a0b] text-white landscape:h-auto landscape:flex-row landscape:overflow-auto">
      {/* TOP BAR */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 pt-[env(safe-area-inset-top)] landscape:w-48 landscape:h-full landscape:flex-col landscape:border-b-0 landscape:border-r">
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1">
          <span className="flex -space-x-1.5">
            {membersSample.slice(0, 2).map((m) => (
              <Avatar key={m.id} name={m.isMe ? "Tú" : "A"} hue={m.hue} size={16} />
            ))}
          </span>
          <span className="text-xs font-medium text-[#5fce7e]">{state.participants}</span>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5fce7e]" />
        </div>

        {intentions.length > 0 ? (
          <div className="flex min-w-0 flex-1 items-center gap-1 truncate px-1 text-center">
            <span className="text-[10px] tracking-wide text-[var(--gold)]">🕯️</span>
            <span className="truncate text-xs text-white/70">
              {intentions[0]}
              {intentions.length > 1 && ` +${intentions.length - 1}`}
            </span>
          </div>
        ) : (
          <div className="min-w-0 flex-1 truncate text-center text-xs text-white/40">{meta.subtitle}</div>
        )}

        {voice.supported && (
          <button
            onClick={voice.toggle}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
              voice.listening ? "bg-[var(--gold)] text-black" : "bg-white/[0.06] text-white/60"
            }`}
            aria-label="Autoplay por voz"
            title="Autoplay por voz"
          >
            🎙️
          </button>
        )}
      </header>

      {/* STAGE: obra viva de fondo + contador / contexto de primer plano */}
      <div className="relative flex shrink-0 items-center justify-center px-4 py-2 h-[232px] landscape:h-auto landscape:min-h-0 landscape:w-64">
        {/* aura viva: la obra comunitaria latiendo detrás */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <motion.div
            className="h-[232px] w-[232px] opacity-30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.3, scale: 1 }}
            transition={{ duration: 1.2 }}
          >
            <CommunityWorkSvg
              communitySeed={work.communitySeed}
              composition={work.composition}
              signatures={work.signatures}
              progress={work.progress}
              complete={state.status === "completed"}
            />
          </motion.div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#0a0a0b_78%)]" />
        </div>

        {/* primer plano */}
        <div className="relative z-10 flex flex-col items-center">
          {isReflection ? (
            <ReflectionDial remaining={remaining} total={step.duration ?? 120} />
          ) : isRepeat ? (
            <RosaryRing
              topLabel={step.title.toUpperCase()}
              centerMain={String(state.repeatIndex + 1)}
              centerSub={`de ${step.repeat}`}
              progress={(state.repeatIndex + (holding ? 0.5 : 0)) / (step.repeat ?? 1)}
              beadTotal={step.repeat ?? 10}
              beadDone={state.repeatIndex}
              activeBead={state.repeatIndex}
              glow={holding}
              size={152}
            />
          ) : (
            <StepContext
              mysteryNumber={current.mysteryNumber}
              sectionTitle={current.sectionTitle}
              stepTitle={step.title}
              myRole={myRole}
              mode={state.mode}
              holding={holding}
            />
          )}
        </div>
      </div>

      {/* etiqueta de la obra + progreso lineal */}
      <div className="shrink-0 px-6">
        <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.14em] text-white/35">
          <span>{COMPOSITION_LABELS[work.composition].toUpperCase()}</span>
          <span className="tabular-nums">{Math.round(work.progress * 100)}%</span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-[var(--gold)]/80"
            animate={{ width: `${work.progress * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* TEXTO DE ORACIÓN / REFLEXIÓN */}
      <main className="min-h-0 flex-1 px-4 py-3">
        {isReflection ? (
          <ReflectionCard rosario={rosario} />
        ) : (
          <ConsolidatedPrayerCard step={step} myRole={myRole} holding={holding} />
        )}
      </main>

      {/* voz / consenso */}
      <div className="shrink-0 px-4 pb-1">
        {voice.listening && (
          <p className="mb-1 truncate text-center text-[10px] italic text-white/40">
            {voice.transcript || "Escuchando tu oración…"}
          </p>
        )}
        {voice.error && <p className="mb-1 text-center text-[10px] text-[#e0a0a2]">{voice.error}</p>}
      </div>

      <PrayerNavBar
        holding={holding}
        completedRatio={state.mode === "community" ? state.completedRatio : holding ? 1 : 0}
        disabled={false}
        onHoldStart={() => setHolding(true)}
        onHoldEnd={releasePrayer}
        onExit={rosario.leave}
        onOpenGallery={onOpenGallery}
      />

      {showComplete && work.savedWork && (
        <WorkCompleteOverlay
          work={work.savedWork}
          onClose={() => {
            setShowComplete(false);
            rosario.leave();
          }}
          onOpenGallery={() => {
            setShowComplete(false);
            rosario.leave();
            onOpenGallery?.();
          }}
        />
      )}
    </div>
  );
}

/* ----------------------- contexto de paso (sin cuentas) ----------------------- */

function StepContext({
  mysteryNumber,
  sectionTitle,
  stepTitle,
  myRole,
  mode,
  holding,
}: {
  mysteryNumber?: number;
  sectionTitle: string;
  stepTitle: string;
  myRole: "leader" | "assembly" | "all";
  mode: "community" | "solo";
  holding: boolean;
}) {
  return (
    <motion.div
      key={`${mysteryNumber}-${stepTitle}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center text-center"
    >
      <div
        className={`flex h-[152px] w-[152px] flex-col items-center justify-center rounded-full border transition-shadow duration-500 ${
          holding ? "border-[var(--gold)]/50 shadow-[0_0_44px_rgba(212,175,106,0.4)]" : "border-white/10"
        }`}
      >
        {mysteryNumber ? (
          <>
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--gold)]">
              {mysteryNumber}.º Misterio
            </div>
            <div className="mt-1 max-w-[120px] font-serif-holy text-lg font-semibold leading-tight text-white">
              {sectionTitle}
            </div>
          </>
        ) : (
          <div className="max-w-[120px] px-3 font-serif-holy text-base font-semibold leading-tight text-white">
            {stepTitle}
          </div>
        )}
      </div>
      {mode === "community" && (
        <div className="mt-2 text-[11px] text-white/45">Eres {myRole === "leader" ? "GUÍA" : "ASAMBLEA"}</div>
      )}
    </motion.div>
  );
}

/* ------------------------------ dial de reflexión ------------------------------ */

function ReflectionDial({ remaining, total }: { remaining: number; total: number }) {
  const size = 152;
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;
  const progress = total > 0 ? 1 - remaining / total : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e0a0a2"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${circ * progress} ${circ}`}
          style={{ transition: "stroke-dasharray 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#e0a0a2]">Silencio</div>
        <div className="font-serif-holy text-3xl font-semibold tabular-nums text-white">{fmt(remaining)}</div>
      </div>
    </div>
  );
}

/* ----------------------------- tarjeta de oración ----------------------------- */

function ConsolidatedPrayerCard({
  step,
  myRole,
  holding,
}: {
  step: import("../../engine/types").Step;
  myRole: "leader" | "assembly" | "all";
  holding: boolean;
}) {
  const hasRoles = step.role !== "all" && step.leaderText && step.assemblyText;
  return (
    <div
      className={`flex h-full flex-col rounded-3xl border p-5 transition-all duration-300 ${
        holding
          ? "border-[var(--gold)]/60 bg-[var(--gold)]/[0.06] shadow-[0_0_40px_rgba(212,175,106,0.2)]"
          : "border-white/8 bg-white/[0.03]"
      }`}
    >
      <div className="shrink-0 text-center text-[11px] font-semibold tracking-[0.22em] text-[var(--gold)]">
        {step.title.toUpperCase()}
      </div>
      <div className="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto">
        {hasRoles ? (
          <div className="space-y-4">
            <div className={myRole === "leader" || myRole === "all" ? "" : "opacity-70"}>
              <div className="text-[10px] font-semibold tracking-[0.18em] text-white/40">GUÍA</div>
              <p className="mt-1 font-serif-holy text-base leading-relaxed text-white/55">{step.leaderText}</p>
            </div>
            <div className="h-px bg-white/8" />
            <div className={myRole === "assembly" || myRole === "all" ? "" : "opacity-70"}>
              <div className="text-[10px] font-semibold tracking-[0.18em] text-[var(--gold)]">ASAMBLEA</div>
              <p className="mt-1 font-serif-holy text-xl font-semibold leading-relaxed text-white">{step.assemblyText}</p>
            </div>
          </div>
        ) : (
          <p className="text-center font-serif-holy text-xl leading-relaxed text-white">{step.text}</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ interludio / chat ------------------------------ */

type ChatMsg = { id: number; user: string; hue: number; text: string };

function ReflectionCard({ rosario }: { rosario: RosarioApi }) {
  const { current } = rosario;
  const [playing, setPlaying] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!draft.trim()) return;
    setMessages((m) => [...m, { id: Date.now(), user: "Tú", hue: 45, text: draft.trim() }]);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-[#7a1f22]/40 bg-[#1a0e10] p-4">
      <div className="flex shrink-0 items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.16em] text-[#e0a0a2]">INTERLUDIO ESPIRITUAL</span>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gold)] text-black"
          aria-label="Música"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
      </div>

      {current?.step.text && (
        <p className="mt-2 shrink-0 font-serif-holy text-[13px] leading-relaxed text-white/80">{current.step.text}</p>
      )}

      <div className="no-scrollbar mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-2">
            <Avatar name={m.user} hue={m.hue} size={20} />
            <p className="text-[13px] leading-snug text-white/80">
              <span className="text-[var(--gold)]">@{m.user}:</span> {m.text}
            </p>
          </div>
        ))}
        <div ref={end} />
      </div>

      <div className="mt-2 flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] pl-4 pr-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Envía un consuelo…"
          className="h-10 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
        />
        <button
          onClick={send}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--gold)]"
          aria-label="Enviar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
        </button>
      </div>
    </div>
  );
}
