import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buildJornadaSteps, type JornadaStep, type JornadaStepKind } from "../data/jornada";
import type { DailyLiturgy } from "../liturgy/types";

type Props = {
  liturgy: DailyLiturgy | null;
  onClose: () => void;
  onComplete: () => void;
};

const ACCENT: Record<JornadaStepKind, string> = {
  offering: "#c98a3a",
  greeting: "#c4a35a",
  breath: "#5f8ea0",
  invocation: "#9a6fb0",
  quote: "#c4a35a",
  reading: "#a07a3c",
  threecrosses: "#b65a4a",
  gospel: "#8a5a2a",
  catechism: "#3f6e7a",
  onthistoday: "#7a4a8a",
  reflection: "#5c7a4a",
  silence: "#8a8a92",
  personal: "#b08a3a",
  final: "#8a5a2a",
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
  const accent = ACCENT[step.kind];

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
  const goPrev = () => !isFirst && setIndex((i) => i - 1);

  const primaryLabel = step.cta ?? (isLast ? "Terminar mi jornada" : "Continuar");
  const progressPct = ((index + 1) / total) * 100;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#f6f3ec] text-[#1c1c1e]">
      {/* halo ambiental sutil que cambia con el paso */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 transition-colors duration-700"
        style={{ background: `radial-gradient(120% 80% at 50% -10%, ${accent}26, transparent 70%)` }}
      />

      <header className="relative flex shrink-0 items-center justify-between px-5 pb-3 pt-12">
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#8a8a90] transition hover:bg-black/5"
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors duration-500"
          style={{ color: accent }}
        >
          {step.eyebrow ?? "Jornada"}
        </div>
        <div className="min-w-[44px] text-right text-xs tabular-nums text-[#9a9a9f]">
          {index + 1}/{total}
        </div>
      </header>

      <div className="relative mx-5 h-1 shrink-0 overflow-hidden rounded-full bg-[#e6e0d2]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: accent }}
          animate={{ width: `${progressPct}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 22 }}
        />
      </div>

      <div ref={scrollRef} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-full px-7 py-8"
          >
            <StepView step={step} accent={accent} reflection={reflection} onReflectionChange={setReflection} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative shrink-0 border-t border-[#e6e0d2] bg-white/70 px-6 pb-8 pt-4 backdrop-blur">
        <motion.button
          onClick={goNext}
          whileTap={{ scale: 0.97 }}
          className="flex h-14 w-full items-center justify-center rounded-full text-[15px] font-medium text-white shadow-[0_10px_26px_-14px_rgba(0,0,0,0.6)] transition active:scale-[0.99]"
          style={{ background: "#1c1c1e" }}
        >
          {primaryLabel}
        </motion.button>
        {!isFirst && (
          <button onClick={goPrev} className="mt-1 h-10 w-full text-xs text-[#8a8a90] transition hover:text-[#1c1c1e]">
            ← Anterior
          </button>
        )}
      </div>
    </div>
  );
}

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
    case "offering":
      return <OfferingView step={step} accent={accent} />;
    case "breath":
      return <BreathView step={step} />;
    case "threecrosses":
      return <ThreeCrossesView step={step} accent={accent} />;
    case "gospel":
      return <GospelView step={step} accent={accent} />;
    case "quote":
      return <QuoteView step={step} accent={accent} />;
    case "reading":
      return <ReadingView step={step} accent={accent} />;
    case "catechism":
      return <CatechismView step={step} accent={accent} />;
    case "onthistoday":
      return <OnThisDayView step={step} accent={accent} />;
    case "reflection":
      return <ReflectionView step={step} accent={accent} />;
    case "silence":
      return <SilenceView step={step} />;
    case "personal":
      return <PersonalView step={step} value={reflection} onChange={onReflectionChange} />;
    default:
      return <PrayerView step={step} accent={accent} />;
  }
}

/* ------------------------------- vistas ------------------------------- */

function Eyebrow({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-px w-7" style={{ background: accent }} />
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
        {children}
      </span>
    </div>
  );
}

function OfferingView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="flex min-h-[58vh] flex-col justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: `${accent}1f`, boxShadow: `0 0 50px -12px ${accent}80` }}
      >
        <span className="text-4xl">🌅</span>
      </motion.div>
      <h1 className="text-center font-serif-holy text-[34px] leading-[1.05]">{step.heading}</h1>
      {step.hint && <p className="mx-auto mt-3 max-w-sm text-center text-[15px] italic text-[#77736b]">{step.hint}</p>}
      {step.body && (
        <p className="mx-auto mt-7 max-w-md font-serif-holy text-[18px] leading-[1.7] text-[#2a2a2e]">{step.body}</p>
      )}
    </div>
  );
}

function BreathView({ step }: { step: JornadaStep }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    setPhase("in");
    const id = setInterval(() => {
      setPhase((p) => {
        if (p === "in") return "hold";
        if (p === "hold") {
          setCount((c) => Math.min(c + 1, 3));
          return "out";
        }
        return "in";
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  const label = count >= 3 ? "Amén" : phase === "in" ? "Inhala" : phase === "hold" ? "Sostén" : "Exhala";
  const size = phase === "out" ? 110 : 200;
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center">
      <h2 className="text-center font-serif-holy text-[28px] leading-tight">{step.heading}</h2>
      {step.hint && <p className="mt-3 text-center text-[15px] text-[#77736b]">{step.hint}</p>}
      <div className="relative my-12 flex h-56 w-56 items-center justify-center">
        <motion.div
          className="absolute rounded-full"
          style={{ background: "linear-gradient(135deg,#cfe0e6,#9fc0cb)" }}
          animate={{ width: size, height: size }}
          transition={{ duration: 3, ease: "easeInOut" }}
        />
        <span className="relative text-sm font-medium tracking-wide text-[#3f5a63]">{label}</span>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2 w-2 rounded-full transition ${i < count ? "bg-[#5f8ea0]" : "bg-[#ddd6c7]"}`} />
        ))}
      </div>
    </div>
  );
}

