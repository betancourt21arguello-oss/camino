import { useState } from "react";

type Props = {
  existing?: string[];
  onConfirm: (intention: string) => void;
  onSkip: () => void;
};

export function IntentionPrompt({ existing = [], onConfirm, onSkip }: Props) {
  const [text, setText] = useState("");

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="fade-up w-full max-w-md rounded-3xl border border-white/10 bg-[#141416] p-6 text-white">
        <div className="mx-auto mb-4 flex flex-col items-center">
          <div className="flame mb-1 h-4 w-2.5 rounded-full bg-gradient-to-t from-[#ffb347] to-[#fff3c4]" />
          <div className="h-10 w-7 rounded-t-md rounded-b-sm bg-gradient-to-b from-[#e9dcc4] to-[#c9bd9e]" />
        </div>
        <h3 className="text-center font-serif-holy text-xl font-semibold">
          ¿Deseas ofrecer una intención?
        </h3>
        <p className="mt-2 text-center text-sm text-white/50">
          Tu vela acompañará el Rosario y quedará activa 24 horas.
        </p>

        {existing.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] tracking-[0.15em] text-white/40">
              INTENCIONES QUE YA LLEVAS
            </div>
            {existing.slice(0, 3).map((e, i) => (
              <div key={i} className="mt-1 text-sm text-white/70">
                🕯️ {e}
              </div>
            ))}
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Añade otra intención (opcional)…"
          className="mt-4 min-h-[80px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--gold)] focus:outline-none"
        />

        <button
          onClick={() => onConfirm(text.trim())}
          className="mt-4 h-12 w-full rounded-full bg-[var(--gold)] font-semibold text-black"
        >
          {text.trim() ? "Encender vela y entrar" : "Entrar a orar"}
        </button>
        <button onClick={onSkip} className="mt-2 h-11 w-full text-sm text-white/50">
          Entrar sin nueva intención
        </button>
      </div>
    </div>
  );
}
