import { useState } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { CaminoScreen, type ReaderTarget } from "./screens/CaminoScreen";
import { RosarioScreen } from "./screens/RosarioScreen";
import { ComunidadScreen } from "./screens/ComunidadScreen";
import { PerfilScreen } from "./screens/PerfilScreen";
import { ReglaScreen } from "./screens/ReglaScreen";
import { JornadaScreen } from "./screens/JornadaScreen";
import { ReaderScreen } from "./screens/ReaderScreen";
import { SpiritualProvider, useSpiritual } from "./fruits/store";
import { useTodayLiturgy } from "./liturgy/today";
import { DailyPrayerPortal } from "./screens/DailyPrayerPortal";
import { AudioAssetScreen } from "./screens/AudioAssetScreen";
import { AuthPortal } from "./screens/AuthPortal";
import { GalleryScreen } from "./screens/GalleryScreen";
import { AuthProvider } from "./auth/AuthProvider";
import { useWhatsAppAssets } from "./media/useWhatsAppAssets";

function Shell() {
  const [tab, setTab] = useState<Tab>("camino");
  const [jornadaOpen, setJornadaOpen] = useState(false);
  const [reader, setReader] = useState<ReaderTarget | null>(null);
  const [prayerPortal, setPrayerPortal] = useState<"laudes" | "angelus" | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [prayerActive, setPrayerActive] = useState(false);
  const { emit } = useSpiritual();
  const assets = useWhatsAppAssets();
  const { liturgy } = useTodayLiturgy();

  const overlay = Boolean(
    jornadaOpen || reader || prayerPortal || assetId || authOpen || galleryOpen,
  );
  const dark = tab === "rosario" && !overlay;

  function readerContent(target: ReaderTarget) {
    const L = liturgy;
    if (!L) return null;
    switch (target) {
      case "gospel":
        return { eyebrow: "EVANGELIO", ...L.gospel, complete: "Marcar como leído" };
      case "psalm":
        return { eyebrow: "SALMO", ...L.psalm, complete: "Marcar como rezado" };
      case "first":
        return { eyebrow: "PRIMERA LECTURA", ...L.firstReading, complete: "Marcar como leído" };
      case "laudes":
        return { eyebrow: "LAUDES", title: L.laudes.title, ref: "Liturgia de las Horas · en comunidad", body: L.laudes.body, complete: "He rezado los Laudes" };
      case "angelus":
        return {
          eyebrow: "ÁNGELUS",
          title: "Ángelus",
          ref: "Oración del mediodía · en comunidad",
          body: "El Ángel del Señor anunció a María. Y concibió por obra del Espíritu Santo. Dios te salve, María…\n\nHe aquí la esclava del Señor. Hágase en mí según tu palabra. Dios te salve, María…\n\nY el Verbo se hizo carne. Y habitó entre nosotros. Dios te salve, María…\n\nRuega por nosotros, Santa Madre de Dios, para que seamos dignos de alcanzar las promesas de Cristo. Amén.",
          complete: "He rezado el Ángelus",
        };
    }
  }

  const rc = reader ? readerContent(reader) : null;
  const selectedAsset = assets.find((asset) => asset.id === assetId);

  const openReader = (target: ReaderTarget) => {
    if (target === "laudes" || target === "angelus") {
      setPrayerPortal(target);
      return;
    }
    setReader(target);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-0 sm:p-6"
      style={{
        background: "radial-gradient(140% 120% at 50% 0%, #e8e4dc, #d8d4cb)",
      }}
    >
      <div className="relative w-full max-w-[430px] sm:rounded-[3rem] sm:border-[10px] sm:border-black sm:shadow-2xl">
        <div className="relative h-[100dvh] overflow-hidden bg-black sm:h-[900px] sm:rounded-[2.4rem]">
          <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-black sm:block" />

          <div
            className={
              prayerActive
                ? "h-full overflow-hidden"
                : "no-scrollbar h-full overflow-y-auto"
            }
          >
            {tab === "camino" && (
              <CaminoScreen
                onStartJornada={() => setJornadaOpen(true)}
                onOpenReader={openReader}
                onOpenAsset={setAssetId}
                assets={assets}
              />
            )}
            {tab === "regla" && (
              <ReglaScreen
                onOpenReader={openReader}
                onStartRosary={() => setTab("rosario")}
              />
            )}
            {tab === "rosario" && (
              <RosarioScreen
                onOpenGallery={() => setGalleryOpen(true)}
                onActiveChange={setPrayerActive}
              />
            )}
            {tab === "comunidad" && <ComunidadScreen />}
            {tab === "perfil" && (
              <PerfilScreen onOpenAuth={() => setAuthOpen(true)} />
            )}
          </div>

          {!overlay && !prayerActive && (
            <BottomNav active={tab} onChange={setTab} dark={dark} />
          )}

          {jornadaOpen && (
            <JornadaScreen
              onClose={() => setJornadaOpen(false)}
              onComplete={() => {
                setJornadaOpen(false);
                setTab("camino");
              }}
            />
          )}

          {reader && rc && (
            <ReaderScreen
              eyebrow={rc.eyebrow}
              title={rc.title}
              ref={rc.ref}
              body={rc.body}
              completeLabel={rc.complete}
              onClose={() => setReader(null)}
              onComplete={() => {
                emit({ type: "task-complete" });
                setReader(null);
              }}
            />
          )}

          {prayerPortal && (
            <DailyPrayerPortal
              kind={prayerPortal}
              assets={assets}
              onClose={() => setPrayerPortal(null)}
              onComplete={() => {
                emit({ type: "task-complete" });
                setPrayerPortal(null);
              }}
            />
          )}

          {selectedAsset && (
            <AudioAssetScreen
              asset={selectedAsset}
              onClose={() => setAssetId(null)}
            />
          )}

          {authOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}

          {galleryOpen && (
            <GalleryScreen onClose={() => setGalleryOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SpiritualProvider>
        <Shell />
      </SpiritualProvider>
    </AuthProvider>
  );
}
