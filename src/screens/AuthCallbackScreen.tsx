import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { storeSessionInBridge } from "../auth/sessionBridge";
import { FRONTEND_URL } from "../config";

export function AuthCallbackScreen() {
  const { user, loading } = useAuth();
  const [standalone, setStandalone] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  // 1. Detectamos si estamos en standalone (PWA) o navegador
  useEffect(() => {
    const checkStandalone = () => {
      const isStandalone =
        typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as any).standalone === true);
      setStandalone(isStandalone);
    };
    checkStandalone();
  }, []);

  // 2. Una vez que tenemos usuario Y sabemos si es standalone o no
  useEffect(() => {
    if (loading || standalone === null) return;
    if (!user) return;

    if (standalone) {
      // Ya estamos dentro de la PWA → todo bien, redirigimos al home
      window.location.replace("/");
      return;
    }

    // Estamos en Safari (navegador) → guardamos la sesión en localStorage
    // y redirigimos al usuario de vuelta a la app
    if (!saved) {
      setSaved(true);
      (async () => {
        const { data } = await supabase!.auth.getSession();
        if (data.session) {
          storeSessionInBridge({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          });
        }
        // Redirigir al home; si la PWA está instalada, iOS la abrirá
        window.location.replace(FRONTEND_URL);
      })();
    }
  }, [loading, user, standalone, saved]);

  if (loading || standalone === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f6f0]">
        <div className="text-sm text-[#77736b]">Verificando acceso...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f8f6f0] p-6">
        <p className="text-center text-sm text-[#a95353]">
          No pudimos confirmar tu acceso. Intenta de nuevo desde la app.
        </p>
        <button
          onClick={() => window.location.replace("/")}
          className="mt-4 h-12 rounded-2xl bg-[#1c1c1e] px-6 font-medium text-white"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#f8f6f0] p-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#ddd5c5] bg-white">
        <svg viewBox="0 0 40 40" className="h-10 w-10 text-[#7a8a5c]" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M20 5v30M14 12h12" strokeLinecap="round" />
          <circle cx="20" cy="20" r="17" opacity=".25" />
        </svg>
      </div>
      <h1 className="mt-6 text-center font-serif-holy text-2xl font-semibold text-[#1c1c1e]">
        {standalone ? "Sesión iniciada" : "Redirigiendo a la app..."}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-[15px] leading-relaxed text-[#77736b]">
        {standalone
          ? "Ya has iniciado sesión correctamente."
          : "Tu sesión se ha guardado. Abre la app de Camino para continuar."}
      </p>
      {!standalone && (
        <button
          onClick={() => window.location.replace(FRONTEND_URL)}
          className="mt-6 h-12 rounded-2xl bg-[#1c1c1e] px-6 font-medium text-white"
        >
          Abrir Camino
        </button>
      )}
    </div>
  );
}