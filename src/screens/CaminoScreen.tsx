import { CalendarStrip } from "../components/CalendarStrip";
import { assetsByTag } from "../media/registry";
import type { WhatsAppAsset } from "../media/types";
import type { DailyLiturgy, LiturgicalEvent } from "../liturgy/types";
import { todayDayFromLiturgy } from "../liturgy/useDailyLiturgy";
import { useState } from "react";
import { useDailyPrayerPresence } from "../prayer/useDailyPrayerPresence";

export type ReaderTarget = "gospel" | "psalm" | "laudes" | "angelus" | "first" | "second";

type Props = {
  onStartJornada: () => void;
  onOpenReader: (t: ReaderTarget) => void;
  onOpenAsset: (assetId: string) => void;
  assets: WhatsAppAsset[];
  liturgy: DailyLiturgy | null;
  monthEvents: LiturgicalEvent[];
  pastProgress: Record<number, { rosaries: number; done: boolean }>;
  loadingDaily?: boolean;
};

export function CaminoScreen({
  onStartJornada,
  onOpenReader,
  onOpenAsset,
  assets,
  liturgy: L,
  monthEvents,
  pastProgress,
  loadingDaily,
}: Props) {
  const [saintOpen, setSaintOpen] = useState(false);
  const laudesAudio = assetsByTag("laudes", assets)[0];
  const angelusAudio = assetsByTag("angelus", assets)[0];
  const todayDay = todayDayFromLiturgy(L);
  const currentDate = L?.date ? new Date(`${L.date}T00:00:00`) : new Date();
  const monthName = currentDate.toLocaleDateString("es", { month: "long" });
  const year = currentDate.getFullYear();
  const laudesPresence = useDailyPrayerPresence("laudes");
  const angelusPresence = useDailyPrayerPresence("angelus");

  return (
    <div className="min-h-full bg-[#f7f6f3] pb-28 text-[#1c1c1e]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8">
        <div className="text-sm font-semibold tracking-[0.35em]">CAMINO</div>
        <div className="flex items-center gap-2 text-sm text-[#6b6b70]">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: L?.liturgicalColor ?? "#b8b4a8" }}
          />
          {L?.season ?? (loadingDaily ? "Cargando Gemini…" : "Daily API")}
        </div>
      </div>

      {/* Today's full date + weekday */}
      <div className="mt-6 text-center">
        <div className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#9a9a9f]">
          {L?.weekday ?? currentDate.toLocaleDateString("es", { weekday: "long" })}
        </div>
        <div className="mt-1 font-serif-holy text-4xl font-semibold">
          {todayDay} de {monthName}
        </div>
        <div className="text-sm text-[#8a8a90]">
          {year}{L?.saint?.name ? ` · ${L.saint.name}` : ""}
        </div>
      </div>

      {/* Calendar strip: past progress ← today → future liturgical events */}
      <CalendarStrip events={monthEvents} pastProgress={pastProgress} todayDay={todayDay} />

      {/* Verse card */}
      <div className="mt-6 px-6">
        <div className="overflow-hidden rounded-3xl bg-[#141c2e] shadow-sm">
          <div
            className="h-40 bg-cover bg-center"
            style={{
              backgroundImage: L?.imageUrl
                ? `linear-gradient(180deg, rgba(20,28,46,0.15), rgba(20,28,46,0.55)), url(${L.imageUrl})`
                : "radial-gradient(120% 120% at 30% 10%, #2b3a5c, #0e1626)",
            }}
          />
          <div className="p-6">
            <p className="font-serif-holy text-2xl leading-snug text-white">
              “{L?.quote?.text ?? "Gemini aún no ha generado la frase de hoy."}”
            </p>
            <p className="mt-3 text-sm text-white/50">{L?.quote?.ref ?? "camino-api.byp.workers.dev"}</p>
          </div>
        </div>
      </div>

      {/* Saint of the day */}
      <div className="mt-4 px-6">
        <button
          onClick={() => L?.saint && setSaintOpen(true)}
          className="flex w-full items-center gap-4 rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
        >
          {L?.saint?.imageUrl ? (
            <img src={L.saint.imageUrl} alt={L.saint.name} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9ede0] font-serif-holy text-lg text-[#5c6b3f]">?</div>
          )}
          <div>
            <div className="text-[10px] tracking-[0.2em] text-[#9a9a9f]">
              SANTO DEL DÍA
            </div>
            <div className="font-medium">{L?.saint?.name ?? "Santo del día"}</div>
            <div className="text-sm text-[#8a8a90]">{L?.saint?.title ?? "Pendiente de Gemini"}</div>
          </div>
          <span className="ml-auto text-[#b0b0b5]">›</span>
        </button>
        {L?.secondReading && (
          <button
            onClick={() => onOpenReader("second")}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
          >
            <div>
              <div className="font-medium">Segunda lectura</div>
              <div className="text-sm text-[#8a8a90]">{L.secondReading.ref}</div>
            </div>
            <span className="text-[#b0b0b5]">›</span>
          </button>
        )}
      </div>

      {/* Marian message (if relevant) */}
      {L?.suggestedNovenas && L.suggestedNovenas.length > 0 && (
        <div className="mt-4 px-6">
          <div className="rounded-2xl border border-[#e6e3db] bg-[#f8f5ed] p-4">
            <div className="text-[10px] tracking-[0.2em] text-[#a68b4e]">
              NOVENA SUGERIDA
            </div>
            <div className="mt-1 font-medium">{L.suggestedNovenas[0].title}</div>
            <p className="mt-1 text-sm text-[#8a8a90]">{L.suggestedNovenas[0].reason}</p>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 h-10 rounded-xl bg-[#1c1c1e] text-xs font-medium text-white">
                Comenzar novena
              </button>
              <button className="flex-1 h-10 rounded-xl border border-[#c4a35a] text-[#a68b4e] text-xs font-medium">
                Compartir
              </button>
            </div>
          </div>
        </div>
      )}

      {L?.marian?.relevant && (
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

      <DailyMessage label="MENSAJE DE LA VIRGEN · BETANIA" message={L?.messages?.betania} />
      <DailyMessage label="MENSAJE DE LA VIRGEN · MEDJUGORJE" message={L?.messages?.medjugorje} />
      <DailyMessage label="MENSAJE DEL PAPA LEÓN XIV" message={L?.messages?.popeLeoXiv} />

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
            sub={L?.gospel?.ref ?? "Pendiente"}
            onClick={() => onOpenReader("gospel")}
          />
          <ActionCard
            icon="🎵"
            title="Salmo del día"
            sub={L?.psalm?.ref ?? "Pendiente"}
            onClick={() => onOpenReader("psalm")}
          />
          <ActionCard
            icon="☀️"
            title="Laudes del día"
            sub={laudesAudio ? `${laudesAudio.author} · audio disponible` : undefined}
            presenceCount={laudesPresence.count}
            onClick={() => onOpenReader("laudes")}
          />
          <ActionCard
            icon="🕊️"
            title="Ángelus del día"
            sub={angelusAudio ? `${angelusAudio.author} · audio disponible` : undefined}
            presenceCount={angelusPresence.count}
            onClick={() => onOpenReader("angelus")}
          />
        </div>

        <button
          onClick={() => onOpenReader("first")}
          className="mt-3 flex w-full items-center justify-between rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
        >
          <div>
            <div className="font-medium">Primera lectura</div>
            <div className="text-sm text-[#8a8a90]">{L?.firstReading?.ref ?? "Pendiente"}</div>
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

      {saintOpen && L?.saint && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/45 p-4 backdrop-blur-sm">
          <div className="no-scrollbar max-h-[82dvh] w-full overflow-y-auto rounded-3xl bg-[#faf9f6] p-6">
            {L.saint.imageUrl && (
              <img src={L.saint.imageUrl} alt={L.saint.name} className="mx-auto h-40 w-40 rounded-full object-cover" />
            )}
            <h2 className="mt-4 text-center font-serif-holy text-2xl font-semibold">{L.saint.name}</h2>
            <p className="text-center text-sm text-[#8a8a90]">{L.saint.title}</p>
            <p className="mt-5 font-serif-holy text-[17px] leading-relaxed">{L.saint.story}</p>
            <h3 className="mt-5 text-xs font-semibold tracking-[0.15em] text-[#9a9a9f]">SU EJEMPLO HOY</h3>
            <p className="mt-1 text-sm leading-relaxed">{L.saint.exampleToday}</p>
            <h3 className="mt-4 text-xs font-semibold tracking-[0.15em] text-[#9a9a9f]">REFLEJO DEL EVANGELIO</h3>
            <p className="mt-1 text-sm leading-relaxed">{L.saint.gospelConnection}</p>
            {L.saint.venezuelaRelevance && (
              <p className="mt-4 rounded-2xl bg-[#eef2e6] p-3 text-sm text-[#5c6b3f]">{L.saint.venezuelaRelevance}</p>
            )}
            <button onClick={() => setSaintOpen(false)} className="mt-5 h-12 w-full rounded-full bg-[#1c1c1e] text-white">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DailyMessage({
  label,
  message,
}: {
  label: string;
  message?: { relevant: boolean; text: string };
}) {
  if (!message?.relevant || !message.text) return null;
  return (
    <div className="mt-4 px-6">
      <div className="rounded-2xl border border-[#e4dcef] bg-[#f5f1fb] p-4">
        <div className="text-[10px] tracking-[0.18em] text-[#8a7ab0]">{label}</div>
        <p className="mt-1 font-serif-holy text-[15px] leading-relaxed text-[#4a4360]">“{message.text}”</p>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  sub,
  presenceCount,
  onClick,
}: {
  icon: string;
  title: string;
  sub?: string;
  presenceCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-[#e6e3db] bg-white p-4 text-left transition active:scale-[0.98]"
    >
      <div className="text-lg">{icon}</div>
      <div className="mt-2 font-medium">{title}</div>
      {sub && <div className="text-xs text-[#8a8a90]">{sub}</div>}
      {!!presenceCount && (
        <div className="mt-1 flex items-center gap-1 text-xs text-[#6e875e]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6e9f6f]" />
          {presenceCount} {presenceCount === 1 ? "persona rezando" : "personas rezando"}
        </div>
      )}
    </button>
  );
}
