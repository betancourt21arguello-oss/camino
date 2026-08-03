import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { ONESIGNAL_APP_ID } from "../config";

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

interface OneSignalContextType {
  initialized: boolean;
  subscribed: boolean;
  busy: boolean;
  error: string | null;
  iossupported: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const OneSignalContext = createContext<OneSignalContextType>({
  initialized: false,
  subscribed: false,
  busy: false,
  error: null,
  iossupported: false,
  subscribe: async () => {},
  unsubscribe: async () => {},
});

export function useOneSignal() {
  return useContext(OneSignalContext);
}

function detectIOSSupport(): boolean {
  if (typeof window === "undefined") return false;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!isIOS) return true; // not iOS = supported
  // iOS requires PWA standalone mode for push
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isStandalone;
}

/** Evaluate whether the OneSignal SDK has actually completed the full
 *  user registration flow (i.e. an external user id / push subscription
 *  has been set). OneSignal.init() may finish loading the SDK without
 *  actually registering the user on the OneSignal backend. */
async function isOneSignalUserRegistered(os: any): Promise<boolean> {
  try {
    // If optIn is true, the user has a push subscription -> registered
    if (os?.User?.PushSubscription?.optedIn) return true;
    // If we haven't even reached the SDK init, not registered
    if (!os?.User) return false;
    const pushSub = os?.User?.PushSubscription;
    if (pushSub && typeof pushSub.getSubscription === "function") {
      const sub = await pushSub.getSubscription();
      if (sub) return true;
    }
    // Fallback: check the "id" field, which OneSignal sets after backend registration
    const externalId = os?.User?.getExternalId ? await os.User.getExternalId() : null;
    const email = os?.User?.getEmail ? await os.User.getEmail() : null;
    if (externalId || email) return true;
    return false;
  } catch {
    return false;
  }
}

export function OneSignalProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iossupported = detectIOSSupport();

  useEffect(() => {
    if (!ONESIGNAL_APP_ID) {
      setError("OneSignal no configurado (falta VITE_ONESIGNAL_APP_ID)");
      return;
    }

    // Load OneSignal SDK
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => initOneSignal();
    document.head.appendChild(script);

    // Also set up the deferred array (OneSignal pattern)
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    return () => {
      // Cleanup
      const existing = document.querySelector('script[src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"]');
      if (existing) existing.remove();
    };
  }, []);

  async function initOneSignal() {
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "/OneSignalSDKWorker.js",
            notifyButton: {
              enable: false,
            },
            allowLocalhostAsSecureOrigin: true,
          });

          setInitialized(true);

          const isSubscribed = OneSignal.User.PushSubscription.optedIn;
          setSubscribed(isSubscribed);

          OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
            setSubscribed(event.current.optedIn);
          });

          // Manejar clics en notificaciones de OneSignal (deep linking)
          OneSignal.Notifications.addEventListener("click", (event: any) => {
            try {
              const data = event?.data || event?.notification?.data || {};
              if (data.devotion === "divina-misericordia") {
                const url = new URL(window.location.href);
                url.searchParams.set("devotion", "divina-misericordia");
                window.history.replaceState({}, "", url.toString());
                window.dispatchEvent(new Event("onesignal-notification-click"));
              } else if (data.url) {
                window.location.href = data.url;
              }
            } catch (clickErr) {
              console.warn("[camino] OneSignal click handler error:", clickErr);
            }
          });

          await setUserAliases(OneSignal);
        } catch (innerError) {
          const msg = innerError instanceof Error ? innerError.message : String(innerError);
          if (msg.includes("Can only be used on") || msg.includes("domain")) {
            console.warn("[camino] OneSignal domain restriction:", msg);
          } else {
            setError(msg);
          }
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al inicializar OneSignal");
    }
  }

  /** Attach supabase user identity to the OneSignal user (external user id / email).
   *  Must be called after init AND after a session becomes available. */
  async function setUserAliases(OneSignal: any) {
    try {
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
      if (session?.user) {
        await OneSignal.User.addAlias("supabase_id", session.user.id);
        if (session.user.email) {
          await OneSignal.User.addEmail(session.user.email);
        }
      }
    } catch (e) {
      console.warn("[camino] OneSignal: no se pudieron fijar aliases del usuario:", e);
    }
  }

  /** Ensure the OneSignal SDK is fully initialized. If the SDK was loaded but
   *  init didn't complete (e.g. on iPhone Safari it may have been skipped or
   *  deferred), re-run the init flow so the user actually gets registered
   *  with OneSignal. */
  async function ensureInitialized(): Promise<any> {
    // SDK already loaded and initialized
    if (window.OneSignal && initialized) {
      return window.OneSignal;
    }

    // Force reload the SDK if the script tag isn't present (e.g. after StrictMode remount)
    if (!window.OneSignal && !document.querySelector('script[src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"]')) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("No se pudo cargar el SDK de OneSignal."));
        document.head.appendChild(script);
      });
    }

    // If window.OneSignal isn't available yet, wait a moment for the SDK to load
    if (!window.OneSignal) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (window.OneSignal) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        setTimeout(check, 100);
      });
    }

    const OneSignal = window.OneSignal;
    if (!OneSignal) {
      throw new Error("OneSignal no está disponible.");
    }

    // If the SDK never finished init (e.g. on iPhone Safari it may have been
    // skipped or deferred), re-run init so the user actually gets registered.
    if (!initialized) {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerParam: { scope: "/" },
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          notifyButton: {
            enable: false,
          },
          allowLocalhostAsSecureOrigin: true,
        });
        setInitialized(true);
        setError(null);
        await setUserAliases(OneSignal);
      } catch (e) {
        // If init fails (e.g. already initialized), proceed anyway — the
        // registration attempt (requestPermission) is what really matters
        // to re-trigger OneSignal user registration.
        console.warn("[camino] OneSignal init warning:", e);
      }
    }

    return OneSignal;
  }

  const subscribe = async () => {
    // Re-evaluate iOS support at click time: the user may have just
    // installed the app to their home screen, which changes standalone mode.
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !detectIOSSupport()) {
      setError("En iPhone, primero instala Camino como app (Añadir a pantalla de inicio desde Safari). Después podrás activar notificaciones push.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const OneSignal = await ensureInitialized();

      // ── Re-trigger full registration if the user isn't registered yet ──
      // On iPhone Safari the SDK may load but never complete the registration
      // with OneSignal's backend. If there's no subscription and no external id,
      // re-run the registration flow (requestPermission) rather than just optIn().
      const isRegistered = await isOneSignalUserRegistered(OneSignal);
      if (!isRegistered) {
        await OneSignal.Notifications.requestPermission(true);
      }

      // Ensure opt-in state
      await OneSignal.User.PushSubscription.optIn();
      setSubscribed(true);

      // Set external user ID after subscription
      await setUserAliases(OneSignal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar notificaciones.");
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    if (!window.OneSignal || !initialized) return;
    setBusy(true);
    try {
      await window.OneSignal.User.PushSubscription.optOut();
      setSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al desuscribir.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OneSignalContext.Provider
      value={{
        initialized,
        subscribed,
        busy,
        error,
        iossupported,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </OneSignalContext.Provider>
  );
}
