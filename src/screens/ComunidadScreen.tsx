import { useState } from "react";
import { useSpiritual } from "../fruits/store";
import type { Candle } from "../fruits/types";

function hoursLeft(c: Candle) {
  const ms = c.expiresAt - Date.now();
  return Math.max(0, Math.round(ms / 3600_000));
}

function CandleGlyph({
  tint,
  big = false,
  praying = false,
}: {
  tint: number;
  big?: boolean;
  praying?: boolean;
}) {
  const h = big ? 20 : 14;
  const w = big ? 11 : 8;
  return (
    <div className={`relative flex flex-col items-center ${praying ? "candle-praying" : ""}`}>
      {praying && (
        <div className="absolute inset-[-15px] -z-0 rounded-full bg-[#d4af6a]/20 blur-xl" />
      )}
      <div
        className="flame relative z-10 mb-0.5 rounded-full"
        style={{
          height: big ? 5 : 3.5,
          width: big ? 3.5 : 2.5,
          background: "linear-gradient(to top, #ffb347, #fff3c4)",
        }}
      />
      <div
        className={`relative z-10 rounded-t-md rounded-b-sm ${
          praying ? "shadow-[0_0_18px_rgba(212,175,106,0.75)]" : "shadow-sm"
        }`}
        style={{
          height: h * 3.4,
          width: w * 3,
          background: `linear-gradient(180deg, hsl(${tint} 40% 82%), #f3ecdc)`,
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      />
    </div>
  );
}

export function ComunidadScreen() {
  const { candles, lightCandle, prayForCandle } = useSpiritual();
  const [tab, setTab] = useState<"intenciones" | "reflexiones">("intenciones");
  const [selected, setSelected] = useState<Candle | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");

  const active = candles.filter((c) => c.expiresAt > Date.now());
  const shown = active.slice(0, 40);
  const extra = Math.max(0, 523); // muestra + "+523 más"

  return (
    <div className="min-h-full bg-[#f7f6f3] pb-28 text-[#1c1c1e]">
      <h1 className="pt-10 text-center text-2xl font-semibold">Comunidad</h1>

      <div className="mt-6 flex justify-center">
        <div className="flex rounded-full bg-[#e9e7e0] p-1">
          {(["intenciones", "reflexiones"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`min-h-[40px] rounded-full px-5 text-sm font-medium capitalize transition ${
                tab === t ? "bg-[#1c1c1e] text-white" : "text-[#6b6b70]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "intenciones" ? (
        <div className="px-6">
          <button
            onClick={() => setComposing(true)}
            className="mx-auto mt-6 block min-h-[44px] rounded-full border border-[#d7d3c8] bg-white px-6 text-sm font-medium text-[#5c6b8f]"
          >
            🕯️ Encender una vela por alguien
          </button>

          <p className="mt-4 text-center text-xs text-[#a8a8ad]">
            Las velas encendidas no se apagan. Puedes rezar por cualquiera.
          </p>

          <div className="mx-auto mt-6 grid max-w-sm grid-cols-4 gap-x-3 gap-y-6">
            {shown.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="flex flex-col items-center transition active:scale-95"
              >
                <CandleGlyph
                  tint={c.ownerHue}
                  praying={c.mine || c.prayedBy.includes("me")}
                />
                {c.prayedBy.length > 0 && (
                  <span className="mt-1 text-[9px] text-[#9a9a9f]">
                    🙏 {c.prayedBy.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-[#9a9a9f]">
            + {extra} intenciones más encendidas por la comunidad
          </p>
        </div>
      ) : (
        <div className="space-y-3 px-6 pt-6">
          {[
            { u: "Ana", t: "Hoy sentí mucha paz durante el segundo misterio." },
            { u: "José", t: "Gracias a todos por rezar juntos esta mañana." },
            { u: "Lucía", t: "Ofrezco este rosario por mi familia." },
          ].map((r, i) => (
            <div key={i} className="rounded-2xl border border-[#e6e3db] bg-white p-4">
              <div className="text-sm font-medium text-[#5c6b3f]">{r.u}</div>
              <p className="mt-1 text-sm text-[#3a3a3e]">{r.t}</p>
            </div>
          ))}
        </div>
      )}

      {/* Candle detail: what intention, pray for it */}
      {selected && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="fade-up w-full max-w-md rounded-3xl bg-white p-6">
            <div className="flex justify-center">
              <CandleGlyph
                tint={selected.ownerHue}
                big
                praying={selected.mine || selected.prayedBy.includes("me")}
              />
            </div>
            <div className="mt-4 text-center text-[10px] tracking-[0.2em] text-[#9a9a9f]">
              INTENCIÓN DE {selected.ownerName.toUpperCase()}
            </div>
            <p className="mt-1 text-center font-serif-holy text-xl">
              “{selected.intention}”
            </p>
            <p className="mt-2 text-center text-xs text-[#a8a8ad]">
              Encendida · quedan {hoursLeft(selected)} h · 🙏 {selected.prayedBy.length} rezando
            </p>

            {selected.prayedBy.includes("me") || selected.mine ? (
              <div className="mt-5 rounded-full bg-[#eef2e6] py-3 text-center text-sm font-medium text-[#5c6b3f]">
                {selected.mine
                  ? "Es tu intención · presente todo el día"
                  : "Ya estás rezando por esta intención (24 h)"}
              </div>
            ) : (
              <button
                onClick={() => {
                  prayForCandle(selected.id);
                  setSelected({
                    ...selected,
                    prayedBy: [...selected.prayedBy, "me"],
                  });
                }}
                className="mt-5 h-12 w-full rounded-full bg-[#1c1c1e] font-medium text-white"
              >
                Rezar por esta intención · 💧
              </button>
            )}
            <p className="mt-2 text-center text-[11px] text-[#a8a8ad]">
              Se añadirá a tus intenciones por 24 h y estará presente en tu Rosario.
            </p>

            <button
              onClick={() => setSelected(null)}
              className="mt-3 h-11 w-full text-sm text-[#8a8a90]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Compose a new candle */}
      {composing && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="fade-up w-full max-w-md rounded-3xl bg-white p-6">
            <h3 className="text-center font-serif-holy text-xl font-semibold">
              Encender una vela
            </h3>
            <p className="mt-1 text-center text-sm text-[#8a8a90]">
              Ofrece una intención. Permanecerá 24 horas.
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="¿Por quién o por qué deseas orar?"
              className="mt-4 min-h-[90px] w-full resize-none rounded-2xl border border-[#e6e3db] bg-[#faf9f6] p-3 text-sm focus:border-[#c4a35a] focus:outline-none"
            />
            <button
              onClick={() => {
                lightCandle(draft);
                setDraft("");
                setComposing(false);
              }}
              className="mt-4 h-12 w-full rounded-full bg-[#1c1c1e] font-medium text-white"
            >
              Encender 🕯️
            </button>
            <button
              onClick={() => setComposing(false)}
              className="mt-2 h-11 w-full text-sm text-[#8a8a90]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
