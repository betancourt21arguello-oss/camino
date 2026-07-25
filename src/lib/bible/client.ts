import { supabase } from '@/lib/supabase';
import type {
  BibleMethod,
  BibleLesson,
  BiblePlan,
  BiblePlanDay,
  UserBibleProfile,
  UserBibleEnrollment,
  UserBibleSession,
  UserBibleStreak,
} from '@/types/bible';

export async function getMethods(): Promise<BibleMethod[]> {
  const { data, error } = await supabase!.from('bible_methods').select('*').order('slug');
  if (error) throw error;
  return data as BibleMethod[];
}

export async function getMethodBySlug(slug: string): Promise<BibleMethod | null> {
  const { data, error } = await supabase!.from('bible_methods').select('*').eq('slug', slug).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as BibleMethod;
}

export async function getLessons(): Promise<BibleLesson[]> {
  const { data, error } = await supabase!.from('bible_lessons').select('*').order('order');
  if (error) throw error;
  return data as BibleLesson[];
}

export async function getLessonBySlug(slug: string): Promise<BibleLesson | null> {
  const { data, error } = await supabase!.from('bible_lessons').select('*').eq('slug', slug).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as BibleLesson;
}

export async function getPlans(): Promise<BiblePlan[]> {
  const { data, error } = await supabase!.from('bible_plans').select('*').order('days_count');
  if (error) throw error;
  return data as BiblePlan[];
}

export async function getPlanBySlug(slug: string): Promise<(BiblePlan & { days: BiblePlanDay[] }) | null> {
  const { data: plan, error: planError } = await supabase!.from('bible_plans').select('*').eq('slug', slug).single();
  if (planError || !plan) return null;

  const { data: days, error: daysError } = await supabase!
    .from('bible_plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_number');

  if (daysError) throw daysError;

  return { ...(plan as BiblePlan), days: days as BiblePlanDay[] };
}

export async function getUserProfile(userId: string): Promise<UserBibleProfile | null> {
  const { data, error } = await supabase!.from('user_bible_profile').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as UserBibleProfile | null;
}

export async function upsertUserProfile(profile: Partial<UserBibleProfile> & { user_id: string }) {
  const { data, error } = await supabase!.from('user_bible_profile').upsert(profile).select().single();
  if (error) throw error;
  return data as UserBibleProfile;
}

export async function getUserEnrollment(userId: string): Promise<UserBibleEnrollment | null> {
  const { data, error } = await supabase!
    .from('user_bible_enrollment')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserBibleEnrollment | null;
}

export async function createEnrollment(enrollment: Partial<UserBibleEnrollment> & { user_id: string; plan_id: number }) {
  const { data, error } = await supabase!.from('user_bible_enrollment').insert(enrollment).select().single();
  if (error) throw error;
  return data as UserBibleEnrollment;
}

export async function updateEnrollment(id: number, patch: Partial<UserBibleEnrollment>) {
  const { data, error } = await supabase!.from('user_bible_enrollment').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as UserBibleEnrollment;
}

export async function createSession(session: Partial<UserBibleSession> & { user_id: string; enrollment_id: number; plan_day_id: number; duration_sec: number }) {
  const { data, error } = await supabase!.from('user_bible_sessions').insert(session).select().single();
  if (error) throw error;
  return data as UserBibleSession;
}

export async function getUserSessions(userId: string, limit = 50) {
  const { data, error } = await supabase!
    .from('user_bible_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as UserBibleSession[];
}

export async function getUserStreak(userId: string): Promise<UserBibleStreak | null> {
  const { data, error } = await supabase!.from('user_bible_streak').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as UserBibleStreak | null;
}

export async function upsertUserStreak(userId: string, patch: Partial<UserBibleStreak>) {
  const { data, error } = await supabase!.from('user_bible_streak').upsert({ user_id: userId, ...patch }).select().single();
  if (error) throw error;
  return data as UserBibleStreak;
}
