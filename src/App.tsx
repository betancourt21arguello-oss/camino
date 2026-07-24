import { useState, useEffect } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { CaminoScreen, type ReaderTarget } from "./screens/CaminoScreen";
import { RosarioScreen } from "./screens/RosarioScreen";
import { ComunidadScreen } from "./screens/ComunidadScreen";
import { PerfilScreen } from "./screens/PerfilScreen";
import { ReglaScreen } from "./screens/ReglaScreen";
import { JornadaScreen } from "./screens/JornadaScreen";
import { ReaderScreen } from "./screens/ReaderScreen";
import { SpiritualProvider, useSpiritual } from "./fruits/store";
import type { DailyLiturgy } from "./liturgy/types";
import { useDailyLiturgy } from "./liturgy/useDailyLiturgy";
import { DailyPrayerPortal } from "./screens/DailyPrayerPortal";
import { AudioAssetScreen } from "./screens/AudioAssetScreen";
import { AuthPortal } from "./screens/AuthPortal";
import { GalleryScreen } from "./screens/GalleryScreen";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { useWhatsAppAssets } from "./media/useWhatsAppAssets";
import { AdminPortal } from "./screens/AdminPortal";
import { JORNADA_CATEGORIES, categoriesForTarget, markCategoriesDone } from "./rule/markTasks";

type PrayerKind = "laudes" | "angelus" | "vespers" | "compline";
const PRAYER_KINDS = new Set<ReaderTarget>(["laudes", "angelus", "vespers", "compline"]);

interface ReaderPayload {
  eyebrow: string;
  title: string;
  ref?: string;
  body: string;
  complete: string;
  gospel?: {
    evangelist?: string;
    threeCrosses?: boolean;
    responseLabel?: string;
    response?: string;
  };
}

function readerContent(target: ReaderTarget, L: DailyLiturgy | null): ReaderPayload {
  if (!L) {
    return {
      eyebrow: "",
      title: "",
      body: "",
      complete: "Cerrar",
    };
  }
  switch (target) {
    case "gospel":
      return {
        eyebrow: "EVANGELIO",
        title: L.gospel.title,
        ref: L.gospel.ref,
        body: L.gospel.body,
        complete: "He proclamado el Evangelio",
        gospel: {
          evangelist: L.gospel.evangelist,
          threeCrosses: L.gospel.threeCrosses ?? true,
          responseLabel: L.gospel.closingProclaim,
          response: L.gospel.closingResponse,
        },
      };
    case "psalm":
      return { eyebrow: "SALMO", title: L.psalm.title, ref: L.psalm.ref, body: L.psalm.body, complete: "He rezado el Salmo" };
    case "first":
      return { eyebrow: "PRIMERA LECTURA", title: L.firstReading.title, ref: L.firstReading.ref, body: L.firstReading.body, complete: "He leído la Primera lectura" };
    case "second":
      return L.secondReading
        ? { eyebrow: "SEGUNDA LECTURA", title: L.secondReading.title, ref: L.secondReading.ref, body: L.secondReading.body, complete: "He leído la Segunda lectura" }
        : { eyebrow: "SEGUNDA LECTURA", title: "No corresponde hoy", ref: L.date, body: "La liturgia de hoy no incluye segunda lectura.", complete: "Cerrar" };
    default:
      return { eyebrow: "", title: "", body: "", complete: "Cerrar" };
  }
}

