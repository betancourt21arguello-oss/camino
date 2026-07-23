import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export function AuthPortal({ onClose }: { onClose: () => void }) {
  const { signInWithEmail, signInWithGoogle, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

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
          Conserva tu Jardín Vivo, tu Regla de Vida y las intenciones que acompañas.
          No necesitas crear una contraseña.
        </p>

        <form onSubmit={submit} className="mt-8">
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
        <button
          onClick={async () => {
            const result = await signInWithGoogle();
            if (result.error) setError(result.error);
          }}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#ddd8cc] bg-white font-medium"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#ddd8cc] text-xs font-semibold">G</span>
          Continuar con Google
        </button>

        {notice && <p className="mt-5 text-center text-sm text-[#5f7657]">{notice}</p>}
        {error && <p className="mt-5 text-center text-sm text-[#a95353]">{error}</p>}
        {!configured && (
          <p className="mt-6 text-center text-[11px] leading-relaxed text-[#aaa69e]">
            Modo local activo. Consulta instructivo.md para conectar Supabase Auth.
          </p>
        )}
      </div>
    </div>
  );
}
