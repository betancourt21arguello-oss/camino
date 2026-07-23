import { useEffect, useState } from "react";
import { jornadaSteps, type JornadaStep } from "../data/jornada";

type Props = {
  onClose: () => void;
  onComplete: () => void;
};

export function JornadaScreen({ onClose, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const [breathPhase, setBreathPhase] = useState<"in" | "out">("in");
  const [breathCount, setBreathCount] = useState(0);
  const [reflection, setReflection] = useState("");
  const step = jornadaSteps[index];
  const total = jornadaSteps.length;
  const isLast = index === total - 1;
  const isFirst = index === 0;

  useEffect(() => {
    if (step.kind !== "breath") return;
    setBreathCount(0);
    setBreathPhase("in");
    const id = setInterval(() => {
      setBreathPhase((p) => {
        if (p === "in") return "out";
        setBreathCount((c) => Math.min(c + 1, 3));
        return "in";
      });
    }, 4000);
    return () => clearInterval(id);
  }, [step.kind, index]);

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

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-white text-[#1c1c1e]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pb-3 pt-12">
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#8a8a90]"
          aria-label="Cerrar"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex flex-1 items-center justify-center gap-[5px] px-3">
          {jornadaSteps.map((_, i) => (
            <div
              key={i}
              className={`h-[5px] rounded-full transition-all duration-300 ${
                i === index
                  ? "w-4 bg-[#c4a35a]"
                  : i < index
                    ? "w-[5px] bg-[#c4a35a]"
                    : "w-[5px] bg-[#e5e2da]"
              }`}
            />
          ))}
        </div>

        <div className="min-w-[44px] text-right text-sm tabular-nums text-[#9a9a9f]">
          {index + 1}/{total}
        </div>
      </div>

      {/* Content */}
      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-8">
        <div className="flex min-h-full flex-1 flex-col justify-center py-6">
          {step.kind === "greeting" && <GreetingStep step={step} />}
          {step.kind === "breath" && (
            <BreathStep step={step} phase={breathPhase} count={breathCount} />
          )}
          {step.kind === "prayer" && <PrayerStep step={step} />}
          {step.kind === "quote" && <QuoteStep step={step} />}
          {step.kind === "reading" && <ReadingStep step={step} />}
          {step.kind === "silence" && <SilenceStep step={step} />}
          {step.kind === "reflect" && (
            <ReflectStep
              step={step}
              value={reflection}
              onChange={setReflection}
            />
          )}
          {step.kind === "final" && <FinalStep step={step} />}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-10 pt-2">
        <button
          onClick={goNext}
          className="h-14 w-full rounded-full bg-[#1c1c1e] text-[15px] font-medium text-white transition active:scale-[0.99]"
        >
          {primaryLabel}
        </button>
        {!isFirst && !isLast && (
          <button
            onClick={goPrev}
            className="mt-1 h-11 w-full text-sm text-[#8a8a90]"
          >
            Atrás
          </button>
        )}
      </div>
    </div>
  );
}

function GreetingStep({ step }: { step: JornadaStep }) {
  return (
    <div className="fade-up">
      <p className="text-[28px] font-normal leading-snug tracking-tight text-[#1c1c1e]">
        {step.title}
      </p>
      <p className="mt-3 whitespace-pre-line text-[28px] font-normal leading-snug tracking-tight text-[#1c1c1e]">
        {step.body}
      </p>
    </div>
  );
}

function BreathStep({
  step,
  phase,
  count,
}: {
  step: JornadaStep;
  phase: "in" | "out";
  count: number;
}) {
  const expanded = phase === "in";
  return (
    <div className="fade-up flex flex-col items-center text-center">
      <p className="text-[26px] font-normal leading-snug text-[#1c1c1e]">
        {step.body}
      </p>
      <p className="mt-3 text-[17px] text-[#8a8a90]">{step.sub}</p>

      <div className="relative mt-16 flex h-44 w-44 items-center justify-center">
        <div
          className="absolute rounded-full bg-[#e8e8ea] transition-all duration-[4000ms] ease-in-out"
          style={{
            width: expanded ? 160 : 96,
            height: expanded ? 160 : 96,
            opacity: expanded ? 0.95 : 0.7,
          }}
        />
        <div className="relative text-sm font-medium tracking-wide text-[#6b6b70]">
          {count >= 3 ? "Amén" : phase === "in" ? "Inhala" : "Exhala"}
        </div>
      </div>
      <p className="mt-6 text-sm text-[#9a9a9f]">{Math.min(count, 3)} / 3</p>
    </div>
  );
}

function PrayerStep({ step }: { step: JornadaStep }) {
  const lines = step.body.split("\n\n");
  const heading = lines[0];
  const rest = lines.slice(1).join("\n\n");
  return (
    <div className="fade-up">
      <p className="text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.title}
      </p>
      <p className="mt-3 text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {heading}
      </p>
      <p className="mt-5 whitespace-pre-line text-[20px] leading-relaxed text-[#2a2a2e]">
        {rest}
      </p>
    </div>
  );
}

function QuoteStep({ step }: { step: JornadaStep }) {
  return (
    <div className="fade-up">
      <p className="text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.title}
      </p>
      <p className="mt-3 text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.body}
      </p>
      <p className="mt-8 font-serif-holy text-[22px] leading-relaxed text-[#1c1c1e]">
        {step.sub}
      </p>
      {step.citation && (
        <p className="mt-4 text-[15px] text-[#8a8a90]">{step.citation}</p>
      )}
    </div>
  );
}

function ReadingStep({ step }: { step: JornadaStep }) {
  return (
    <div className="fade-up">
      <p className="text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.title}
      </p>
      <p className="mt-3 text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.body}
      </p>
      {step.citation && (
        <p className="mt-4 text-[14px] font-medium tracking-wide text-[#c4a35a]">
          {step.citation}
        </p>
      )}
      <p className="mt-5 whitespace-pre-line text-[18px] leading-relaxed text-[#2a2a2e]">
        {step.sub}
      </p>
    </div>
  );
}

function SilenceStep({ step }: { step: JornadaStep }) {
  return (
    <div className="fade-up flex flex-col items-center text-center">
      <p className="text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.title}
      </p>
      <p className="mt-3 text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.body}
      </p>
      <div className="my-14 h-24 w-24 rounded-full bg-[#f0eeea]" />
      <p className="max-w-xs text-[16px] leading-relaxed text-[#8a8a90]">
        {step.sub}
      </p>
    </div>
  );
}

function ReflectStep({
  step,
  value,
  onChange,
}: {
  step: JornadaStep;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="fade-up">
      <p className="text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.title}
      </p>
      <p className="mt-3 whitespace-pre-line text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.body}
      </p>
      <p className="mt-4 text-[15px] text-[#8a8a90]">{step.sub}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe aquí tu reflexión…"
        className="mt-8 min-h-[140px] w-full resize-none rounded-2xl border border-[#e6e3db] bg-[#faf9f6] p-4 text-[16px] leading-relaxed text-[#1c1c1e] placeholder:text-[#b0b0b5] focus:border-[#c4a35a] focus:outline-none"
      />
    </div>
  );
}

function FinalStep({ step }: { step: JornadaStep }) {
  return (
    <div className="fade-up">
      <p className="text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.title}
      </p>
      <p className="mt-3 text-[28px] font-normal leading-snug text-[#1c1c1e]">
        {step.body}
      </p>
      <p className="mt-6 text-[22px] leading-relaxed text-[#1c1c1e]">
        {step.sub}
      </p>
    </div>
  );
}
