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

export interface AuthIdentity {
  id: string;
  email: string;
  name: string;
  demo?: boolean;
}

interface AuthState {
  user: AuthIdentity | null;
  loading: boolean;
  configured: boolean;
  signInWithEmail: (email: string) => Promise<{ error?: string; message?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const DEMO_KEY = "camino-local-account";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      const saved = window.localStorage.getItem(DEMO_KEY);
      if (saved) setUser(JSON.parse(saved) as AuthIdentity);
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
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabase) {
      const local: AuthIdentity = {
        id: `local-${email.toLowerCase()}`,
        email,
        name: email.split("@")[0],
        demo: true,
      };
      window.localStorage.setItem(DEMO_KEY, JSON.stringify(local));
      setUser(local);
      return {
        message:
          "Cuenta local creada. Al configurar Supabase, recibirás un enlace seguro por email.",
      };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return { error: error.message };
    return { message: "Te enviamos un enlace seguro. Revisa tu correo para entrar." };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: "Configura Supabase para activar Google." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    window.localStorage.removeItem(DEMO_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: isSupabaseConfigured,
      signInWithEmail,
      signInWithGoogle,
      signOut,
    }),
    [user, loading, signInWithEmail, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
