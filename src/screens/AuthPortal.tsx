import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getSessionFromBridge, clearSessionBridge } from "../auth/sessionBridge";

export function AuthPortal({ onClose }: { onClose: () => void }) {
  const { signInWithEmail, signInWithProvider, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [hasBridge, setHasBridge] = useState(false);

  useEffect(() => {
    setHasBridge(getSessionFromBridge() !== null);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    const result = await signInWithEmail(email.trim());
    setBusy(false);
    if (result.error) setError(result.error);
    else {
      setNotice(result.message ?? "Revisa tu correo.");
      if (!configured) window.setTimeout(onClose, 900);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#f8f6f0] text-[#1c1c1e]">
      <div className="flex items-center justify-between px-5 pt-12">
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#8a8a90]"
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="text-[10px] font-semibold tracking-[0.22em] text-[#a68b4e]">
          CUENTA CAMINO
        </div>
        <div className="w-11" />
      </div>

      <div className="flex flex-1 flex-col justify-center px-7 pb-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#ddd5c5] bg-white">
          <svg viewBox="0 0 40 40" className="h-10 w-10 text-[#7a8a5c]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M20 5v30M14 12h12" strokeLinecap="round" />
            <circle cx="20" cy="20" r="17" opacity=".25" />
          </svg>
        </div>
        <h1 className="mt-6 text-center font-serif-holy text-3xl font-semibold">
          Guarda tu Camino
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[15px] leading-relaxed text-[#77736b]">
          Entra rápido con Supabase Auth. Conserva tu Jardín Vivo, tu Regla de Vida
          y tus intenciones sin crear contraseña.
        </p>

        {hasBridge && (
          <button
            onClick={() => { clearSessionBridge(); window.location.reload(); }}
            className="mt-6 h-14 w-full rounded-2xl bg-[#7a8a5c] font-medium text-white shadow-sm"
          >
            🍎 Continuar sesión desde Safari
          </button>
        )}

        <form onSubmit={submit} className={hasBridge ? "mt-4" : "mt-8"}>
          <label className="text-xs font-medium text-[#77736b]" htmlFor="auth-email">
            Tu correo electrónico
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@correo.com"
            className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none"
          />
          <button
            disabled={busy}
            className="mt-3 h-14 w-full rounded-2xl bg-[#1c1c1e] font-medium text-white disabled:opacity-60"
          >
            {busy ? "Enviando…" : "Recibir enlace para entrar"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-[#aaa69e]">
          <span className="h-px flex-1 bg-[#ddd8cc]" />
          o
          <span className="h-px flex-1 bg-[#ddd8cc]" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SocialButton label="Google" mark="G" onClick={() => signInWithProvider("google")} onError={setError} />
          <SocialButton label="Apple" mark="" onClick={() => signInWithProvider("apple")} onError={setError} />
          <SocialButton label="Facebook" mark="f" onClick={() => signInWithProvider("facebook")} onError={setError} />
        </div>

        {notice && <p className="mt-5 text-center text-sm text-[#5f7657]">{notice}</p>}
        {error && <p className="mt-5 text-center text-sm text-[#a95353]">{error}</p>}
        {!configured && (
          <p className="mt-6 text-center text-[11px] leading-relaxed text-[#aaa69e]">
            Supabase Auth no está configurado. Revisa las variables de entorno.
          </p>
        )}
      </div>
    </div>
  );
}

function SocialButton({
  label,
  mark,
  onClick,
  onError,
}: {
  label: string;
  mark: string;
  onClick: () => Promise<{ error?: string }>;
  onError: (v: string) => void;
}) {
  return (
    <button
      onClick={async () => {
        const result = await onClick();
        if (result.error) onError(result.error);
      }}
      className="flex h-14 flex-col items-center justify-center rounded-2xl border border-[#ddd8cc] bg-white text-xs font-medium"
    >
      <span className="text-lg font-semibold">{mark}</span>
      {label}
    </button>
  );
}