function ThreeCrossesView({ step, accent }: { step: JornadaStep; accent: string }) {
  const [active, setActive] = useState(0);
  const labels = ["En la frente", "En los labios", "En el pecho"];
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % 3), 1900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center text-center">
      <Eyebrow accent={accent}>Rito del Evangelio</Eyebrow>
      <h2 className="font-serif-holy text-[30px] leading-tight">{step.heading}</h2>
      {step.hint && <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[#77736b]">{step.hint}</p>}
      <div className="mt-10 flex items-end gap-7">
        {labels.map((l, i) => (
          <div key={l} className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ scale: active === i ? 1.18 : 0.85, opacity: active === i ? 1 : 0.4 }}
              transition={{ duration: 0.6 }}
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: active === i ? `${accent}26` : "transparent", boxShadow: active === i ? `0 0 30px -8px ${accent}` : "none" }}
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke={accent} strokeWidth={2.4} strokeLinecap="round">
                <path d="M12 4v16M6 10h12" />
              </svg>
            </motion.div>
            <span className={`text-[11px] tracking-wide transition ${active === i ? "text-[#1c1c1e]" : "text-[#a09c93]"}`}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GospelView({ step, accent }: { step: JornadaStep; accent: string }) {
  const ev = step.evangelist ?? "el Evangelio";
  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow accent={accent}>Evangelio</Eyebrow>
      <p className="font-serif-holy text-[20px] italic leading-snug text-[#5a4a2a]">
        Lectura del santo Evangelio según {ev}
      </p>
      {step.citation && <p className="mt-1 text-[13px] font-medium tracking-wide" style={{ color: accent }}>{step.citation}</p>}
      <div className="my-5 h-px w-12 rounded-full" style={{ background: accent }} />
      {step.body && <p className="whitespace-pre-line font-serif-holy text-[19px] leading-[1.75] text-[#242118]">{step.body}</p>}
      <div className="mt-8 rounded-2xl border-l-4 bg-white/70 p-4" style={{ borderColor: accent }}>
        <p className="font-serif-holy text-[18px] text-[#1c1c1e]">{step.responseLabel ?? "Palabra del Señor"}</p>
        <p className="mt-1 font-serif-holy text-[18px] font-semibold" style={{ color: accent }}>
          R. {step.response ?? "Gloria a ti, Señor Jesús"}
        </p>
      </div>
    </div>
  );
}

function QuoteView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col justify-center">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-6 text-6xl leading-none" style={{ color: accent }}>
        “
      </motion.div>
      <p className="text-center font-serif-holy text-[25px] leading-[1.4] text-[#1c1c1e]">{step.heading.replace(/^["']|["']$/g, "")}</p>
      {step.citation && <p className="mt-6 text-center text-[13px] font-medium tracking-wide" style={{ color: accent }}>— {step.citation}</p>}
    </div>
  );
}

function ReadingView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow accent={accent}>{step.eyebrow ?? "Lectura"}</Eyebrow>
      <h2 className="font-serif-holy text-[26px] leading-tight">{step.heading}</h2>
      {step.citation && <p className="mt-1 text-[13px] font-medium tracking-wide" style={{ color: accent }}>{step.citation}</p>}
      <div className="my-5 h-px w-12 rounded-full" style={{ background: accent }} />
      {step.body && <p className="whitespace-pre-line font-serif-holy text-[18px] leading-[1.75] text-[#2a2a2e]">{step.body}</p>}
      {step.responseLabel && (
        <div className="mt-7 flex flex-col gap-1 text-[15px]">
          <span className="text-[#77736b]">{step.response ?? step.responseLabel}</span>
          <span className="font-serif-holy font-semibold" style={{ color: accent }}>R. {step.responseLabel}</span>
        </div>
      )}
    </div>
  );
}

