import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthProvider";

interface Props {
  onClose: () => void;
}

export function AuthPortal({ onClose }: Props) {
  const { signInWithEmail, signInWithProvider, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmail = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signInWithEmail(email.trim());
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-[430px] rounded-t-3xl bg-white px-6 pt-6 pb-10"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="mb-1 h-1 w-12 rounded-full bg-[#e6e3db] mx-auto" />
        <div className="mt-5 mb-6 text-center">
          <p className="font-serif-holy text-xl font-semibold text-[#1c1c1e]">Entrar a Camino</p>
          <p className="mt-1 text-sm text-[#9a9a9f]">Tu jardín espiritual te espera</p>
        </div>

        {!sent ? (
          <>
            {!configured && (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-700">Supabase no está configurado correctamente.</p>
              </div>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-2xl border border-[#e6e3db] bg-[#f7f6f3] px-4 py-3 text-sm text-[#1c1c1e] placeholder:text-[#a8a8ad] focus:border-[#c4a35a] focus:outline-none"
              onKeyDown={(e) => { if (e.key === "Enter") handleEmail(); }}
            />
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
            <motion.button
              onClick={handleEmail}
              disabled={loading}
              className="mt-3 w-full rounded-2xl bg-[#1c1c1e] py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              whileTap={{ scale: 0.97 }}
            >
              {loading ? "Enviando..." : "Recibir enlace para entrar"}
            </motion.button>

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-[#e6e3db]" />
              <span className="text-xs text-[#9a9a9f]">o</span>
              <div className="flex-1 h-px bg-[#e6e3db]" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["google", "apple", "facebook"] as const).map((p) => (
                <motion.button
                  key={p}
                  onClick={() => signInWithProvider(p)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#e6e3db] bg-white py-3 text-sm font-medium text-[#1c1c1e]"
                  whileTap={{ scale: 0.97 }}
                >
                  {p === "google" && "G"}
                  {p === "apple" && ""}
                  {p === "facebook" && "f"}
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-2xl mb-2">✉️</p>
            <p className="text-sm font-medium text-green-800">Enlace enviado a {email}</p>
            <p className="mt-1 text-xs text-green-600">Revisa tu bandeja de entrada</p>
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full py-2 text-sm text-[#9a9a9f]">
          Cerrar
        </button>
      </motion.div>
    </motion.div>
  );
}
