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

export interface AuthIdentity {
  id: string;
  email: string;
  name: string;
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

    supabase.auth.getSession().then(({ data }) => {
      const authUser = data.session?.user;
      setUser(
        authUser
          ? {
              id: authUser.id,
              email: authUser.email ?? "",
              name:
                authUser.user_metadata?.full_name ??
                authUser.email?.split("@")[0] ??
                "Peregrino",
            }
          : null,
      );
      if (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token")) {
        window.history.replaceState({}, document.title, FRONTEND_URL);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user;
      setUser(
        authUser
          ? {
              id: authUser.id,
              email: authUser.email ?? "",
              name:
                authUser.user_metadata?.full_name ??
                authUser.email?.split("@")[0] ??
                "Peregrino",
            }
          : null,
      );
      if (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token")) {
        window.history.replaceState({}, document.title, FRONTEND_URL);
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
      options: { emailRedirectTo: FRONTEND_URL },
    });
    if (error) return { error: error.message };
    return { message: "Te enviamos un enlace seguro. Revisa tu correo para entrar." };
  }, []);

  const signInWithProvider = useCallback(async (provider: "google" | "apple" | "facebook") => {
    if (!supabase) return { error: "Supabase Auth no está configurado." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: FRONTEND_URL },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
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