function CatechismView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow accent={accent}>Catecismo · CEC {step.number}</Eyebrow>
      <h2 className="font-serif-holy text-[26px] leading-tight">{step.heading}</h2>
      <div className="my-5 h-px w-12 rounded-full" style={{ background: accent }} />
      {step.body && <p className="whitespace-pre-line font-serif-holy text-[18px] leading-[1.75] text-[#24323a]">{step.body}</p>}
      {step.applyToday && (
        <div className="mt-7 rounded-2xl p-4" style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Para hoy</div>
          <p className="mt-1 text-[15px] leading-relaxed text-[#1c1c1e]">{step.applyToday}</p>
        </div>
      )}
    </div>
  );
}

function OnThisDayView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow accent={accent}>Un día como hoy · {step.category}</Eyebrow>
      <h2 className="font-serif-holy text-[26px] leading-tight">{step.heading}</h2>
      <div className="my-5 h-px w-12 rounded-full" style={{ background: accent }} />
      {step.body && <p className="whitespace-pre-line font-serif-holy text-[18px] leading-[1.75] text-[#2c2436]">{step.body}</p>}
      {step.applyToday && (
        <div className="mt-7 rounded-2xl p-4" style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>En Venezuela</div>
          <p className="mt-1 text-[15px] leading-relaxed text-[#1c1c1e]">{step.applyToday}</p>
        </div>
      )}
    </div>
  );
}

function ReflectionView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl p-6" style={{ background: `${accent}12`, border: `1px solid ${accent}33` }}>
        <Eyebrow accent={accent}>Reflexión</Eyebrow>
        <h2 className="font-serif-holy text-[22px] leading-tight">{step.heading}</h2>
        {step.body && <p className="mt-4 font-serif-holy text-[17px] leading-[1.7] text-[#2a2a2e]">{step.body}</p>}
      </div>
    </div>
  );
}

function SilenceView({ step }: { step: JornadaStep }) {
  const [s, setS] = useState(30);
  useEffect(() => {
    if (s <= 0) return;
    const id = setTimeout(() => setS((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [s]);
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center">
      <h2 className="text-center font-serif-holy text-[28px] leading-tight">{step.heading}</h2>
      {step.hint && <p className="mt-3 max-w-sm text-center text-[15px] text-[#77736b]">{step.hint}</p>}
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="my-10 flex h-32 w-32 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg,#e8e3d6,#cfc7b3)" }}
      >
        <span className="font-serif-holy text-2xl tabular-nums text-[#6b6450]">{s > 0 ? `0:${String(s).padStart(2, "0")}` : "✓"}</span>
      </motion.div>
    </div>
  );
}

function PersonalView({ step, value, onChange }: { step: JornadaStep; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="font-serif-holy text-[26px] leading-tight">{step.heading}</h2>
      {step.hint && <p className="mt-3 text-[15px] leading-relaxed text-[#77736b]">{step.hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe aquí tu intención concreta…"
        className="mt-6 min-h-[180px] w-full resize-none rounded-2xl border border-[#e0d8c6] bg-white p-4 font-serif-holy text-[16px] leading-relaxed text-[#1c1c1e] placeholder:font-sans placeholder:text-[#b0b0b5] focus:border-[#c4a35a] focus:outline-none"
      />
      <p className="mt-3 text-center text-[11px] text-[#a09c93]">Tu respuesta queda entre tú y Dios · No se comparte</p>
    </div>
  );
}

function PrayerView({ step, accent }: { step: JornadaStep; accent: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow accent={accent}>{step.eyebrow ?? "Oración"}</Eyebrow>
      <h2 className="font-serif-holy text-[30px] leading-tight" style={{ color: accent }}>{step.heading}</h2>
      {step.body && <p className="mt-6 whitespace-pre-line font-serif-holy text-[20px] leading-[1.7] text-[#2a2a2e]">{step.body}</p>}
    </div>
  );
}
