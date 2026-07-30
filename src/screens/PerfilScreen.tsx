import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/auth/AuthProvider";
import { useSpiritual } from "@/fruits/store";
import { useGardenDna } from "@/garden/dna";
import { GardenSvg } from "@/garden/GardenSvg";
import { GardenFullscreen } from "@/garden/GardenFullscreen";
import { TERRAIN_LABEL, TREE_LABEL, MATURITY_LABEL, SEASON_LABEL, SHRINE_LABEL } from "@/garden/types";
import type { GardenState } from "@/garden/types";
import { TIME_LABEL, TIME_ICON } from "@/garden/time";
import { derivePersonalTraits, SPECIES_LABEL, type PersonalInput } from "@/garden/personal";
import { levelTitle } from "@/garden/levels";
import { getAnonIdentity } from "@/auth/anonId";
import { cn } from "@/utils/cn";
import { caracasDateOnly } from "@/utils/caracas";

type PerfilTab = "jardin" | "intenciones" | "oratorio";
interface Props { onOpenAuth: () => void; }

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initial = name?.charAt(0).toUpperCase() || "?";
  const colors = ["#7a8a5c", "#5a8a7a", "#8a6a5c", "#6a7a8a", "#8a5a6a", "#5a6a8a"];
  const idx = (name.charCodeAt(0) || 0) % colors.length;
  return (
    <div className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: colors[idx], fontSize: size * 0.4, flexShrink: 0 }}>
      {initial}
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-[#e8e4db] bg-white p-3">
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-lg font-semibold text-[#1c1c1e]">{value}</span>
      <span className="text-[9px] font-medium uppercase tracking-wider text-[#9a9a9f]">{label}</span>
    </div>
  );
}

