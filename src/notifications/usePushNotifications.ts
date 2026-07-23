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

export function usePushNotifications() {
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
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
      setError("Este navegador no soporta push web.");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setError("Falta VITE_VAPID_PUBLIC_KEY.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Permiso de notificaciones denegado.");

      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
      await fetch(`${WORKER_API_BASE}/notifications/subscribe`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subscription: sub, channel: "web" }),
      });
      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar push.");
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const enableEmail = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
      await fetch(`${WORKER_API_BASE}/notifications/email/reminders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ enabled: true }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar correo.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, permission, enabled, busy, error, enable, enableEmail };
}
