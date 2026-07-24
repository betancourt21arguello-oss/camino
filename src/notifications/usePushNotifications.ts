import { useCallback, useEffect, useState } from "react";
import { WORKER_API_BASE, VAPID_PUBLIC_KEY } from "../config";
import { supabase } from "../lib/supabase";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function detectPushSupport(): { webPush: boolean; reason: string } {
  if (typeof window === "undefined") return { webPush: false, reason: "SSR" };
  if (!("serviceWorker" in navigator)) return { webPush: false, reason: "Sin Service Worker" };
  if (!("PushManager" in window)) return { webPush: false, reason: "Sin PushManager" };
  if (!("Notification" in window)) return { webPush: false, reason: "Sin API de notificaciones" };
  // iOS Safari 16.4+ soporta Web Push solo en PWAs standalone
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isIOS && !isStandalone) {
    return { webPush: false, reason: "En iPhone, instala la app primero (Añadir a pantalla de inicio) para activar push." };
  }
  return { webPush: true, reason: "" };
}

export function usePushNotifications() {
  const detection = detectPushSupport();
  const supported = detection.webPush;
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(Boolean(sub)))
      .catch(() => undefined);
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) {
      setError(detection.reason || "Este dispositivo no soporta push web.");
      return;
    }
    let vapidPublicKey = VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      try {
        const res = await fetch(`${WORKER_API_BASE}/notifications/vapid-public-key`);
        if (res.ok) {
          const data = await res.json() as { vapidPublicKey?: string };
          vapidPublicKey = data.vapidPublicKey || "";
        }
      } catch {
        // No pudo obtener la clave desde el worker; continuar con error más abajo.
      }
    }

    if (!vapidPublicKey) {
      setError(
        "Push web no configurado en este servidor. Activa recordatorios por correo.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        throw new Error(
          "Permiso de notificaciones denegado. Actívalo en Ajustes del navegador.",
        );
      }

      let reg: ServiceWorkerRegistration;
      try {
        reg = await navigator.serviceWorker.register("/sw.js");
      } catch (swError) {
        throw new Error(
          `No se pudo registrar el Service Worker: ${swError instanceof Error ? swError.message : swError}`
        );
      }
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const token = supabase
        ? (await supabase.auth.getSession()).data.session?.access_token
        : undefined;
      const res = await fetch(`${WORKER_API_BASE}/notifications/subscribe`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subscription: sub.toJSON(), channel: "web" }),
      });
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar push.");
    } finally {
      setBusy(false);
    }
  }, [supported, detection.reason]);

  const enableEmail = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const token = supabase
        ? (await supabase.auth.getSession()).data.session?.access_token
        : undefined;
      const res = await fetch(`${WORKER_API_BASE}/notifications/email/reminders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ enabled: true }),
      });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar correo.");
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    supported,
    iosNeedsInstall: !supported && detection.reason.includes("iPhone"),
    permission,
    enabled,
    busy,
    error,
    enable,
    enableEmail,
  };
}
