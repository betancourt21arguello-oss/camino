import { useState, useEffect } from "react";
import { useSpiritual } from "../fruits/store";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import type { Candle } from "../fruits/types";

interface JornadaReflection {
  id: string;
  reflection: string;
  created_at: string;
  user_id: string;
}

function hoursLeft(c: Candle) {
  const ms = new Date(c.expires_at).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 3600_000));
}

function ownerHue(ownerId: string) {
  let hash = 0;
  for (let i = 0; i < ownerId.length; i++) {
    hash = ((hash << 5) - hash) + ownerId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function ownerLabel(ownerId: string) {
  return `Participante ${ownerId.slice(-4)}`;
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

function ReflexionesTab() {
  const [jornadaReflections, setJornadaReflections] = useState<JornadaReflection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReflections = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("jornada_reflections")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.warn("[camino] Error loading jornada reflections:", error.message);
        } else if (data) {
          setJornadaReflections(data as JornadaReflection[]);
        }
      } catch (err) {
        console.warn("[camino] Error loading jornada reflections:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReflections();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-[#9a9a9f]">Cargando reflexiones...</p>
      </div>
    );
  }

  if (jornadaReflections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-5xl">🕯️</div>
        <p className="text-sm font-medium text-[#1c1c1e]">Tus reflexiones aparecerán aquí</p>
        <p className="mt-1 text-xs text-[#9a9a9f]">Completa tu jornada diaria para compartir</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#9a9a9f]">Reflexiones recientes</p>
      {jornadaReflections.map((reflection) => (
        <div key={reflection.id} className="flex items-start gap-3 rounded-2xl border border-[#e8e4db] bg-white p-4">
          <span className="text-xl">🙏</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#1c1c1e] line-clamp-3">"{reflection.reflection}"</p>
            <p className="mt-1 text-[11px] text-[#9a9a9f]">
              {new Date(reflection.created_at).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ComunidadScreen() {
  const { user } = useAuth();
  const { lightCandle, prayForCandle, balance, syncError } = useSpiritual();
  const [tab, setTab] = useState<"intenciones" | "reflexiones">("intenciones");
  const [selected, setSelected] = useState<Candle | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [allCandles, setAllCandles] = useState<Candle[]>([]);

  useEffect(() => {
    const loadAllCandles = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("candles")
          .select("*")
          .order("lit_at", { ascending: false })
          .limit(100);
        if (error) {
          console.warn("[camino] Error loading all candles:", error.message);
        } else if (data) {
          setAllCandles(data as Candle[]);
        }
      } catch (err) {
        console.warn("[camino] Error loading all candles:", err);
      }
    };
    loadAllCandles();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const ch = supabase
      .channel("community-candles")
      .on("postgres_changes", { event: "*", schema: "public", table: "candles" }, async () => {
        if (!supabase) return;
        try {
          const { data } = await supabase
            .from("candles")
            .select("*")
            .order("lit_at", { ascending: false })
            .limit(100);
          if (data) setAllCandles(data as Candle[]);
        } catch {
          // ignore
        }
      })
      .subscribe();
    return () => { if (supabase) supabase.removeChannel(ch); };
  }, []);

  const active = allCandles.filter((c) => new Date(c.expires_at).getTime() > Date.now());
  const shown = active.slice(0, 40);
  const extra = Math.max(0, active.length - shown.length);

  const enriched = shown.map((c) => ({
    ...c,
    ownerHue: ownerHue(c.owner_id),
    ownerName: ownerLabel(c.owner_id),
    mine: c.owner_id === user?.id,
  }));

  return (
    <div className="min-h-full bg-[#f7f6f3] pb-28 text-[#1c1c1e] landscape:pb-0">
      <h1 className="pt-10 text-center text-2xl font-semibold">Comunidad</h1>

      {syncError && (
        <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
          {syncError}
        </div>
      )}

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
            onClick={() => {
              setComposing(true);
              setSelected(null);
            }}
            className="mx-auto mt-6 block min-h-[44px] rounded-full border border-[#d7d3c8] bg-white px-6 text-sm font-medium text-[#5c6b8f]"
          >
            🕯️ Encender una vela por alguien
          </button>

          <p className="mt-4 text-center text-xs text-[#a8a8ad]">
            Las velas encendidas no se apagan. Puedes rezar por cualquiera.
          </p>

           <div className="mx-auto mt-6 grid max-w-sm grid-cols-4 gap-x-3 gap-y-6 landscape:max-w-none">
            {enriched.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="flex flex-col items-center transition active:scale-95"
              >
                <CandleGlyph
                  tint={c.ownerHue}
                  praying={c.mine || (c.prayedBy ?? []).includes("me")}
                />
                {(c.prayedBy?.length ?? 0) > 0 && (
                  <span className="mt-1 text-[9px] text-[#9a9a9f]">
                    🙏 {c.prayedBy?.length ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          {extra > 0 && (
            <p className="mt-6 text-center text-sm text-[#9a9a9f]">
              + {extra} intenciones más encendidas por la comunidad
            </p>
          )}
        </div>
      ) : tab === "reflexiones" ? (
        <ReflexionesTab />
      ) : (
        <div className="px-6 pt-8 text-center text-sm text-[#9a9a9f]">
          Las reflexiones publicadas aparecerán aquí.
        </div>
      )}
      {selected && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="fade-up w-full max-w-md rounded-3xl bg-white p-6">
            <div className="flex justify-center">
              <CandleGlyph
                tint={ownerHue(selected.owner_id)}
                big
                praying={selected.owner_id === user?.id || (selected.prayedBy ?? []).includes("me")}
              />
            </div>
            <div className="mt-4 text-center text-[10px] tracking-[0.2em] text-[#9a9a9f]">
              INTENCIÓN DE {ownerLabel(selected.owner_id).toUpperCase()}
            </div>
            <p className="mt-1 text-center font-serif-holy text-xl">
              "{selected.intention}"
            </p>
            <p className="mt-2 text-center text-xs text-[#a8a8ad]">
              Encendida · quedan {hoursLeft(selected)} h · 🙏 {selected.prayedBy?.length ?? 0} rezando
            </p>

            {selected.owner_id === user?.id || (selected.prayedBy ?? []).includes("me") ? (
              <div className="mt-5 rounded-full bg-[#eef2e6] py-3 text-center text-sm font-medium text-[#5c6b3f]">
                {selected.owner_id === user?.id
                  ? "Es tu intención · presente todo el día"
                  : "Ya estás rezando por esta intención (24 h)"}
              </div>
            ) : (
              <button
                onClick={() => {
                  prayForCandle(selected.id);
                  setSelected({
                    ...selected,
                    prayedBy: [...(selected.prayedBy ?? []), "me"],
                  });
                  setAllCandles((prev) =>
                    prev.map((c) =>
                      c.id === selected.id
                        ? { ...c, prayedBy: [...(c.prayedBy ?? []), "me"] }
                        : c,
                    ),
                  );
                }}
                disabled={balance.vela <= 0}
                className={`mt-5 h-12 w-full rounded-full font-medium text-white ${
                  balance.vela <= 0 ? "bg-[#8a8a90]" : "bg-[#1c1c1e]"
                }`}
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
              id="candle-intention"
              name="candle-intention"
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
              disabled={balance.vela <= 0}
              className={`mt-4 h-12 w-full rounded-full font-medium text-white ${
                balance.vela <= 0 ? "bg-[#8a8a90]" : "bg-[#1c1c1e]"
              }`}
            >
              Encender 🕯️
            </button>
            <button
              onClick={() => {
                setComposing(false);
              }}
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
