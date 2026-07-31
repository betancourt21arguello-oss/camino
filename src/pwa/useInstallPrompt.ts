import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "camino_install_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * iOS / iPadOS no exponen `beforeinstallprompt`, por lo que la forma de
 * instalar varía según el navegador:
 *  - Safari (cualquier plataforma, incluido macOS): se muestra la guía manual
 *    de "Añadir a pantalla de inicio".
 *  - Resto (Chrome/Edge/Firefox en Android o escritorio): se espera el prompt
 *    nativo de instalación en un solo toque.
 * Detectamos Safari descartando los navegadores basados en Chromium/Apple que,
 * aun compartiendo el UA de Safari, sí disparan `beforeinstallprompt`.
 */
function detectSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /safari/i.test(ua) &&
    !/(chrome|chromium|crios|fxios|edgios|edge|opr|opera|firefox)/i.test(ua)
  );
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)").matches;
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(mql || standalone);
}

export type InstallMode = "prompt" | "ios-guide" | "installed" | "none";

export interface InstallController {
  mode: InstallMode;
  ios: boolean;
  standalone: boolean;
  canShow: boolean;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
}

export function useInstallPrompt(): InstallController {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [ios] = useState<boolean>(detectSafari());
  const [standalone, setStandalone] = useState<boolean>(detectStandalone);

  useEffect(() => {
    const saved = window.localStorage.getItem(DISMISS_KEY);
    if (saved && Date.now() - Number(saved) < DISMISS_TTL_MS) setDismissed(true);

    const onBeforeInstall = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      const isStandalone = detectStandalone();
      const savedDismiss = window.localStorage.getItem(DISMISS_KEY);
      const wasDismissed = Boolean(savedDismiss && Date.now() - Number(savedDismiss) < DISMISS_TTL_MS);
      if (isStandalone || wasDismissed) return;
      evt.preventDefault();
      setDeferred(evt);
    };
    const onInstalled = () => {
      setStandalone(true);
      setDeferred(null);
    };
    const onModeChange = (e: MediaQueryListEvent) => setStandalone(e.matches);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", onModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mql?.removeEventListener?.("change", onModeChange);
    };
  }, []);

  const mode: InstallMode = standalone
    ? "installed"
    : deferred
      ? "prompt"
      : ios
        ? "ios-guide"
        : "none";

  const dismiss = useCallback(() => {
    setDismissed(true);
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setStandalone(true);
      } else {
        dismiss();
      }
    } catch (error) {
      // If prompt() fails, dismiss to avoid browser warnings
      console.warn('[Camino] Install prompt failed:', error);
      dismiss();
    }
  }, [deferred, dismiss]);

  return {
    mode,
    ios,
    standalone,
    canShow: mode !== "none" && !dismissed,
    promptInstall,
    dismiss,
  };
}
