import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "../../components/Avatar";
import type { RosarioApi } from "../../engine/useRosario";
import { CommunityWorkSvg } from "../../community/CommunityWorkSvg";
import { useCommunityWork } from "../../community/useCommunityWork";
import { WorkCompleteOverlay } from "../../community/WorkCompleteOverlay";
import { COMPOSITION_LABELS } from "../../community/composition";
import { PrayerNavBar } from "./PrayerNavBar";
import { usePrayerVoiceControl } from "../../engine/usePrayerVoiceControl";
import { keywordsForStep } from "../../engine/keywords";

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

  const sessionKey = useMemo(
    () => `session-${meta.title}-${state.mode}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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

  // Autoplay por voz (Web Speech API)
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

  const isRepeat = !!step.repeat;
  const centerLabel = isRepeat
    ? `${step.title} · ${state.repeatIndex + 1}/${step.repeat}`
    : isReflection
      ? "Interludio espiritual"
      : current.sectionTitle;

  const releasePrayer = () => {
    setHolding(false);
    work.offerMyPrayer();
    rosario.markDone();
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0a0a0b] text-white">
      {/* ===== TOP BAR compacta (máx 12h): personas + intenciones ===== */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3">
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
          <div className="min-w-0 flex-1 truncate text-center text-xs text-white/40">
            {meta.subtitle}
          </div>
        )}

        {voice.supported && (
          <button
            onClick={voice.toggle}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
              voice.listening
                ? "bg-[var(--gold)] text-black"
                : "bg-white/[0.06] text-white/60"
            }`}
            aria-label="Autoplay por voz"
            title="Autoplay por voz"
          >
            🎙️
          </button>
        )}
      </header>

      {/* ===== Obra comunitaria viva (fija, compacta) ===== */}
      <div className="shrink-0 px-4 pt-2">
        <div className="mx-auto max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-black">
          <CommunityWorkSvg
            communitySeed={work.communitySeed}
            composition={work.composition}
            signatures={work.signatures}
            progress={work.progress}
            complete={state.status === "completed"}
          />
        </div>
        <div className="mx-auto mt-1 flex max-w-[220px] items-center justify-between text-[9px] tracking-[0.12em] text-white/35">
          <span>{COMPOSITION_LABELS[work.composition].toUpperCase()}</span>
          <span>{Math.round(work.progress * 100)}%</span>
        </div>
      </div>

      {/* ===== Contexto del paso (compacto) ===== */}
      <div className="shrink-0 px-4 pt-2 text-center">
        <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--gold)]">
          {current.mysteryNumber
            ? `${current.mysteryNumber}.º Misterio · ${current.sectionTitle}`
            : centerLabel}
        </div>
        {state.mode === "community" && !isReflection && (
          <div className="mt-1 text-[11px] text-white/45">
            Eres {myRole === "leader" ? "GUÍA" : "ASAMBLEA"}
          </div>
        )}
      </div>

      {/* ===== Tarjeta central: única con overflow-y-auto ===== */}
      <main className="min-h-0 flex-1 px-4 py-3">
        {isReflection ? (
          <ReflectionCard rosario={rosario} />
        ) : (
          <ConsolidatedPrayerCard step={step} myRole={myRole} holding={holding} />
        )}
      </main>

      {/* ===== Consenso + transcripción (fila fina) ===== */}
      <div className="shrink-0 px-4 pb-1">
        {voice.listening && (
          <p className="mb-1 truncate text-center text-[10px] italic text-white/40">
            {voice.transcript || "Escuchando tu oración…"}
          </p>
        )}
        {voice.error && (
          <p className="mb-1 text-center text-[10px] text-[#e0a0a2]">{voice.error}</p>
        )}
      </div>

      {/* ===== Navbar con botón central 🙏 ===== */}
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

// ----------------------------------------------------------------------
//  Tarjeta consolidada: Guía (atenuado) + Asamblea (destacado)
// ----------------------------------------------------------------------

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
              <div className="text-[10px] font-semibold tracking-[0.18em] text-white/40">
                GUÍA
              </div>
              <p className="mt-1 font-serif-holy text-base leading-relaxed text-white/55">
                {step.leaderText}
              </p>
            </div>
            <div className="h-px bg-white/8" />
            <div className={myRole === "assembly" || myRole === "all" ? "" : "opacity-70"}>
              <div className="text-[10px] font-semibold tracking-[0.18em] text-[var(--gold)]">
                ASAMBLEA
              </div>
              <p className="mt-1 font-serif-holy text-xl font-semibold leading-relaxed text-white">
                {step.assemblyText}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center font-serif-holy text-xl leading-relaxed text-white">
            {step.text}
          </p>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
//  Interludio compacto
// ----------------------------------------------------------------------

type ChatMsg = { id: number; user: string; hue: number; text: string };

function ReflectionCard({
  rosario,
}: {
  rosario: RosarioApi;
}) {
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
        <span className="text-[11px] font-semibold tracking-[0.16em] text-[#e0a0a2]">
          INTERLUDIO ESPIRITUAL
        </span>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gold)] text-black"
          aria-label="Música"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      {current?.step.text && (
        <p className="mt-2 shrink-0 font-serif-holy text-sm leading-relaxed text-white/80">
          {current.step.text}
        </p>
      )}

      <div className="no-scrollbar mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="fade-up flex items-start gap-2">
            <Avatar name={m.user} hue={m.hue} size={20} />
            <p className="text-sm leading-snug text-white/80">
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
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
