export type BibleMethodStepKey =
  | 'statio' | 'prayer' | 'context' | 'read' | 'imagine'
  | 'meditate' | 'silence' | 'action' | 'close';

export type BibleStepInputType = 'none' | 'text' | 'chips' | 'highlight' | 'timer';

export type BiblePlanLevel = 'principiante' | 'intermedio' | 'avanzado';
export type BibleGoalTag =
  | 'conocer_a_jesus' | 'orar_mejor' | 'entender_la_biblia'
  | 'seguir_la_misa' | 'perdon' | 'ansiedad' | 'duelo' | 'familia' | 'vocacion' | 'esperanza';
export type BibleUserLevel = 'nunca_lei' | 'algo_suelto' | 'leo_a_veces' | 'constante';
export type BibleEnrollmentStatus = 'active' | 'paused' | 'completed';

export interface StepDef {
  key: BibleMethodStepKey;
  title: string;
  instruction: string;
  durationSec?: number;
  inputType?: BibleStepInputType;
  optional?: boolean;
}

export interface BibleMethod {
  id: number;
  slug: string;
  name: string;
  purpose: string;
  pros: string[];
  cons: string[];
  audience: string;
  steps: StepDef[];
  created_at: string;
}

export interface BibleLesson {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body_md: string;
  order: number;
  category: string;
  sources: Array<{ doc: string; ref: string; url?: string }>;
  created_at: string;
}

export interface BiblePlan {
  id: number;
  slug: string;
  title: string;
  description: string;
  days_count: number;
  level: BiblePlanLevel;
  goal_tags: BibleGoalTag[];
  minutes_per_day: number;
  cover?: string;
  created_at: string;
}

export interface BiblePlanDay {
  id: number;
  plan_id: number;
  day_number: number;
  title: string;
  passage_refs: string[];
  context_note: string;
  meditation_questions: string[];
  suggested_action?: string;
  method_slug_override?: string | null;
  created_at: string;
}

export interface UserBibleProfile {
  user_id: string;
  level: BibleUserLevel;
  minutes_per_day: number;
  preferred_time?: string;
  goal: string;
  topic?: string;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBibleEnrollment {
  id: number;
  user_id: string;
  plan_id: number;
  started_at: string;
  current_day: number;
  status: BibleEnrollmentStatus;
  created_at: string;
  updated_at: string;
}

export interface UserBibleSession {
  id: number;
  user_id: string;
  enrollment_id: number;
  plan_day_id: number;
  completed_at: string;
  duration_sec: number;
  highlighted_text?: string;
  meditation_answer?: string;
  prayer_text?: string;
  commitment?: string;
  mood?: string;
}

export interface UserBibleStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date?: string;
  grace_days_used: number;
  updated_at: string;
}

export interface BiblePassage {
  reference: string;
  translation: string;
  text: string;
  contextUrl?: string;
  source: 'api' | 'deeplink' | 'local';
}

export interface TheologicalSource {
  doc: string;
  ref: string;
  url?: string;
}
