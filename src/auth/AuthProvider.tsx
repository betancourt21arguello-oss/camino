import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { FRONTEND_URL } from "../config";
import { getSessionFromBridge, clearSessionBridge } from "./sessionBridge";

export interface AuthIdentity {
  id: string;
  email: string;
  name: string;
  created_at?: string;
}

interface AuthState {
  user: AuthIdentity | null;
  loading: boolean;
  configured: boolean;
  /** Magic link por email */
  signInWithEmail: (email: string) => Promise<{ error?: string; message?: string }>;
  /** Email + contraseña: iniciar sesión */
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string; user?: AuthIdentity }>;
  /** Email + contraseña: registrarse */
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: string; user?: AuthIdentity }>;
  /** Enviar correo para restablecer contraseña */
  resetPasswordForEmail: (email: string) => Promise<{ error?: string; message?: string }>;
  /** Actualizar contraseña del usuario autenticado */
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signInWithProvider: (provider: "google" | "apple" | "facebook") => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface UserForFormat {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: { full_name?: string };
}

function formatUser(authUser: UserForFormat): AuthIdentity {
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name:
      authUser.user_metadata?.full_name ??
      authUser.email?.split("@")[0] ??
      "Usuario",
    created_at: authUser.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const sb = supabase;

    const initSession = async () => {
      const isStandalone =
        typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as any).standalone === true);

      if (isStandalone) {
        const bridge = getSessionFromBridge();
        if (bridge) {
          try {
            await sb.auth.setSession({
              access_token: bridge.access_token,
              refresh_token: bridge.refresh_token,
            });
          } catch {
            // ignorar
          }
          clearSessionBridge();
        }
      }

      const { data } = await sb.auth.getSession();
      const authUser = data.session?.user;
      setUser(authUser ? formatUser(authUser) : null);
      if (
        window.location.hash.includes("access_token") ||
        window.location.hash.includes("refresh_token")
      ) {
        const target =
          window.location.pathname === "/auth/callback"
            ? "/auth/callback"
            : FRONTEND_URL;
        window.history.replaceState({}, document.title, target);
      }
      setLoading(false);
    };

    initSession();

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user;
      setUser(authUser ? formatUser(authUser) : null);
      if (
        window.location.hash.includes("access_token") ||
        window.location.hash.includes("refresh_token")
      ) {
        const target =
          window.location.pathname === "/auth/callback"
            ? "/auth/callback"
            : FRONTEND_URL;
        window.history.replaceState({}, document.title, target);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  /** Magic link por email */
  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabase) {
      return { error: "Supabase Auth no está configurado." };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: FRONTEND_URL + "/auth/callback" },
    });
    if (error) return { error: error.message };
    return { message: "Te enviamos un enlace seguro. Revisa tu correo para entrar." };
  }, []);

  /** Email + contraseña: iniciar sesión */
  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase Auth no está configurado." };
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    if (!data.session) return { error: "No se pudo iniciar sesión." };
    return { user: formatUser(data.user) };
  }, []);

  /** Email + contraseña: registrarse */
  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase Auth no está configurado." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: FRONTEND_URL + "/auth/callback" },
    });
    if (error) return { error: error.message };
    if (data.session) {
      return { user: data.user ? formatUser(data.user) : undefined };
    }
    return { error: "Revisa tu correo para confirmar la cuenta y luego inicia sesión." };
  }, []);

  /** Enviar correo para restablecer contraseña */
  const resetPasswordForEmail = useCallback(async (email: string) => {
    if (!supabase) return { error: "Supabase Auth no está configurado." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: FRONTEND_URL + "/auth/callback",
    });
    if (error) return { error: error.message };
    return { message: "Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo." };
  }, []);

  /** Actualizar contraseña del usuario autenticado */
  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return { error: "Supabase Auth no está configurado." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signInWithProvider = useCallback(async (provider: "google" | "apple" | "facebook") => {
    if (!supabase) return { error: "Supabase Auth no está configurado." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: FRONTEND_URL + "/auth/callback" },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    clearSessionBridge();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: isSupabaseConfigured,
      signInWithEmail,
      signInWithPassword,
      signUpWithPassword,
      resetPasswordForEmail,
      updatePassword,
      signInWithProvider,
      signOut,
    }),
    [user, loading, signInWithEmail, signInWithPassword, signUpWithPassword, resetPasswordForEmail, updatePassword, signInWithProvider, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}