function Meter({ label, value, icon, from, to }: {
  label: string; value: number; icon: string; from: string; to: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9a9a9f]">
          {icon} {label}
        </span>
        <span className="text-[11px] font-semibold text-[#5a5a5f]">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#eceae4]">
        <motion.div className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${from}, ${to})` }}
          initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
    </div>
  );
}

function WaterModal({ mode, water, onClose, onConfirm }: {
  mode: "single" | "bulk"; water: number;
  onClose: () => void; onConfirm: (intention: string) => void;
}) {
  const [intention, setIntention] = useState("");
  const SUGGESTIONS = ["Por mi familia", "Por los enfermos", "Por Venezuela", "En acción de gracias"];

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div className="w-full max-w-[430px] rounded-t-3xl bg-white p-6 pb-8"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}>
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-[#e6e3db]" />
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f4ff] text-2xl">
            {mode === "bulk" ? "🌊" : "💧"}
          </div>
          <div>
            <p className="font-semibold text-[#1c1c1e]">
              {mode === "bulk" ? `Regar con todo (${water} 💧)` : "Regar mi jardín"}
            </p>
            <p className="text-sm text-[#9a9a9f]">
              {mode === "bulk" ? "Toda tu agua nutrirá las raíces" : "Consume 1 gota de agua espiritual"}
            </p>
          </div>
        </div>

        <textarea id="water-intention" name="water-intention" value={intention} onChange={(e) => setIntention(e.target.value)}
          placeholder="¿Por qué intención riegas hoy? (opcional)" rows={3}
          className="w-full resize-none rounded-2xl border border-[#e6e3db] bg-[#f7f6f3] p-3 text-sm text-[#1c1c1e] placeholder:text-[#a8a8ad] focus:border-[#c4a35a] focus:outline-none" />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setIntention(s)}
              className="rounded-full border border-[#e6e3db] px-3 py-1 text-[11px] text-[#7a7a80] hover:border-[#c4a35a] hover:text-[#1c1c1e]">
              {s}
            </button>
          ))}
        </div>

        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => { onConfirm(intention.trim() || "Con amor"); onClose(); }}
          className="mt-4 w-full rounded-2xl bg-[#1c1c1e] py-3.5 text-sm font-semibold text-white">
          {mode === "bulk" ? "🌊 Regar con toda el agua" : "💧 Regar mi jardín"}
        </motion.button>
        <button onClick={onClose} className="mt-2 w-full py-2 text-sm text-[#9a9a9f]">Cancelar</button>
      </motion.div>
    </motion.div>
  );
}

function MilestoneAccordion({ milestones }: { milestones: GardenState["milestones"] }) {
  const [open, setOpen] = useState(false);
  const [last, ...rest] = milestones;
  if (!last) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8e4db] bg-white">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-4">
        <div className="text-left">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9a9a9f]">Último hito</p>
          <p className="mt-0.5 text-sm font-medium text-[#1c1c1e]">{last.label}</p>
          <p className="text-xs text-[#9a9a9f]">{last.detail}</p>
        </div>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          viewBox="0 0 24 24" fill="none" stroke="#9a9a9f" strokeWidth={2} width={18} height={18}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && rest.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden">
            <div className="space-y-3 border-t border-[#f0ede8] px-4 pb-4 pt-3">
              {rest.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#d4af6a]" />
                  <div>
                    <p className="text-sm text-[#1c1c1e]">{m.label}</p>
                    <p className="text-xs text-[#9a9a9f]">{m.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JardinTab({ onOpenAuth, displayName }: { onOpenAuth: () => void; displayName: string }) {
  const { user } = useAuth();
  const {
    balance, gardenState: liveState,
    justWatered, waterGarden, bulkWaterGarden,
  } = useSpiritual();

  const identity = user?.id ?? getAnonIdentity();
  const traits = useGardenDna(identity);

  const state = liveState;

  const [waterModal, setWaterModal] = useState<"single" | "bulk" | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const canWater = balance.agua >= 1;
  const canBulk = balance.agua > 1;

  const personalInput: PersonalInput = useMemo(() => ({
    name: displayName,
    registeredAt: user?.created_at ? caracasDateOnly(user.created_at) : caracasDateOnly(),
    lastSeenAt: caracasDateOnly(),
    points: state.pointsScore,
  }), [displayName, user?.created_at, state.pointsScore]);

  const pTraits = useMemo(() => derivePersonalTraits(personalInput), [personalInput]);

  const PHASE_QUOTE: Record<number, string> = {
    1: "Una semilla escondida guarda el bosque entero.",
    2: "El brote se abre paso: cada oración es lluvia.",
    3: "Tu obra crece en silencio. Cada oración nutre sus raíces.",
    4: "Jardín cerrado, fuente sellada. La gracia desborda.",
  };

  const handleSingleWater = async (intention: string) => {
    await waterGarden(intention);
    setWaterModal(null);
  };

  const handleBulkWater = async (intention: string) => {
    await bulkWaterGarden(intention);
    setWaterModal(null);
  };

  return (
    <div className="space-y-3 pb-2">
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-[#e8e4db] bg-[#bfe0ee] cursor-zoom-in"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setFullscreenOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setFullscreenOpen(true); }}
        aria-label="Abrir jardín en pantalla completa"
      >
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur-sm">
          <span className="font-mono text-[10px] font-semibold text-white/85">
            {traits.dna.slice(0, 8).toUpperCase()}
          </span>
          <span className="text-[10px] text-white/60">
            {TERRAIN_LABEL[traits.terrain]} · {TREE_LABEL[traits.treeSpecies]}
          </span>
        </div>

        <div className="absolute right-3 top-3 z-10 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur-sm">
          <span className="text-[10px] font-semibold text-[#e8c98a]">
            Nv. {state.level} · {levelTitle(state.level)}
          </span>
        </div>

        <div className="absolute right-3 bottom-3 z-10 rounded-full bg-black/40 p-2 backdrop-blur-sm text-white/80">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{ height: 214 }}>
          <GardenSvg dna={traits} state={state} justWatered={justWatered} personal={personalInput} />
        </div>

        <div className="absolute bottom-2 left-3 z-10 flex gap-1.5">
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/80 backdrop-blur-sm">
            {TIME_ICON[state.timeOfDay]} {TIME_LABEL[state.timeOfDay]}
          </span>
          <span className="rounded-full bg-black/30 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/65 backdrop-blur-sm">
            {SEASON_LABEL[state.season]} · {MATURITY_LABEL[state.maturityTier]}
          </span>
        </div>

        {state.freshWater && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-2 right-3 z-10 rounded-full bg-[#1a6a4a]/80 px-2 py-0.5 backdrop-blur-sm">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white">
              🌱 Brotes frescos · {Math.ceil(state.freshWaterRatio * 24)} h
            </span>
          </motion.div>
        )}
      </motion.div>

      <p className="px-2 text-center text-xs italic text-[#7a8a5c]">
        {PHASE_QUOTE[state.growthPhase]}
      </p>

      <div className="flex gap-2">
        <motion.button
          onClick={() => { if (canWater) setWaterModal("single"); }}
          whileTap={canWater ? { scale: 0.97 } : {}}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all",
            canWater ? "bg-[#1c1c1e] text-white shadow-sm" : "bg-[#dcd9d2] text-[#9a9a9f]",
          )}>
          💧 {canWater ? `Regar mi jardín (${balance.agua} 💧)` : "Regar mi jardín (Sin agua)"}
        </motion.button>
        {canBulk && (
          <motion.button onClick={() => setWaterModal("bulk")} whileTap={{ scale: 0.97 }}
            title={`Regar con todo (${balance.agua} 💧)`}
            className="rounded-2xl bg-[#3a6a8a] px-4 py-3.5 text-sm font-semibold text-white shadow-sm">
            🌊
          </motion.button>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-[#e8e4db] bg-white p-4">
        <Meter label="Salud"  value={state.health}     icon="🌿" from="#7a8a5c" to="#a8c880" />
        <Meter label="Agua"   value={state.waterLevel} icon="💧" from="#3a7a9a" to="#7ac0e0" />
        <Meter label="Luz"    value={state.lightLevel} icon="✨" from="#c49a3a" to="#f0d488" />
        <div className="flex items-center justify-between border-t border-[#f0ede8] pt-2.5 text-[11px]">
          <span className="text-[#9a9a9f]">Fase {state.growthPhase} · {MATURITY_LABEL[state.maturityTier]}</span>
          <span className="font-semibold text-[#7a8a5c]">{state.pointsScore} pts</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon="📿" value={state.totalRosaries}   label="Rosarios" />
        <StatCard icon="🩷" value={state.totalCoronillas} label="Coronillas" />
        <StatCard icon="🕊️" value={state.totalNovenas}    label="Novenas" />
        <StatCard icon="💧" value={balance.agua}          label="Agua" />
        <StatCard icon="🌱" value={balance.semilla}       label="Semillas" />
        <StatCard icon="🕯️" value={balance.vela}          label="Velas" />
        <StatCard icon="🔥" value={state.streak}          label="Racha" />
        <StatCard icon="🤝" value={state.commits}         label="Comunidad" />
        <StatCard icon="🚿" value={state.totalWaterings}  label="Riegos" />
      </div>

      <div className="rounded-2xl border border-[#e8e4db] bg-white p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#9a9a9f]">
          Tu huella en el jardín
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
          <Trait icon="🌸" label="Pétalos" value={`${pTraits.petalCount}`}
            from={`Nombre (${displayName.replace(/\s/g, "").length} letras)`} />
          <Trait icon="🎨" label="Matiz base" value={`${pTraits.dominantHue}°`}
            from={`Inicial «${displayName.charAt(0).toUpperCase()}»`}
            swatch={`hsl(${pTraits.dominantHue} 66% 62%)`} />
          <Trait icon="🌳" label="Curva del tronco" value={`${pTraits.trunkCurve.toFixed(0)}°`}
            from={`Día ${personalInput.registeredAt.getDate()}`} />
          <Trait icon="🌻" label="Especie" value={SPECIES_LABEL[pTraits.flowerSpecies]}
            from={`Mes ${personalInput.registeredAt.getMonth() + 1}`} />
          <Trait icon="🌿" label="Ramificación" value={`${pTraits.treeDepth} niveles`}
            from={`${state.pointsScore} pts`} />
          <Trait icon={pTraits.nocturnal ? "🪰" : "🐝"} label="Fauna"
            value={pTraits.nocturnal ? "Luciérnagas" : "Abejas"} from="Hora de conexión" />
        </div>
      </div>

      <div className="rounded-2xl border border-[#e8e4db] bg-white p-4">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#9a9a9f]">
          Señales del jardín
        </p>
        <div className="space-y-1.5 text-xs">
          <Signal ok={state.freshWater}
            text="Brotes efímeros de hoy" hint="Riega cada día" />
          <Signal ok={state.activeCandles > 0}
            text={`${state.activeCandles} vela(s) ardiendo en el altar`} hint="Enciende velas" />
          <Signal ok={!!traits.shrine && (state.growthPhase >= 2 || state.totalRosaries >= 3)}
            text={SHRINE_LABEL[traits.shrine]} hint="3 Rosarios" />
          <Signal ok={state.totalRosaries >= 24 || (traits.flowerSpeciesBias === "rose" && state.totalRosaries >= 12)}
            text="Santuario mariano de enredaderas" hint="24 Rosarios" />
          <Signal ok={state.totalRosaries >= 24} text="Rosal de Gracia consolidado" hint="Tope de 5 rosas" />
          <Signal ok={state.totalNovenas >= 8} text="Lirio Dorado consolidado" hint="Tope de 3 lirios" />
          <Signal ok={traits.waterFeature === "river" && state.waterLevel >= 50}
            text="Ciervo bebiendo en el río (Sal 42)" hint="Río + agua ≥ 50%" />
          <Signal ok={state.streak >= 7 || state.commits >= 5}
            text="Paloma del Espíritu Santo" hint="Racha ≥ 7 o comunidad ≥ 5" />
        </div>
      </div>

      {state.milestones.length > 0 && <MilestoneAccordion milestones={state.milestones} />}

      {!user && (
        <motion.button onClick={onOpenAuth} whileTap={{ scale: 0.98 }}
          className="w-full rounded-2xl border border-[#e6e3db] bg-white p-4 text-center">
          <p className="text-sm font-medium text-[#1c1c1e]">
            Sincroniza tu jardín
          </p>
          <p className="mt-0.5 text-xs text-[#9a9a9f]">
            Inicia sesión para que tus oraciones lo hagan crecer de verdad
          </p>
        </motion.button>
      )}

      <AnimatePresence>
        {waterModal && (
          <WaterModal mode={waterModal} water={balance.agua}
            onClose={() => setWaterModal(null)}
            onConfirm={(i) => (waterModal === "bulk" ? handleBulkWater(i) : handleSingleWater(i))} />
        )}
      </AnimatePresence>

      <GardenFullscreen
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        dna={traits}
        state={state}
        personal={personalInput}
      />
    </div>
  );
}

function Trait({ icon, label, value, from, swatch }: {
  icon: string; label: string; value: string; from: string; swatch?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-sm leading-none">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wider text-[#a8a8ad]">{label}</p>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1c1c1e]">
          {swatch && (
            <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
              style={{ background: swatch }} />
          )}
          {value}
        </p>
        <p className="truncate text-[9px] text-[#c0c0c5]">← {from}</p>
      </div>
    </div>
  );
}

function Signal({ ok, text, hint }: { ok: boolean; text: string; hint: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-[13px]", ok ? "opacity-100" : "opacity-30")}>{ok ? "✅" : "⚪"}</span>
      <span className={cn("flex-1", ok ? "text-[#1c1c1e]" : "text-[#b0b0b5]")}>{text}</span>
      <span className="text-[10px] text-[#c0c0c5]">{hint}</span>
    </div>
  );
}

function IntencionesTab() {
  const { activeIntentions } = useSpiritual();
  if (activeIntentions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-5xl">🕯️</div>
        <p className="text-sm font-medium text-[#1c1c1e]">Aún no has encendido velas</p>
        <p className="mt-1 text-xs text-[#9a9a9f]">Completa el Rosario para ganar velas</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#9a9a9f]">Velas activas</p>
      {activeIntentions.map((c) => {
        const hours = Math.max(0, Math.round((new Date(c.expires_at).getTime() - Date.now()) / 3_600_000));
        return (
          <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-2xl border border-[#e8e4db] bg-white p-4">
            <motion.span className="text-2xl" animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>🕯️</motion.span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[#1c1c1e]">{c.intention}</p>
              <p className="mt-1 text-xs text-[#9a9a9f]">{hours} h restantes</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function OratorioTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-5xl">🎙️</div>
      <p className="text-sm font-medium text-[#1c1c1e]">Tus notas de voz aparecerán aquí</p>
      <p className="mt-1 text-xs text-[#9a9a9f]">Graba reflexiones y oraciones personales</p>
      <motion.button whileTap={{ scale: 0.97 }}
        className="mt-6 rounded-2xl border border-[#e6e3db] bg-white px-6 py-3 text-sm font-medium text-[#1c1c1e]">
        Iniciar grabación
      </motion.button>
    </div>
  );
}

export function PerfilScreen({ onOpenAuth }: Props) {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<PerfilTab>("jardin");

  const displayName =
    (user?.name as string) ?? user?.email?.split("@")[0] ?? "Usuario";

  const TABS: { id: PerfilTab; label: string; icon: string }[] = [
    { id: "jardin", label: "Mi Jardín", icon: "🌿" },
    { id: "intenciones", label: "Intenciones", icon: "🕯️" },
    { id: "oratorio", label: "Oratorio", icon: "🎙️" },
  ];

  return (
    <div className="no-scrollbar relative min-h-full" style={{ background: "#f7f6f3" }}>
      <div className="sticky top-0 z-20 bg-[#f7f6f3] px-4 pb-4 pt-12">
        <div className="mb-5 flex items-center gap-3">
          <Avatar name={displayName} />
          <div>
            <p className="font-semibold text-[#1c1c1e]">{displayName}</p>
            <button onClick={user ? signOut : onOpenAuth}
              className="text-xs text-[#9a9a9f] transition-colors hover:text-[#1c1c1e]">
              {user ? "Cerrar sesión" : "Acceder con tu cuenta"}
            </button>
          </div>
        </div>

        <div className="flex gap-1 rounded-2xl bg-[#eceae4] p-1">
          {TABS.map((t) => (
            <motion.button key={t.id} onClick={() => setTab(t.id)} whileTap={{ scale: 0.97 }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
                tab === t.id ? "bg-[#1c1c1e] text-white shadow-sm" : "text-[#8a8a90] hover:text-[#1c1c1e]",
              )}>
              <span>{t.icon}</span><span>{t.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-28">
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}>
            {tab === "jardin" && <JardinTab onOpenAuth={onOpenAuth} displayName={displayName} />}
            {tab === "intenciones" && <IntencionesTab />}
            {tab === "oratorio" && <OratorioTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
