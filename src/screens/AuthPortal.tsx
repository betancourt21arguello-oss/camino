import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

type AuthMode = "login" | "signup" | "magiclink" | "reset" | "setpassword";

export function AuthPortal({ onClose, initialMode }: { onClose: () => void; initialMode?: AuthMode }) {
  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithEmail,
    signInWithProvider,
    resetPasswordForEmail,
    updatePassword,
    configured,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode || "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isSignup && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const fn = isSignup ? signUpWithPassword : signInWithPassword;
    const result = await fn(email.trim(), password);
    setBusy(false);
    if (result.error) setError(result.error);
    else if (result.user) onClose();
    else setNotice("Revisa tu correo para confirmar la cuenta.");
  };

  const submitMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    const result = await signInWithEmail(email.trim());
    setBusy(false);
    if (result.error) setError(result.error);
    else setNotice(result.message ?? "Revisa tu correo.");
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    const result = await resetPasswordForEmail(email.trim());
    setBusy(false);
    if (result.error) setError(result.error);
    else setNotice(result.message ?? "Revisa tu correo.");
  };

  const submitSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) return;
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const result = await updatePassword(password.trim());
    setBusy(false);
    if (result.error) setError(result.error);
    else {
      setNotice("Contraseña actualizada correctamente.");
      setTimeout(onClose, 1500);
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
          {mode === "reset"
            ? "Restablecer contraseña"
            : mode === "setpassword"
            ? "Establecer contraseña"
            : isSignup
            ? "Crear cuenta"
            : "Iniciar sesión"}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[15px] leading-relaxed text-[#77736b]">
          {mode === "reset"
            ? "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."
            : mode === "setpassword"
            ? "Escribe la nueva contraseña para tu cuenta."
            : isSignup
            ? "Crea tu cuenta con email y contraseña. Tu jardín estará siempre contigo."
            : "Ingresa tu email y contraseña para guardar tu Camino."}
        </p>

        {/* Tabs */}
        {mode !== "reset" && mode !== "setpassword" && (
          <div className="mt-6 flex gap-1 rounded-2xl bg-[#eceae4] p-1">
            <TabBtn active={mode === "login"} onClick={() => { setMode("login"); setError(""); setNotice(""); }}>
              Entrar
            </TabBtn>
            <TabBtn active={mode === "signup"} onClick={() => { setMode("signup"); setError(""); setNotice(""); }}>
              Crear cuenta
            </TabBtn>
            <TabBtn active={mode === "magiclink"} onClick={() => { setMode("magiclink"); setError(""); setNotice(""); }}>
              Magic Link
            </TabBtn>
          </div>
        )}

        {/* Login form */}
        {mode === "login" && (
          <form onSubmit={submitPassword} className="mt-5">
            <label className="text-xs font-medium text-[#77736b]" htmlFor="pw-email">Correo electrónico</label>
            <input id="pw-email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com"
              className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none" />
            <label className="mt-4 block text-xs font-medium text-[#77736b]" htmlFor="pw-password">Contraseña</label>
            <input id="pw-password" type="password" required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6}
              className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none" />
            <button disabled={busy} className="mt-4 h-14 w-full rounded-2xl bg-[#1c1c1e] font-medium text-white disabled:opacity-60">
              {busy ? "Procesando…" : "Iniciar sesión"}
            </button>
            <button type="button" onClick={() => { setMode("reset"); setError(""); setNotice(""); }}
              className="mt-3 w-full text-center text-xs text-[#9a9a9f] hover:text-[#a68b4e] transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* Signup form */}
        {mode === "signup" && (
          <form onSubmit={submitPassword} className="mt-5">
            <label className="text-xs font-medium text-[#77736b]" htmlFor="su-email">Correo electrónico</label>
            <input id="su-email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com"
              className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none" />
            <label className="mt-4 block text-xs font-medium text-[#77736b]" htmlFor="su-password">Contraseña</label>
            <input id="su-password" type="password" required autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6}
              className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none" />
            <label className="mt-4 block text-xs font-medium text-[#77736b]" htmlFor="su-confirm">Confirmar contraseña</label>
            <input id="su-confirm" type="password" required autoComplete="off" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" minLength={6}
              className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none" />
            <button disabled={busy} className="mt-4 h-14 w-full rounded-2xl bg-[#1c1c1e] font-medium text-white disabled:opacity-60">
              {busy ? "Procesando…" : "Crear cuenta"}
            </button>
          </form>
        )}

        {/* Magic link */}
        {mode === "magiclink" && (
          <form onSubmit={submitMagicLink} className="mt-5">
            <label className="text-xs font-medium text-[#77736b]" htmlFor="ml-email">Correo electrónico</label>
            <input id="ml-email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com"
              className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none" />
            <button disabled={busy} className="mt-3 h-14 w-full rounded-2xl bg-[#1c1c1e] font-medium text-white disabled:opacity-60">
              {busy ? "Enviando…" : "Recibir enlace para entrar"}
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-[#aaa69e]">
              ⚠️ En iPhone el enlace se abre en el navegador. Usa "Entrar" con email y contraseña.
            </p>
          </form>
        )}

        {/* Reset password */}
        {mode === "reset" && (
          <form onSubmit={submitReset} className="mt-5">
            <label className="text-xs font-medium text-[#77736b]" htmlFor="rst-email">Correo electrónico</label>
            <input id="rst-email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com"
              className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none" />
            <button disabled={busy} className="mt-3 h-14 w-full rounded-2xl bg-[#1c1c1e] font-medium text-white disabled:opacity-60">
              {busy ? "Enviando…" : "Enviar enlace de recuperación"}
            </button>
            <button type="button" onClick={() => { setMode("login"); setError(""); setNotice(""); }}
              className="mt-3 w-full text-center text-xs text-[#9a9a9f] hover:text-[#a68b4e] transition-colors">
              Volver a inicio de sesión
            </button>
          </form>
        )}

        {/* Set password (for logged-in users or recovery flow) */}
        {mode === "setpassword" && (
          <form onSubmit={submitSetPassword} className="mt-5">
            <label className="text-xs font-medium text-[#77736b]" htmlFor="sp-new">Nueva contraseña</label>
            <input id="sp-new" type="password" required autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6}
              className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none" />
            <label className="mt-4 block text-xs font-medium text-[#77736b]" htmlFor="sp-confirm">Confirmar contraseña</label>
            <input id="sp-confirm" type="password" required autoComplete="off" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" minLength={6}
              className="mt-2 h-14 w-full rounded-2xl border border-[#ddd8cc] bg-white px-4 text-[16px] focus:border-[#a68b4e] focus:outline-none" />
            <button disabled={busy} className="mt-4 h-14 w-full rounded-2xl bg-[#1c1c1e] font-medium text-white disabled:opacity-60">
              {busy ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}

        {/* Google only */}
        {mode !== "reset" && mode !== "setpassword" && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-[#aaa69e]">
              <span className="h-px flex-1 bg-[#ddd8cc]" />
              o
              <span className="h-px flex-1 bg-[#ddd8cc]" />
            </div>
            <button
              onClick={async () => {
                const result = await signInWithProvider("google");
                if (result.error) setError(result.error);
              }}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#ddd8cc] bg-white text-xs font-medium"
            >
              <span className="text-lg font-semibold">G</span>
              Google
            </button>
          </>
        )}

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

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
        active
          ? "bg-white text-[#1c1c1e] shadow-sm"
          : "text-[#8a8a90] hover:text-[#1c1c1e]"
      }`}
    >
      {children}
    </button>
  );
}