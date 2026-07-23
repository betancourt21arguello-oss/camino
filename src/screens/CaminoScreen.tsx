import { CalendarStrip } from "../components/CalendarStrip";
import { useTodayLiturgy, TODAY_DAY } from "../liturgy/today";
import { useSpiritual } from "../fruits/store";
import { FRUITS } from "../fruits/types";
import { assetsByTag } from "../media/registry";
import type { WhatsAppAsset } from "../media/types";

export type ReaderTarget = "gospel" | "psalm" | "laudes" | "angelus" | "first";

type Props = {
  onStartJornada: () => void;
  onOpenReader: (t: ReaderTarget) => void;
  onOpenAsset: (assetId: string) => void;
  assets: WhatsAppAsset[];
};

export function CaminoScreen({
  onStartJornada,
  onOpenReader,
  onOpenAsset,
  assets,
}: Props) {
  const { liturgy } = useTodayLiturgy();
  const L = liturgy;
  const { balance } = useSpiritual();
  const laudesAudio = assetsByTag("laudes", assets)[0];
  const angelusAudio = assetsByTag("angelus", assets)[0];

  return (
    <div className="min-h-full bg-[#f7f6f3] pb-28 text-[#1c1c1e]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8">
        <div className="text-sm font-semibold tracking-[0.35em]">CAMINO</div>
        <div className="flex items-center gap-2 text-sm text-[#6b6b70]">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: L.liturgicalColor }}
          />
          {L.season}
        </div>
      </div>

      {/* Today's full date + weekday */}
      <div className="mt-6 text-center">
        <div className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#9a9a9f]">
          {L.weekday}
        </div>
        <div className="mt-1 font-serif-holy text-4xl font-semibold">
          {TODAY_DAY} de julio
        </div>
        <div className="text-sm text-[#8a8a90]">2026 · {L.saint.name}</div>
      </div>

      {/* Fruits summary (no gamification: symbols) */}
      <div className="mx-6 mt-5 flex items-center justify-around rounded-2xl border border-[#e6e3db] bg-white py-3">
        <Fruit symbol={FRUITS.vela.symbol} value={balance.vela} label="Velas" />
        <span className="h-8 w-px bg-[#eee9df]" />
        <Fruit symbol={FRUITS.semilla.symbol} value={balance.semilla} label="Semillas" />
        <span className="h-8 w-px bg-[#eee9df]" />
        <Fruit symbol={FRUITS.agua.symbol} value={balance.agua} label="Agua" />
      </div>

      {/* Calendar strip: past progress ← today → future liturgical events */}
      <CalendarStrip />

      {/* Verse card */}
      <div className="mt-6 px-6">
        <div className="overflow-hidden rounded-3xl bg-[#141c2e] shadow-sm">
          <div
            className="h-40 bg-cover bg-center"
            style={{
              backgroundImage: L.imageUrl
                ? `linear-gradient(180deg, rgba(20,28,46,0.15), rgba(20,28,46,0.55)), url(${L.imageUrl})`
                : "radial-gradient(120% 120% at 30% 10%, #2b3a5c, #0e1626)",
            }}
          />
          <div className="p-6">
            <p className="font-serif-holy text-2xl leading-snug text-white">
              “{L.quote.text}”
            </p>
            <p className="mt-3 text-sm text-white/50">{L.quote.ref}</p>
          </div>
        </div>
      </div>

      {/* Saint of the day */}
      <div className="mt-4 px-6">
        <div className="flex items-center gap-4 rounded-2xl border border-[#e6e3db] bg-white p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9ede0] font-serif-holy text-lg text-[#5c6b3f]">
            {L.saint.initial}
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] text-[#9a9a9f]">
              SANTO DEL DÍA
            </div>
            <div className="font-medium">{L.saint.name}</div>
            <div className="text-sm text-[#8a8a90]">{L.saint.title}</div>
          </div>
        </div>
      </div>

      {/* Marian message (if relevant) */}
      {L.marian?.relevant && (
        <div className="mt-4 px-6">
          <div className="rounded-2xl border border-[#e4dcef] bg-[#f5f1fb] p-4">
            <div className="text-[10px] tracking-[0.2em] text-[#8a7ab0]">
              MENSAJE DE LA VIRGEN · {L.marian.source.toUpperCase()}
            </div>
            <p className="mt-1 font-serif-holy text-[15px] leading-relaxed text-[#4a4360]">
              “{L.marian.text}”
            </p>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-5 px-6">
        <button
          onClick={onStartJornada}
          className="h-14 w-full rounded-2xl bg-[#1c1c1e] font-medium text-white transition active:scale-[0.99]"
        >
          Comenzar mi jornada
        </button>
      </div>

      {/* Quick actions: read Gospel/Psalm, pray Laudes/Ángelus */}
      <div className="mt-8 px-6">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-[#9a9a9f]">
          LITURGIA DE HOY
        </div>
        <p className="mt-1 text-sm text-[#8a8a90]">
          Entra cuando tu corazón esté listo.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ActionCard
            icon="📖"
            title="Evangelio del día"
            sub={L.gospel.ref}
            onClick={() => onOpenReader("gospel")}
          />
          <ActionCard
            icon="🎵"
            title="Salmo del día"
            sub={L.psalm.ref}
            onClick={() => onOpenReader("psalm")}
          />
          <ActionCard
            icon="☀️"
            title="Laudes del día"
            sub={laudesAudio ? `${laudesAudio.author} · audio disponible` : "12 personas rezando"}
            onClick={() => onOpenReader("laudes")}
          />
          <ActionCard
            icon="🕊️"
            title="Ángelus del día"
            sub={angelusAudio ? `${angelusAudio.author} · audio disponible` : "9 personas rezando"}
            onClick={() => onOpenReader("angelus")}
          />
        </div>

        <button
          onClick={() => onOpenReader("first")}
          className="mt-3 flex w-full items-center justify-between rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
        >
          <div>
            <div className="font-medium">Primera lectura</div>
            <div className="text-sm text-[#8a8a90]">{L.firstReading.ref}</div>
          </div>
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#b0b0b5]" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Cada asset de WhatsApp aparece según su tag. Laudes/Ángelus también
            viven dentro de sus portales; Evangelio leído y reflexión son accesos separados. */}
        <div className="mt-8 text-[11px] font-semibold tracking-[0.18em] text-[#9a9a9f]">
          ACOMPAÑAMIENTO RECIBIDO HOY
        </div>
        <div className="mt-3 divide-y divide-[#e2ded4] border-y border-[#e2ded4]">
          {assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onOpenAsset(asset.id)}
              className="flex min-h-[64px] w-full items-center gap-3 py-3 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ece8dd] text-[#8e794c]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{asset.title}</span>
                <span className="block text-xs text-[#8a8a90]">
                  {asset.author} · #{asset.tag}
                </span>
              </span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#b0b0b5]" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Fruit({ symbol, value, label }: { symbol: string; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-lg">{symbol}</div>
      <div className="text-base font-semibold">{value}</div>
      <div className="text-[9px] tracking-[0.1em] text-[#9a9a9f]">{label}</div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: string;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-[#e6e3db] bg-white p-4 text-left transition active:scale-[0.98]"
    >
      <div className="text-lg">{icon}</div>
      <div className="mt-2 font-medium">{title}</div>
      <div className="text-xs text-[#8a8a90]">{sub}</div>
    </button>
  );
}
