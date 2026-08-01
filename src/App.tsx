import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWhatsAppAssets } from "./media/useWhatsAppAssets";
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
import { AdminPortal } from "./screens/AdminPortal";
import { AuthCallbackScreen } from "./screens/AuthCallbackScreen";
import { JORNADA_CATEGORIES, categoriesForTarget, markCategoriesDone } from "./rule/markTasks";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { OneSignalProvider } from "./onesignal/OneSignalProvider";

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
  const [authInitialMode, setAuthInitialMode] = useState<"login" | "signup" | "magiclink" | "reset" | "setpassword" | undefined>(undefined);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [prayerActive, setPrayerActive] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [initialDevotionId, setInitialDevotionId] = useState<string | undefined>(undefined);
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
    if (target === "gospel") {
      emit({ type: "gospel-read" });
    }
    void markCategoriesDone(user?.id, categoriesForTarget(target as Parameters<typeof categoriesForTarget>[0]));
    setReader(null);
  };

  const settlePortal = (kind: PrayerKind) => {
    emit({ type: "task-complete" });
    emit({ type: kind });
    void markCategoriesDone(user?.id, categoriesForTarget(kind));
    setPrayerPortal(null);
  };

  const settleJornada = () => {
    emit({ type: "task-complete" });
    emit({ type: "jornada-complete" });
    void markCategoriesDone(user?.id, JORNADA_CATEGORIES);
    setJornadaOpen(false);
    setTab("camino");
  };

  // Detectar ?set_password=true (viene del recovery flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("set_password") === "true" && user) {
      setAuthInitialMode("setpassword");
      setAuthOpen(true);
      // Limpiar URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/admin") {
      setAdminOpen(true);
    }
  }, []);

  // Deep linking: ?devotion=divina-misericordia abre la Coronilla directamente
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const devotion = params.get("devotion");
    if (devotion === "divina-misericordia") {
      setInitialDevotionId("divina-misericordia");
      setTab("rosario");
      params.delete("devotion");
      const newSearch = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (newSearch ? `?${newSearch}` : "")
      );
    }
  }, []);

  // Escuchar clics en notificaciones de OneSignal (deep linking en caliente)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleNotificationClick = () => {
      const params = new URLSearchParams(window.location.search);
      const devotion = params.get("devotion");
      if (devotion === "divina-misericordia") {
        setInitialDevotionId("divina-misericordia");
        setTab("rosario");
        params.delete("devotion");
        const newSearch = params.toString();
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (newSearch ? `?${newSearch}` : "")
        );
      }
    };
    window.addEventListener("onesignal-notification-click", handleNotificationClick);
    return () => window.removeEventListener("onesignal-notification-click", handleNotificationClick);
  }, []);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-0 sm:p-6 landscape:min-h-0 landscape:items-stretch"
      style={{ background: "radial-gradient(140% 120% at 50% 0%, #e8e4dc, #d8d4cb)" }}
    >
      <div className="relative w-full max-w-[430px] sm:rounded-[3rem] sm:border-[10px] sm:border-black sm:shadow-2xl landscape:sm:max-w-[900px]">
        <div className="relative h-[100dvh] overflow-hidden bg-black sm:h-[900px] sm:rounded-[2.4rem] landscape:h-[100dvh] landscape:overflow-auto">
          <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-black sm:block" />

          <div className={prayerActive ? "h-full overflow-hidden" : "no-scrollbar h-full overflow-y-auto landscape:overflow-auto landscape:pl-20"}>
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
                error={daily.error}
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
                initialDevotionId={initialDevotionId}
              />
            )}
            {tab === "comunidad" && <ComunidadScreen />}
            {tab === "perfil" && <PerfilScreen onOpenAuth={() => setAuthOpen(true)} onOpenSetPassword={() => { setAuthInitialMode("setpassword"); setAuthOpen(true); }} />}
          </div>

          {!overlay && !prayerActive && (
            <>
              {!user && !bannerDismissed && !authOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                   className="absolute bottom-20 left-3 right-3 z-30 cursor-pointer landscape:bottom-4 landscape:left-4 landscape:right-auto landscape:top-4"
                  onClick={() => setAuthOpen(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setAuthOpen(true); }}
                  aria-label="Iniciar sesión para guardar tu progreso"
                >
                  <div className="flex items-center gap-3 rounded-2xl border border-[#e8e4db] bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7a8a5c]/10">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#7a8a5c]" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[13px] font-medium text-[#1c1c1e] leading-tight">
                        Guarda tu Camino
                      </p>
                      <p className="text-[11px] text-[#9a9a9f] leading-tight">
                        Inicia sesión o crea una cuenta
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setBannerDismissed(true); }}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#b0b0b5] hover:bg-[#f0ede8] hover:text-[#77736b]"
                      aria-label="Descartar"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 4l8 8M12 4L4 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
              <BottomNav active={tab} onChange={setTab} dark={dark} />
            </>
          )}

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
          {authOpen && <AuthPortal onClose={() => { setAuthOpen(false); setAuthInitialMode(undefined); }} initialMode={authInitialMode} />}
          {galleryOpen && <GalleryScreen onClose={() => setGalleryOpen(false)} />}
          {adminOpen && <AdminPortal onClose={() => setAdminOpen(false)} />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isAuthCallback = typeof window !== "undefined" && window.location.pathname === "/auth/callback";

  if (isAuthCallback) {
    return (
      <AuthProvider>
        <AuthCallbackScreen />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <OneSignalProvider>
        <SpiritualProvider>
          <Shell />
        </SpiritualProvider>
      </OneSignalProvider>
    </AuthProvider>
  );
}

if (typeof window !== "undefined") {
}