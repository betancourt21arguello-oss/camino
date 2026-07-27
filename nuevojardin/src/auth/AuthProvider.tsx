import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signInWithProvider: (provider: "google" | "apple" | "facebook") => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  configured: true,
  signOut: async () => {},
  signInWithEmail: async () => ({ error: null }),
  signInWithProvider: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error };
  };

  const signInWithProvider = async (provider: "google" | "apple" | "facebook") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <Ctx.Provider value={{ user, session, loading, configured: true, signOut, signInWithEmail, signInWithProvider }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
