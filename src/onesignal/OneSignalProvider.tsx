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

          const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
          if (session?.user) {
            OneSignal.User.addAlias("supabase_id", session.user.id);
            if (session.user.email) {
              OneSignal.User.addEmail(session.user.email);
            }
          }
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

  const subscribe = async () => {
    if (!window.OneSignal || !initialized) {
      setError("OneSignal no está listo. Espera un momento.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await window.OneSignal.User.PushSubscription.optIn();
      setSubscribed(true);

      // Set external user ID after subscription
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
      if (session?.user) {
        window.OneSignal.User.addAlias("supabase_id", session.user.id);
        if (session.user.email) {
          window.OneSignal.User.addEmail(session.user.email);
        }
      }
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