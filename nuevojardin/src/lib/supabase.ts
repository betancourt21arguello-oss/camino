import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (typeof window !== "undefined") {
  (window as Record<string, unknown>).supabase = supabase;
}
