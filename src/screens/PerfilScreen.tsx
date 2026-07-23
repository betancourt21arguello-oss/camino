import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";
import { getAnonIdentity } from "../auth/anonId";
import { useSpiritual } from "../fruits/store";
import { FRUITS } from "../fruits/types";
import { useGardenDna } from "../garden/dna";
import { GardenSvg } from "../garden/GardenSvg";
import type { GardenEvent, GardenEventType } from "../garden/types";

type ProfileTab = "jardin" | "intenciones" | "oratorio";

const TERRAIN_LABEL: Record<string, string> = {
  bosque: "Bosque",
  pradera: "Pradera",
  colina: "Colina",
  monastico: "Monástico",
  mediterraneo: "Mediterráneo",
};
const TREE_LABEL: Record<string, string> = {
  olivo: "Olivo",
  cedro: "Cedro",
  cipres: "Ciprés",
  roble: "Roble",
  sauce: "Sauce",
};

const EVENT_LABELS: Partial<Record<GardenEventType, string>> = {
  ROSARY_COMPLETED: "Un rosal creció con tus Rosarios",
  NOVENA_COMPLETED: "Una Novena marcó el sendero",
  CORONILLA_COMPLETED: "Una flor blanca de Coronilla",
  SILENCE_TIME: "El silencio dejó hojas nuevas",
  WATER_GARDEN: "Regaste tu jardín",
  COMMUNITY_PRAYER: "La comunidad trajo luz",
  STREAK_MAINTAINED: "Tu perseverancia fortaleció el árbol",
  TASK_COMPLETED: "Un compromiso cumplido",
  SEED_RECEIVED: "Nuevas semillas silvestres",
  CANDLE_LIT: "Una vela acompañó la noche",
};

const INTENTIONS = ["Familia", "Paz", "Conversión", "Salud", "Trabajo", "Gratitud"];

