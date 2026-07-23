import { RosaryRing } from "../../components/RosaryRing";

type Props = {
  meta: { title: string; subtitle: string };
  roomActive: boolean;
  onToggleRoom: () => void;
  onStartCommunity: () => void;
  onStartSolo: () => void;
  onJoin: () => void;
  onOpenGallery?: () => void;
};

export function Lobby({
  meta,
  roomActive,
  onToggleRoom,
  onStartCommunity,
  onStartSolo,
  onJoin,
  onOpenGallery,
}: Props) {
  const peopleNow = roomActive ? 47 : 0;

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
          <h1 className="mt-1 font-serif-holy text-3xl font-bold">{meta.title}</h1>
          <div className="text-sm text-white/45">{meta.subtitle}</div>
        </div>

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
            <Stat value="157" label="Rosarios hoy" />
            <Stat value="684" label="Usuarios hoy" />
            <Stat value="15,700" label="Avemarías hoy" />
          </div>
        </div>

        {/* Dev preview toggle for requirement #4 */}
        <button
          onClick={onToggleRoom}
          className="relative mx-auto mt-6 flex items-center gap-2 text-xs text-white/35"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              roomActive ? "bg-[#5fce7e]" : "bg-white/30"
            }`}
          />
          {roomActive
            ? "Simulando: sala con gente (tocar para vaciar)"
            : "Simular: sala con gente orando"}
        </button>
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
