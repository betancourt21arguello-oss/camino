import type { CommunityWorkSeed } from "./types";
import { supabase } from "../lib/supabase";

const KEY = "camino-prayer-gallery";

export function loadGallery(): CommunityWorkSeed[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CommunityWorkSeed[];
  } catch {
    return [];
  }
}

export async function loadGalleryFromSupabase(): Promise<CommunityWorkSeed[]> {
  const client = supabase;
  if (!client) return [];
  let userId: string | null = null;
  try {
    const { data: { session } } = await client.auth.getSession();
    userId = session?.user?.id ?? null;
  } catch {
    return [];
  }
  if (!userId) return [];
  const { data, error } = await client
    .from("community_works")
    .select("id,session_id,composition,season,community_seed,signatures,participants,intentions,ave_marias,completed_at,title,intention_theme")
    .order("completed_at", { ascending: false })
    .limit(40);
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    composition: row.composition as CommunityWorkSeed["composition"],
    season: row.season as CommunityWorkSeed["season"],
    communitySeed: row.community_seed as string,
    signatures: row.signatures as CommunityWorkSeed["signatures"],
    participants: row.participants as number,
    intentions: row.intentions as number,
    aveMarias: row.ave_marias as number,
    completedAt: row.completed_at as number,
    title: row.title as string,
    intentionTheme: row.intention_theme as string,
  }));
}

export async function saveWork(work: CommunityWorkSeed) {
  const all = loadGallery().filter((w) => w.id !== work.id);
  all.unshift(work);
  window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 40)));

  const client = supabase;
  if (!client) return;
  let userId: string | null = null;
  try {
    const { data: { session } } = await client.auth.getSession();
    userId = session?.user?.id ?? null;
  } catch {
    return;
  }
  if (!userId) return;

  await client.from("community_works").upsert({
    id: work.id,
    session_id: work.sessionId,
    composition: work.composition,
    season: work.season,
    community_seed: work.communitySeed,
    signatures: work.signatures,
    participants: work.participants,
    intentions: work.intentions,
    ave_marias: work.aveMarias,
    completed_at: work.completedAt,
    title: work.title,
    intention_theme: work.intentionTheme,
  }, { onConflict: "id" });
}

export function clearGallery() {
  window.localStorage.removeItem(KEY);
}
