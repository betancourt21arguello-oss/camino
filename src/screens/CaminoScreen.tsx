import { CalendarStrip } from "../components/CalendarStrip";
import { assetsByTag } from "../media/registry";
import type { WhatsAppAsset } from "../media/types";
import type { DailyLiturgy, LiturgicalEvent } from "../liturgy/types";
import { todayDayFromLiturgy } from "../liturgy/useDailyLiturgy";
import { useEffect, useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useDailyPrayerPresence } from "../prayer/useDailyPrayerPresence";
import { resolveCatholicImage, resolveDailyImage, resolveSaintImage } from "../media/imageResolver";
import { useInstallPrompt } from "../pwa/useInstallPrompt";
import { InstallBanner } from "../pwa/InstallBanner";
import { caracasNow } from "../utils/caracas";

export type ReaderTarget =
  | "gospel"
  | "psalm"
  | "laudes"
  | "angelus"
  | "vespers"
  | "compline"
  | "first"
  | "second"
  | "catechism"
  | "onthistoday";

export type { Props };

type Props = {
  onStartJornada: () => void;
  onOpenReader: (t: ReaderTarget) => void;
  onOpenAsset: (assetId: string) => void;
  assets: WhatsAppAsset[];
  liturgy: DailyLiturgy | null;
  monthEvents: LiturgicalEvent[];
  pastProgress: Record<number, { rosaries: number; done: boolean }>;
  loadingDaily?: boolean;
  generatingDaily?: boolean;
  onGenerateDaily: () => void;
  error?: string | null;
  onOpenAdmin: () => void;
};

