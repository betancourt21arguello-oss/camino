import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export function AuthCallbackScreen() {
  const { user, loading } = useAuth();
  const [standalone, setStandalone] = useState<boolean | null>(null);

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

  useEffect(() => {
    if (!loading && user && standalone) {
      window.location.replace("/");
    }
  }, [loading, user, standalone]);

  if (loading || standalone === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f6f0]">
        <div className="text-sm text-[#77736b]">Cargando...</div>
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

  if (!standalone) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f8f6f0] p-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#ddd5c5] bg-white">
          <svg viewBox="0 0 40 40" className="h-10 w-10 text-[#7a8a5c]" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M20 5v30M14 12h12" strokeLinecap="round" />
            <circle cx="20" cy="20" r="17" opacity=".25" />
          </svg>
        </div>
        <h1 className="mt-6 text-center font-serif-holy text-2xl font-semibold text-[#1c1c1e]">
          Abre el enlace en Camino
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[15px] leading-relaxed text-[#77736b]">
          Este enlace debe abrirse dentro de la app instalada. Cierra esta ventana,
          abre <strong>Camino</strong> desde tu pantalla de inicio y vuelve a tocar
          “Recibir enlace para entrar”.
        </p>
        <button
          onClick={() => window.location.replace("/")}
          className="mt-6 h-12 rounded-2xl bg-[#1c1c1e] px-6 font-medium text-white"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return null;
}