/** Agrupa eventos del mismo tipo y día para evitar spam en Historia Viva. */
function groupLastMilestones(events: GardenEvent[]) {
  const seen = new Set<string>();
  const out: { type: GardenEventType; label: string; intention?: string }[] = [];
  for (let i = events.length - 1; i >= 0 && out.length < 4; i--) {
    const ev = events[i];
    const day = new Date(ev.createdAt).toDateString();
    const key = `${ev.type}-${day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = EVENT_LABELS[ev.type];
    if (!label) continue;
    out.push({ type: ev.type, label, intention: ev.meta?.intention });
  }
  return out;
}

export function PerfilScreen({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { balance, gardenEvents, gardenState, activeIntentions, waterGarden } = useSpiritual();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<ProfileTab>("jardin");

  const identity = useMemo(() => user?.id ?? getAnonIdentity(), [user?.id]);
  const traits = useGardenDna(identity);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f7f6f3] text-[#1c1c1e]">
      {/* Cabecera */}
      <header className="flex shrink-0 items-center justify-between px-6 pb-3 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9ede0] font-serif-holy text-base text-[#5c6b3f]">
            {(user?.name ?? "T").slice(0, 1).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium">{user?.name ?? "Peregrino"}</div>
            {user ? (
              <button onClick={() => void signOut()} className="text-[11px] text-[#9a9a9f]">
                Cerrar sesión
              </button>
            ) : (
              <button onClick={onOpenAuth} className="text-[11px] text-[#a68b4e]">
                Guardar mi Camino
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="shrink-0 px-6">
        <div className="flex rounded-full bg-[#e9e7e0] p-1 text-xs">
          {(
            [
              { id: "jardin", label: "🌳 Mi Jardín" },
              { id: "intenciones", label: "🕯️ Intenciones" },
              { id: "oratorio", label: "🎙️ Oratorio" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-[38px] flex-1 rounded-full font-medium transition ${
                tab === t.id ? "bg-[#1c1c1e] text-white" : "text-[#6b6b70]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "jardin" && (
            <motion.div
              key="jardin"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <JardinTab traits={traits} gardenState={gardenState} balance={balance} events={gardenEvents} waterGarden={waterGarden} agua={balance.agua} />
            </motion.div>
          )}
          {tab === "intenciones" && (
            <motion.div
              key="intenciones"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <IntencionesTab intentions={activeIntentions} />
            </motion.div>
          )}
          {tab === "oratorio" && (
            <motion.div
              key="oratorio"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <OratorioTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// -------------------------------------------------- Mi Jardín

function JardinTab({
  traits,
  gardenState,
  balance,
  events,
  waterGarden,
  agua,
}: {
  traits: ReturnType<typeof useGardenDna>;
  gardenState: ReturnType<typeof useSpiritual>["gardenState"];
  balance: ReturnType<typeof useSpiritual>["balance"];
  events: GardenEvent[];
  waterGarden: (intention: string) => boolean;
  agua: number;
}) {
  const [showWater, setShowWater] = useState(false);
  const [intention, setIntention] = useState(INTENTIONS[0]);
  const [rain, setRain] = useState(false);
  const [watered, setWatered] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const milestones = useMemo(() => groupLastMilestones(events), [events]);

  const handleWater = () => {
    if (agua <= 0) return;
    if (waterGarden(intention)) {
      setRain(true);
      setWatered(true);
      setTimeout(() => setRain(false), 2400);
      setTimeout(() => setWatered(false), 1600);
      setShowWater(false);
    }
  };

  return (
    <div className="px-4 pb-6 pt-3">
      {/* SVG + pastilla ADN */}
      <div className="relative overflow-hidden rounded-3xl border border-[#dedbd1] bg-[#f8f5ed]">
        {traits ? (
          <GardenSvg dna={traits} state={gardenState} showRain={rain} justWatered={watered} />
        ) : (
          <div className="flex h-52 items-center justify-center text-sm text-[#9a9a9f]">
            Preparando tu jardín…
          </div>
        )}
        {traits && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm">
            <span className="font-mono text-[10px] text-white/80">
              {traits.dna.slice(0, 10).toUpperCase()}
            </span>
            <span className="text-[10px] text-white/50">
              {TERRAIN_LABEL[traits.terrain]} · {TREE_LABEL[traits.treeSpecies]}
            </span>
          </div>
        )}
      </div>

      <p className="mt-2 px-1 text-center text-xs leading-relaxed text-[#9a9a9f]">
        Tu obra crece en silencio. Cada oración nutre sus raíces.
      </p>

      {/* Botón único: Regar */}
      <button
        onClick={() => setShowWater(true)}
        disabled={agua <= 0}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1c1c1e] text-sm font-medium text-white disabled:opacity-40"
      >
        💧 Regar mi jardín {agua > 0 ? `(Requiere 1💧 · ${agua})` : "(Sin agua)"}
      </button>

      {/* Grid de estadísticas fusionado */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatCard icon="🌹" label="Rosarios" value={gardenState.totalRosaries} />
        <StatCard icon="🤍" label="Coronillas" value={gardenState.totalCoronillas} />
        <StatCard icon="🪨" label="Novenas" value={gardenState.totalNovenas} />
        <StatCard icon={FRUITS.agua.symbol} label="Agua" value={balance.agua} />
        <StatCard icon={FRUITS.semilla.symbol} label="Semillas" value={balance.semilla} />
        <StatCard icon={FRUITS.vela.symbol} label="Velas" value={balance.vela} />
      </div>

      {/* Historia viva: último hito + acordeón */}
      <div className="mt-4 rounded-2xl border border-[#e6e3db] bg-white">
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div className="min-w-0">
            <div className="text-[10px] font-semibold tracking-[0.16em] text-[#9a9a9f]">
              ÚLTIMO HITO
            </div>
            <div className="mt-0.5 truncate text-sm">
              {milestones[0]?.label ?? "Tu jardín espera tu primera oración."}
            </div>
          </div>
          <span className={`ml-3 text-[#b0b0b5] transition-transform ${historyOpen ? "rotate-180" : ""}`}>
            ⌄
          </span>
        </button>
        <AnimatePresence>
          {historyOpen && milestones.length > 1 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-[#eee9df]"
            >
              {milestones.slice(1).map((m, i) => (
                <div key={i} className="border-b border-[#f0ece2] px-4 py-2.5 text-sm text-[#3b3b3d] last:border-0">
                  {m.label}
                  {m.intention && <span className="italic text-[#a09c93]"> · “{m.intention}”</span>}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal riego */}
      <AnimatePresence>
        {showWater && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-6"
            >
              <h3 className="text-center font-serif-holy text-xl font-semibold">Regar mi jardín</h3>
              <p className="mt-1 text-center text-sm text-[#8a8a90]">Elige una intención para hoy.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {INTENTIONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => setIntention(i)}
                    className={`h-11 rounded-full border text-sm transition ${
                      intention === i
                        ? "border-[#c4a35a] bg-[#f6efdd] text-[#8a6f34]"
                        : "border-[#e6e3db] bg-white text-[#6b6b70]"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <button onClick={handleWater} className="mt-5 h-12 w-full rounded-full bg-[#1c1c1e] font-medium text-white">
                Regar · {intention}
              </button>
              <button onClick={() => setShowWater(false)} className="mt-2 h-11 w-full text-sm text-[#8a8a90]">
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#e6e3db] bg-white px-2 py-3 text-center">
      <div className="text-lg">{icon}</div>
      <div className="mt-0.5 font-serif-holy text-lg leading-none">{value}</div>
      <div className="mt-1 text-[9px] tracking-[0.08em] text-[#9a9a9f]">{label.toUpperCase()}</div>
    </div>
  );
}

// -------------------------------------------------- Intenciones

function IntencionesTab({
  intentions,
}: {
  intentions: ReturnType<typeof useSpiritual>["activeIntentions"];
}) {
  const hoursLeft = (expiresAt: number) => Math.max(0, Math.round((expiresAt - Date.now()) / 3600_000));
  return (
    <div className="px-6 pb-6 pt-4">
      <div className="text-xs font-semibold tracking-[0.16em] text-[#9a9a9f]">
        INTENCIONES QUE ACOMPAÑAS · 24 H
      </div>
      <div className="mt-3 space-y-2">
        {intentions.length === 0 && (
          <p className="rounded-2xl border border-[#e6e3db] bg-white px-4 py-6 text-center text-sm text-[#a8a8ad]">
            Enciende una vela en Comunidad para acompañar una intención.
          </p>
        )}
        {intentions.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-[#e6e3db] bg-white p-3">
            <span className="relative h-8 w-5 rounded-t-sm bg-[#e8ddc4] shadow-[0_0_14px_rgba(212,175,106,0.35)]">
              <span className="absolute -top-2 left-1/2 h-2.5 w-1.5 -translate-x-1/2 rounded-full bg-[#d4af6a]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{c.intention}</div>
              <div className="text-xs text-[#9a9a9f]">
                {c.mine ? "Tu intención" : `Por ${c.ownerName}`} · quedan {hoursLeft(c.expiresAt)} h
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------- Oratorio

function OratorioTab() {
  const [recording, setRecording] = useState(false);
  return (
    <div className="px-6 pb-6 pt-4">
      <div className="text-xs font-semibold tracking-[0.16em] text-[#9a9a9f]">ORATORIO PERSONAL</div>
      <div className="mt-3 rounded-2xl border border-[#e6e3db] bg-white p-5 text-center">
        <button
          onClick={() => setRecording((v) => !v)}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1c1c1e] text-2xl text-white"
        >
          {recording ? "⏸️" : "🎙️"}
        </button>
        <p className="mt-3 text-sm text-[#8a8a90]">
          {recording ? "Grabando tu reflexión…" : "Graba una nota de voz espiritual."}
        </p>
      </div>
      <div className="mt-4 rounded-2xl border border-dashed border-[#d7d3c8] px-4 py-6 text-center text-sm text-[#a8a8ad]">
        Tus notas de voz aparecerán aquí.
      </div>
    </div>
  );
}