export const CaminoScreen: React.FC<Props> = ({
  onStartJornada,
  onOpenReader,
  onOpenAsset,
  assets,
  liturgy: L,
  monthEvents,
  pastProgress,
  loadingDaily,
  onGenerateDaily,
  generatingDaily,
  error,
}: Props) => {
  const [showPopup, setShowPopup] = useState(false);
  const [saintOpen, setSaintOpen] = useState(false);
  const [cateOpen, setCateOpen] = useState(false);
  const [onThisOpen, setOnThisOpen] = useState(false);
  const [resolvedSaint, setResolvedSaint] = useState<string | null>(null);
  const [resolvedDaily, setResolvedDaily] = useState<string>("/images/daily.jpg");
  const laudesAudio = assetsByTag("laudes", assets)[0];
  const angelusAudio = assetsByTag("angelus", assets)[0];
  const todayDay = todayDayFromLiturgy(L);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (L?.saint?.name) {
        const r = await resolveSaintImage(L.saint.name, L.saint.imageUrl);
        if (active && r.url) setResolvedSaint(r.url);
      }
      // Prioridad 1: imagen personalizada desde image_url de daily_liturgy.
      // Solo si no hay image_url, se resuelve desde arte sacro católico o Wikimedia.
      if (L?.imageUrl && /^https?:\/\//i.test(L.imageUrl)) {
        if (active) setResolvedDaily(L.imageUrl);
      } else {
        const catholic = await resolveCatholicImage(
          L?.saint?.name || L?.gospel?.ref || L?.imagePrompt,
          L?.gospel?.ref,
        );
        const daily = catholic ?? (await resolveDailyImage(L?.imageUrl, L?.gospel?.ref, L?.quote?.text));
        if (active) setResolvedDaily(daily);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [L?.saint?.name, L?.saint?.imageUrl, L?.imageUrl, L?.gospel?.ref, L?.quote?.text]);
  const currentDate = L?.date ? new Date(`${L.date}T00:00:00`) : caracasNow();
  const monthName = currentDate.toLocaleDateString("es", { month: "long" });
  const year = currentDate.getFullYear();
  const laudesPresence = useDailyPrayerPresence("laudes");
  const angelusPresence = useDailyPrayerPresence("angelus");
  const install = useInstallPrompt();

  return (
    <div className="min-h-full bg-[#f7f6f3] pb-28 text-[#1c1c1e] landscape:pb-0">
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm mx-4">
            <h2 className="text-xl font-bold mb-4">Camino V.2.0.6</h2>
            <p className="mb-4">Un proyecto de ByP Solutions.</p>
            <a href="https://bypsolutionsbpo.com" className="text-blue-500 hover:underline block mb-4">https://bypsolutionsbpo.com</a>
            <button onClick={() => setShowPopup(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Cerrar</button>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8">
        <button
          onClick={() => setShowPopup(true)}
          className="text-sm font-semibold tracking-[0.35em]"
        >
          CAMINO
        </button>
        {!L?.quote?.text ? (
          <button
            onClick={onGenerateDaily}
            disabled={generatingDaily}
            className="flex h-9 items-center gap-2 rounded-full border border-[#d7d3c8] bg-white px-3 text-sm text-[#6b6b70] disabled:opacity-50"
          >
            <span className="h-2 w-2 rounded-full bg-[#a68b4e]" />
            {generatingDaily ? "Generando…" : "Generar con Gemini"}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[#6b6b70]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: L?.liturgicalColor ?? "#b8b4a8" }}
            />
            {L?.season ?? (loadingDaily ? "Cargando Gemini…" : "")}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">⚠️ Error de contenido</p>
          <p className="mt-1">{error}</p>
          {error.includes("image") || error.includes("model does not support") ? (
            <p className="mt-2 text-xs text-red-600">
              Nota: El modelo utilizado no soporta entrada de imágenes. El contenido litúrgico se genera solo con texto.
            </p>
          ) : null}
        </div>
      )}

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

      {/* Instalación de la app como PWA (Android / iPhone) */}
      <AnimatePresence>
        {install.canShow && <InstallBanner install={install} />}
      </AnimatePresence>

      {/* Calendar strip: past progress ← today → future liturgical events */}
      <CalendarStrip events={monthEvents} pastProgress={pastProgress} todayDay={todayDay} />

      {/* Verse card - imagen pública encontrada por Gemini + Wikimedia */}
      <div className="mt-6 px-6">
        <div className="overflow-hidden rounded-3xl bg-[#141c2e] shadow-sm">
          <div
            className="h-40 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(20,28,46,0.15), rgba(20,28,46,0.55)), url(${resolvedDaily})`,
            }}
          />
          <div className="p-6">
            <p className="font-serif-holy text-2xl leading-snug text-white">
              “{L?.quote?.text ?? ""}”
            </p>
            <p className="mt-3 text-sm text-white/50">{L?.quote?.ref ?? "camino-api.byp.workers.dev"}</p>
          </div>
        </div>
      </div>

      {/* Saint of the day - imagen pública gratuita resuelta */}
      <div className="mt-4 px-6">
        <button
          onClick={() => L?.saint && setSaintOpen(true)}
          className="flex w-full items-center gap-4 rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
        >
          {resolvedSaint ? (
            <img src={resolvedSaint} alt={L?.saint?.name} className="h-12 w-12 rounded-full object-cover" />
          ) : L?.saint?.imageUrl && /^https?:\/\//i.test(L.saint.imageUrl) ? (
            <img src={L.saint.imageUrl} alt={L.saint.name} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9ede0] font-serif-holy text-lg text-[#5c6b3f]">
              {L?.saint?.name?.charAt(0) ?? "?"}
            </div>
          )}
          <div>
            <div className="text-[10px] tracking-[0.2em] text-[#9a9a9f]">
              SANTO DEL DÍA
            </div>
            <div className="font-medium">{L?.saint?.name ?? "Santo del día"}</div>
            <div className="text-sm text-[#8a8a90]">{L?.saint?.title ?? ""}</div>
          </div>
          <span className="ml-auto text-[#b0b0b5]">›</span>
        </button>

      </div>

      {/* CTA */}
      <div className="mt-5 px-6">
        <button
          onClick={onStartJornada}
          className="h-14 w-full rounded-2xl bg-[#1c1c1e] font-medium text-white transition active:scale-[0.99]"
        >
          Comenzar mi jornada
        </button>
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

      {(() => {
        const relevantMessages: Array<{ source: string; text: string; label?: string }> = [];

        if (L?.marian?.relevant && L.marian.text) {
          relevantMessages.push({ source: L.marian.source, text: L.marian.text, label: `MENSAJE DE LA VIRGEN · ${L.marian.source.toUpperCase()}` });
        }

        L?.messages?.forEach((m) => {
          if (m.relevant && m.text) {
            relevantMessages.push({ source: m.source, text: m.text, label: m.source.toUpperCase() });
          }
        });

        if (relevantMessages.length === 0) return null;

        if (relevantMessages.length === 1) {
          const msg = relevantMessages[0];
          return (
            <div className="mt-4 px-6">
              <div className="rounded-2xl border border-[#e4dcef] bg-[#f5f1fb] p-4">
                <div className="text-[10px] tracking-[0.18em] text-[#8a7ab0]">{msg.label}</div>
                <p className="mt-1 font-serif-holy text-[15px] leading-relaxed text-[#4a4360]">“{msg.text}”</p>
              </div>
            </div>
          );
        }

        return <RelevantMessagesCarousel messages={relevantMessages} />;
      })()}

      {/* Catecismo del día */}
      {L?.catechism && (
        <div className="mt-5 px-6">
          <button
            onClick={() => setCateOpen((v) => !v)}
            className="flex w-full items-center gap-4 rounded-2xl border border-[#d0e0e3] bg-[#eef5f6] p-5 text-left transition hover:bg-[#e6f0f1]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3f6e7a] font-serif-holy text-base text-white">
              CEC
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] tracking-[0.25em] text-[#3f6e7a] uppercase">Catecismo · {L.catechism.number}</div>
              <div className="mt-1 font-serif-holy text-base font-semibold text-[#1c1c1e] leading-snug">{L.catechism.title}</div>
            </div>
            <span className={`text-[#3f6e7a] transition-transform duration-300 ${cateOpen ? "rotate-90" : ""}`}>›</span>
          </button>
          {cateOpen && (
            <div className="mt-3 rounded-2xl border border-[#d0e0e3] bg-white p-5">
              <p className="whitespace-pre-line font-serif-holy text-[16px] leading-[1.8] text-[#1c1c1e]">{L.catechism.text}</p>
              {L.catechism.applyToday && (
                <div className="mt-4 rounded-xl border-l-2 border-[#3f6e7a] bg-[#f0f7f8] p-4">
                  <div className="text-[10px] font-semibold tracking-[0.2em] text-[#3f6e7a] uppercase">Aplicación hoy</div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#3f6e7a]">{L.catechism.applyToday}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Un día como hoy */}
      {L?.onThisDay && (
        <div className="mt-4 px-6">
          <button
            onClick={() => setOnThisOpen((v) => !v)}
            className="flex w-full items-center gap-4 rounded-2xl border border-[#e0cfe6] bg-[#f4eef8] p-4 text-left transition hover:bg-[#eee6f3]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#7a4a8a] text-lg text-white">✦</span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] tracking-[0.2em] text-[#7a4a8a]">UN DÍA COMO HOY · {L.onThisDay.category}</div>
              <div className="font-medium text-[#1c1c1e]">{L.onThisDay.title}</div>
            </div>
            <span className={`text-[#7a4a8a] transition-transform ${onThisOpen ? "rotate-90" : ""}`}>›</span>
          </button>
          {onThisOpen && (
            <div className="mt-2 rounded-2xl border border-[#e0cfe6] bg-white p-4">
              <p className="whitespace-pre-line font-serif-holy text-[15px] leading-relaxed text-[#2c2436]">{L.onThisDay.text}</p>
              {L.onThisDay.venezuela && (
                <p className="mt-3 border-l-2 border-[#7a4a8a] pl-3 text-[13px] italic text-[#7a4a8a]">{L.onThisDay.venezuela}</p>
              )}
            </div>
          )}
        </div>
      )}

       {/* Quick actions: read Gospel/Psalm, pray Laudes/Ángelus */}
      <div className="mt-8 px-6">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-[#9a9a9f]">
          LITURGIA DE HOY
        </div>
        <p className="mt-1 text-sm text-[#8a8a90]">
          Entra cuando tu corazón esté listo.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 landscape:grid-cols-4">
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
          <button
            onClick={() => onOpenReader("laudes")}
            className="col-span-1 relative overflow-hidden rounded-2xl border border-[#f0e4c8] bg-gradient-to-br from-[#fdf8f0] via-[#faf0e0] to-[#f5e6c8] p-5 text-left shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-[#f5d78a]/20 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f5d78a] to-[#e8b84a] text-2xl shadow-md">
                ☀️
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] tracking-[0.25em] text-[#c49a3c] font-semibold uppercase">
                  Oración de la mañana
                </div>
                <div className="mt-1 font-serif-holy text-lg font-semibold text-[#2a2010]">Laudes</div>
                {laudesAudio && (
                  <div className="mt-1 text-xs text-[#8a7a5a]">
                    {`${laudesAudio.author} · audio`}
                  </div>
                )}
              </div>
              {!!laudesPresence.count && (
                <div className="flex items-center gap-1.5 rounded-full bg-[#f0e8d0] px-2.5 py-1 text-[10px] font-medium text-[#6e875e]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6e9f6f]" />
                  {laudesPresence.count}
                </div>
              )}
            </div>
          </button>
          <ActionCard
            icon="🕊️"
            title="Ángelus del día"
            sub={angelusAudio ? `${angelusAudio.author} · audio disponible` : undefined}
            presenceCount={angelusPresence.count}
            onClick={() => onOpenReader("angelus")}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <ActionCard icon="🌇" title="Vísperas" sub="Oración de la tarde" onClick={() => onOpenReader("vespers")} />
          <ActionCard icon="🌙" title="Completas" sub="Oración de la noche" onClick={() => onOpenReader("compline")} />
        </div>

          <div className="mt-3 flex w-full">
            {L?.firstReading && (
              <button
                onClick={() => onOpenReader("first")}
                className="flex-1 rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
              >
                <div className="font-medium">Primera lectura</div>
                <div className="text-sm text-[#8a8a90]">{L.firstReading.ref}</div>
              </button>
            )}

            {L?.secondReading && (
              <button
                onClick={() => onOpenReader("second")}
                className="ml-3 flex-1 rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
              >
                <div className="font-medium">Segunda lectura</div>
                <div className="text-sm text-[#8a8a90]">{L.secondReading.ref}</div>
              </button>
            )}
          </div>

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
            {(resolvedSaint || (L.saint.imageUrl && /^https?:\/\//i.test(L.saint.imageUrl))) && (
              <img
                src={resolvedSaint || L.saint.imageUrl}
                alt={L.saint.name}
                className="mx-auto h-40 w-40 rounded-full object-cover"
              />
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
            {L.saint.highlights && L.saint.highlights.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold tracking-[0.15em] text-[#9a9a9f]">HITOS DE SU VIDA</h3>
                <ul className="mt-2 space-y-1.5">
                  {L.saint.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#2a2a2e]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4a35a]" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {L.saint.lessons && L.saint.lessons.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold tracking-[0.15em] text-[#9a9a9f]">LECCIONES PARA HOY</h3>
                <ul className="mt-2 space-y-1.5">
                  {L.saint.lessons.map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#2a2a2e]">
                      <span className="mt-0.5 text-[#5c6b3f]">✦</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {L.saint.prayer && (
              <div className="mt-5 rounded-2xl border-l-2 border-[#c4a35a] bg-[#faf6ec] p-4">
                <h3 className="text-xs font-semibold tracking-[0.15em] text-[#a07a3c]">ORACIÓN DEL SANTO</h3>
                <p className="mt-2 whitespace-pre-line font-serif-holy text-[15px] italic leading-relaxed text-[#5a4a2a]">{L.saint.prayer}</p>
              </div>
            )}
            <button onClick={() => setSaintOpen(false)} className="mt-5 h-12 w-full rounded-full bg-[#1c1c1e] text-white">Cerrar</button>
          </div>
        </div>
      )}

    </div>
  );
}

function RelevantMessagesCarousel({
  messages,
}: {
  messages: Array<{ source: string; text: string; label?: string }>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchState = useRef({ startX: 0, startY: 0 });

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (messages.length > 1) {
      timerRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % messages.length);
      }, 8000);
    }
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [messages.length]);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(i, messages.length - 1));
    setActiveIndex(next);
    resetTimer();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchState.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchState.current.startX;
    const diffY = e.changedTouches[0].clientY - touchState.current.startY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      if (diffX > 0) goTo(activeIndex - 1);
      else goTo(activeIndex + 1);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    touchState.current = { startX: e.clientX, startY: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const diffX = e.clientX - touchState.current.startX;
    const diffY = e.clientY - touchState.current.startY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      if (diffX > 0) goTo(activeIndex - 1);
      else goTo(activeIndex + 1);
    }
  };

  return (
    <div className="mt-4 px-6">
      <div
        className="overflow-hidden rounded-2xl border border-[#e4dcef] bg-[#f5f1fb] select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 transition-opacity duration-500 ease-in-out ${
              i === activeIndex ? 'block' : 'hidden'
            }`}
            style={{ opacity: i === activeIndex ? 1 : 0 }}
          >
            <div className="text-[10px] tracking-[0.18em] text-[#8a7ab0]">
              {msg.label || msg.source.toUpperCase()}
            </div>
            <p className="mt-1 font-serif-holy text-[15px] leading-relaxed text-[#4a4360]">
              “{msg.text}”
            </p>
          </div>
        ))}
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
