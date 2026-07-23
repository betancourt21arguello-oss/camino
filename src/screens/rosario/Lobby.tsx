import { useState } from "react";
import { RosaryRing } from "../../components/RosaryRing";
import { DEVOTION_LIST } from "../../engine/devotions";

type Props = {
  meta: { title: string; subtitle: string };
  roomActive: boolean;
  peopleNow: number;
  metrics: { rosariesToday: number; usersToday: number; aveMariasToday: number };
  loading?: boolean;
  onStartCommunity: () => void;
  onStartSolo: () => void;
  onJoin: () => void;
  onOpenGallery?: () => void;
  selectedDevotionId: string;
  onSelectDevotion: (id: string) => void;
};

export function Lobby({
  meta,
  roomActive,
  peopleNow,
  metrics,
  loading,
  onStartCommunity,
  onStartSolo,
  onJoin,
  onOpenGallery,
  selectedDevotionId,
  onSelectDevotion,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-full bg-[#0a0a0b] pb-28 text-white">
      <section className="relative overflow-hidden px-5 pt-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 60% at 50% -10%, rgba(20,26,48,0.9), transparent 60%)",
          }}
        />
        <div className="relative text-center">
          <div className="text-[11px] font-medium tracking-[0.25em] text-[var(--gold)]">
            ORACIÓN PERPETUA
          </div>
          <button onClick={() => setMenuOpen(true)} className="mt-1 flex items-center justify-center gap-2 w-full">
            <h1 className="font-serif-holy text-3xl font-bold">{meta.title}</h1>
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="text-sm text-white/45">{meta.subtitle}</div>
        </div>
        
        {menuOpen && (
          <div className="absolute inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#141416] rounded-3xl p-6 border border-white/10 mb-20 fade-up">
              <h3 className="text-xl font-serif-holy font-semibold text-white mb-4">Elige una devoción</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {DEVOTION_LIST.map(d => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onSelectDevotion(d.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition ${selectedDevotionId === d.id ? 'border-[var(--gold)] bg-[var(--gold)]/10' : 'border-white/10 bg-white/5'}`}
                  >
                    <div className={`font-semibold ${selectedDevotionId === d.id ? 'text-[var(--gold)]' : 'text-white'}`}>{d.title}</div>
                    <div className="text-xs text-white/50 mt-1">{d.subtitle}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setMenuOpen(false)} className="w-full h-12 mt-4 text-white/50 rounded-full border border-white/10">Cerrar</button>
            </div>
          </div>
        )}

        <div className="relative mt-8">
          <RosaryRing
            topLabel="AVE MARÍA"
            centerMain="0"
            centerSub="de 10"
            progress={0}
            beadTotal={10}
            beadDone={0}
          />
        </div>

        <p className="relative mt-6 text-center text-sm text-white/60">
          {peopleNow === 0 ? (
            <>0 personas orando ahora mismo</>
          ) : (
            <>
              <span className="text-[#5fce7e] font-medium">{peopleNow} personas</span>{" "}
              orando ahora mismo
            </>
          )}
        </p>

        <div className="relative mt-6 text-center">
          <div className="text-[11px] font-medium tracking-[0.25em] text-[var(--gold)]">
            1.º MISTERIO
          </div>
          <h2 className="mt-1 font-serif-holy text-2xl font-bold">
            La Oración en el Huerto
          </h2>
        </div>

        <p className="relative mx-auto mt-6 max-w-sm text-center text-[15px] leading-relaxed text-white/70">
          {peopleNow === 0
            ? "La sala está en silencio. Sé quien encienda la primera llama de esta oración que nunca se apaga."
            : "Una oración que nunca se apaga. Entra donde está la comunidad y continúa con ella."}
        </p>

        {/* --- Buttons depend on room state (state machine) --- */}
        <div className="relative mt-7 space-y-3">
          {roomActive ? (
            <button
              onClick={onJoin}
              className="h-14 w-full rounded-2xl bg-[var(--gold)] text-[15px] font-semibold text-black transition active:scale-[0.99]"
            >
              Unirse al Rosario en curso
            </button>
          ) : (
            <button
              onClick={onStartCommunity}
              className="h-14 w-full rounded-2xl bg-[var(--gold)] text-[15px] font-semibold text-black transition active:scale-[0.99]"
            >
              Iniciar Rosario Comunitario
            </button>
          )}

          <button
            onClick={onStartSolo}
            className="h-14 w-full rounded-2xl border border-white/15 bg-white/[0.03] text-[15px] font-medium text-white/85 transition active:scale-[0.99]"
          >
            Iniciar Rosario en Solitario
          </button>

          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              className="h-12 w-full text-sm text-[var(--gold)] underline-offset-4 hover:underline"
            >
              Galería de Oración · obras nacidas de la comunidad
            </button>
          )}
        </div>

        {/* Muro de contemplación */}
        <div className="relative mt-8 rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="text-center text-[11px] font-semibold tracking-[0.2em] text-white/45">
            MURO DE CONTEMPLACIÓN
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-white/8 text-center">
            <Stat value={loading ? "…" : String(metrics.rosariesToday)} label="Rosarios hoy" />
            <Stat value={loading ? "…" : String(metrics.usersToday)} label="Usuarios hoy" />
            <Stat value={loading ? "…" : metrics.aveMariasToday.toLocaleString("es")} label="Avemarías hoy" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-1">
      <div className="font-serif-holy text-2xl font-semibold text-[var(--gold)]">
        {value}
      </div>
      <div className="mt-1 text-xs text-white/45">{label}</div>
    </div>
  );
}
