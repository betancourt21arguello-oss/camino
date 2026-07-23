import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buildJornadaSteps, type JornadaStep, type JornadaStepKind } from "../data/jornada";
import type { DailyLiturgy } from "../liturgy/types";

type Props = {
  liturgy: DailyLiturgy | null;
  onClose: () => void;
  onComplete: () => void;
};

const KIND_ACCENT: Record<JornadaStepKind, string> = {
  greeting: "#c4a35a",
  breath: "#7fa4b8",
  invocation: "#b18ec4",
  quote: "#c4a35a",
  reading: "#b58a4b",
  gospel: "#8a6f34",
  reflection: "#7a8a5c",
  silence: "#9a9a9f",
  personal: "#c4a35a",
  final: "#8a6f34",
};

export function JornadaScreen({ liturgy, onClose, onComplete }: Props) {
  const steps = useMemo(() => buildJornadaSteps(liturgy), [liturgy]);
  const [index, setIndex] = useState(0);
  const [reflection, setReflection] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const step = steps[index];
  const total = steps.length;
  const isLast = index === total - 1;
  const isFirst = index === 0;
  const accent = KIND_ACCENT[step.kind];

  // Reset scroll when step changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [index]);

  const goNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex((i) => Math.min(i + 1, total - 1));
  };

  const goPrev = () => {
    if (!isFirst) setIndex((i) => i - 1);
  };

  const primaryLabel = step.cta ?? (isLast ? "Terminar mi jornada" : "Continuar");
  const progressPct = ((index + 1) / total) * 100;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#faf9f6] text-[#1c1c1e]">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-12">
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#8a8a90] hover:bg-black/5"
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="text-[11px] font-medium tracking-[0.2em] text-[#a09c93]">
          {step.eyebrow?.toUpperCase() ?? "JORNADA"}
        </div>

        <div className="min-w-[44px] text-right text-xs tabular-nums text-[#9a9a9f]">
          {index + 1}/{total}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-5 h-1 shrink-0 overflow-hidden rounded-full bg-[#eee9df]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: accent }}
          animate={{ width: `${progressPct}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        />
      </div>

      {/* Content area */}
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="min-h-full px-7 py-8"
          >
            <StepView
              step={step}
              accent={accent}
              reflection={reflection}
              onReflectionChange={setReflection}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="shrink-0 border-t border-[#eee9df] bg-white/70 px-6 pb-8 pt-4 backdrop-blur">
        <button
          onClick={goNext}
          className="h-13 flex h-14 w-full items-center justify-center rounded-full text-[15px] font-medium text-white transition active:scale-[0.99]"
          style={{ background: "#1c1c1e" }}
        >
          {primaryLabel}
        </button>
        {!isFirst && (
          <button
            onClick={goPrev}
            className="mt-1 h-10 w-full text-xs text-[#8a8a90] hover:text-[#1c1c1e]"
          >
            ← Anterior
          </button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// Step renderer
// -----------------------------------------------------------

function StepView({
  step,
  accent,
  reflection,
  onReflectionChange,
}: {
  step: JornadaStep;
  accent: string;
  reflection: string;
  onReflectionChange: (v: string) => void;
}) {
  switch (step.kind) {
    case "greeting":
      return <GreetingView step={step} />;
    case "breath":
      return <BreathView step={step} />;
    case "invocation":
    case "final":
      return <PrayerView step={step} accent={accent} />;
    case "quote":
      return <QuoteView step={step} accent={accent} />;
    case "reading":
    case "gospel":
      return <ReadingView step={step} accent={accent} />;
    case "reflection":
      return <ReflectionView step={step} accent={accent} />;
    case "silence":
      return <SilenceView step={step} />;
    case "personal":
      return (
        <PersonalView step={step} value={reflection} onChange={onReflectionChange} />
      );
  }
}

// -----------------------------------------------------------

function GreetingView({ step }: { step: JornadaStep }) {
  return (
    <div className="flex min-h-[60vh] flex-col justify-center">
      <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
        <span className="text-3xl">✦</span>
      </div>
      <h1 className="text-center font-serif-holy text-[36px] leading-tight text-[#1c1c1e]">
        {step.heading}
      </h1>
      {step.hint && (
        <p className="mx-auto mt-4 max-w-sm text-center text-[17px] leading-relaxed text-[#77736b]">
          {step.hint}
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------

function BreathView({ step }: { step: JornadaStep }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    setPhase("in");
    const cycle = () => {
      setPhase((p) => {
        if (p === "in") return "hold";
        if (p === "hold") {
          setCount((c) => Math.min(c + 1, 3));
          return "out";
        }
        return "in";
      });
    };
    const id = setInterval(cycle, 3000);
    return () => clearInterval(id);
  }, []);

  const label =
    count >= 3 ? "Amén" : phase === "in" ? "Inhala" : phase === "hold" ? "Sostén" : "Exhala";
  const size = phase === "in" ? 200 : phase === "hold" ? 200 : 110;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h2 className="text-center font-serif-holy text-[28px] leading-tight">
        {step.heading}
      </h2>
      {step.hint && (
        <p className="mt-3 text-center text-[15px] text-[#77736b]">{step.hint}</p>
      )}

      <div className="relative mt-14 flex h-56 w-56 items-center justify-center">
        <motion.div
          className="absolute rounded-full"
          style={{ background: "linear-gradient(135deg, #d9e6ea, #b9cdd3)" }}
          animate={{ width: size, height: size, opacity: phase === "hold" ? 1 : 0.9 }}
          transition={{ duration: 3, ease: "easeInOut" }}
        />
        <div className="relative text-sm font-medium tracking-wide text-[#4a5560]">
          {label}
        </div>
      </div>

      <div className="mt-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full transition ${
              i < count ? "bg-[#7fa4b8]" : "bg-[#e5e2da]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------

function PrayerView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="font-serif-holy text-[32px] leading-tight" style={{ color: accent }}>
        {step.heading}
      </h2>
      {step.body && (
        <p className="mt-6 whitespace-pre-line font-serif-holy text-[20px] leading-relaxed text-[#2a2a2e]">
          {step.body}
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------

function QuoteView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col justify-center">
      <div
        className="mx-auto mb-6 text-5xl font-serif-holy leading-none"
        style={{ color: accent }}
      >
        “
      </div>
      <p className="text-center font-serif-holy text-[24px] leading-relaxed text-[#1c1c1e]">
        {step.heading.replace(/^"|"$/g, "")}
      </p>
      {step.citation && (
        <p className="mt-6 text-center text-[13px] font-medium tracking-wide" style={{ color: accent }}>
          — {step.citation}
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------

function ReadingView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="font-serif-holy text-[26px] leading-tight text-[#1c1c1e]">
        {step.heading}
      </h2>
      {step.citation && (
        <p className="mt-1 text-[13px] font-medium tracking-wide" style={{ color: accent }}>
          {step.citation}
        </p>
      )}
      <div className="my-5 h-px w-12 rounded-full" style={{ background: accent }} />
      {step.body && (
        <div className="whitespace-pre-line font-serif-holy text-[18px] leading-[1.75] text-[#2a2a2e]">
          {step.body}
        </div>
      )}
      <p className="mt-8 text-center text-[13px] italic text-[#a09c93]">
        Palabra de Dios · Te alabamos, Señor
      </p>
    </div>
  );
}

// -----------------------------------------------------------

function ReflectionView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div
        className="rounded-3xl p-6"
        style={{ background: `${accent}12`, border: `1px solid ${accent}33` }}
      >
        <div className="text-[10px] font-semibold tracking-[0.2em]" style={{ color: accent }}>
          REFLEXIÓN
        </div>
        <h2 className="mt-2 font-serif-holy text-[22px] leading-tight text-[#1c1c1e]">
          {step.heading}
        </h2>
        {step.body && (
          <p className="mt-4 font-serif-holy text-[17px] leading-relaxed text-[#2a2a2e]">
            {step.body}
          </p>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------

function SilenceView({ step }: { step: JornadaStep }) {
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h2 className="text-center font-serif-holy text-[28px] leading-tight">
        {step.heading}
      </h2>
      {step.hint && (
        <p className="mt-3 max-w-sm text-center text-[15px] text-[#77736b]">
          {step.hint}
        </p>
      )}

      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="my-10 flex h-32 w-32 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg, #e8e5dc, #d5cebc)" }}
      >
        <span className="font-serif-holy text-2xl tabular-nums text-[#77736b]">
          {seconds > 0 ? `0:${String(seconds).padStart(2, "0")}` : "✓"}
        </span>
      </motion.div>

      {seconds > 0 && (
        <p className="text-[12px] text-[#a09c93]">Descansa en la Palabra</p>
      )}
    </div>
  );
}

// -----------------------------------------------------------

function PersonalView({
  step,
  value,
  onChange,
}: {
  step: JornadaStep;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="font-serif-holy text-[26px] leading-tight text-[#1c1c1e]">
        {step.heading}
      </h2>
      {step.hint && (
        <p className="mt-3 text-[15px] leading-relaxed text-[#77736b]">{step.hint}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe aquí tu intención concreta…"
        className="mt-6 min-h-[180px] w-full resize-none rounded-2xl border border-[#e6e3db] bg-white p-4 text-[16px] leading-relaxed text-[#1c1c1e] placeholder:text-[#b0b0b5] focus:border-[#c4a35a] focus:outline-none"
      />
      <p className="mt-3 text-center text-[11px] text-[#a09c93]">
        Tu respuesta queda entre tú y Dios · No se comparte
      </p>
    </div>
  );
}
