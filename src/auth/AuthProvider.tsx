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
  signInWithEmail: (email: string) => Promise<{ error?: string; message?: string }>;
  signInWithProvider: (provider: "google" | "apple" | "facebook") => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const sb = supabase; // non-null desde aquí

    const initSession = async () => {
      // 🍎 iPhone / iOS fix: cuando el magic link se abre en Safari, guardamos
      // la sesión en localStorage (sessionBridge). Al abrir la PWA, la
      // restauramos aquí.
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
            // Si falla, no importa; seguimos con getSession normal
          }
          clearSessionBridge();
        }
      }

      const { data } = await sb.auth.getSession();
      const authUser = data.session?.user;
      setUser(
        authUser
          ? {
              id: authUser.id,
              email: authUser.email ?? "",
              name:
                authUser.user_metadata?.full_name ??
                authUser.email?.split("@")[0] ??
                "Usuario",
            }
          : null,
      );
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
      setUser(
        authUser
          ? {
              id: authUser.id,
              email: authUser.email ?? "",
              name:
                authUser.user_metadata?.full_name ??
                authUser.email?.split("@")[0] ??
                "Usuario",
            }
          : null,
      );
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
      signInWithProvider,
      signOut,
    }),
    [user, loading, signInWithEmail, signInWithProvider, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}