function Shell() {
  const [tab, setTab] = useState<Tab>("camino");
  const [jornadaOpen, setJornadaOpen] = useState(false);
  const [reader, setReader] = useState<ReaderTarget | null>(null);
  const [prayerPortal, setPrayerPortal] = useState<PrayerKind | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [prayerActive, setPrayerActive] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { emit } = useSpiritual();
  const { user } = useAuth();
  const assets = useWhatsAppAssets();
  const daily = useDailyLiturgy();

  const overlay = Boolean(jornadaOpen || reader || prayerPortal || assetId || authOpen || galleryOpen || adminOpen);
  const dark = tab === "rosario" && !overlay;

  const rc = reader ? readerContent(reader, daily.liturgy) : null;
  const selectedAsset = assets.find((asset) => asset.id === assetId);

  const openReader = (target: ReaderTarget) => {
    if (PRAYER_KINDS.has(target)) {
      setPrayerPortal(target as PrayerKind);
      return;
    }
    setReader(target);
  };

  const settleReader = (target: ReaderTarget) => {
    emit({ type: "task-complete" });
    void markCategoriesDone(user?.id, categoriesForTarget(target as Parameters<typeof categoriesForTarget>[0]));
    setReader(null);
  };

  const settlePortal = (kind: PrayerKind) => {
    emit({ type: "task-complete" });
    void markCategoriesDone(user?.id, categoriesForTarget(kind));
    setPrayerPortal(null);
  };

  const settleJornada = () => {
    emit({ type: "task-complete" });
    void markCategoriesDone(user?.id, JORNADA_CATEGORIES);
    setJornadaOpen(false);
    setTab("camino");
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/admin") {
      setAdminOpen(true);
    }
  }, []);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-0 sm:p-6"
      style={{ background: "radial-gradient(140% 120% at 50% 0%, #e8e4dc, #d8d4cb)" }}
    >
      <div className="relative w-full max-w-[430px] sm:rounded-[3rem] sm:border-[10px] sm:border-black sm:shadow-2xl">
        <div className="relative h-[100dvh] overflow-hidden bg-black sm:h-[900px] sm:rounded-[2.4rem]">
          <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-black sm:block" />

          <div className={prayerActive ? "h-full overflow-hidden" : "no-scrollbar h-full overflow-y-auto"}>
            {tab === "camino" && (
              <CaminoScreen
                onStartJornada={() => setJornadaOpen(true)}
                onOpenReader={openReader}
                onOpenAsset={setAssetId}
                assets={assets}
                liturgy={daily.liturgy}
                monthEvents={daily.monthEvents}
                pastProgress={daily.pastProgress}
                loadingDaily={daily.loading}
                onGenerateDaily={daily.generateNow}
                generatingDaily={daily.generating}
                onOpenAdmin={() => setAdminOpen(true)}
              />
            )}
            {tab === "regla" && (
              <ReglaScreen onOpenReader={openReader} onStartRosary={() => setTab("rosario")} liturgy={daily.liturgy} />
            )}
            {tab === "rosario" && (
              <RosarioScreen
                onOpenGallery={() => setGalleryOpen(true)}
                onActiveChange={setPrayerActive}
                onOpenHour={(kind) => setPrayerPortal(kind)}
              />
            )}
            {tab === "comunidad" && <ComunidadScreen />}
            {tab === "perfil" && <PerfilScreen onOpenAuth={() => setAuthOpen(true)} />}
          </div>

          {!overlay && !prayerActive && <BottomNav active={tab} onChange={setTab} dark={dark} />}

          {jornadaOpen && <JornadaScreen liturgy={daily.liturgy} onClose={() => setJornadaOpen(false)} onComplete={settleJornada} />}

          {reader && rc && (
            <ReaderScreen
              eyebrow={rc.eyebrow}
              title={rc.title}
              ref={rc.ref}
              body={rc.body}
              gospel={rc.gospel}
              completeLabel={rc.complete}
              onClose={() => setReader(null)}
              onComplete={() => settleReader(reader)}
            />
          )}

          {prayerPortal && (
            <DailyPrayerPortal
              kind={prayerPortal}
              liturgy={daily.liturgy}
              assets={assets}
              onClose={() => setPrayerPortal(null)}
              onComplete={() => settlePortal(prayerPortal)}
            />
          )}

          {selectedAsset && <AudioAssetScreen asset={selectedAsset} onClose={() => setAssetId(null)} />}
          {authOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
          {galleryOpen && <GalleryScreen onClose={() => setGalleryOpen(false)} />}
          {adminOpen && <AdminPortal onClose={() => setAdminOpen(false)} />}
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
