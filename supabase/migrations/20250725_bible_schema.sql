create type bible_method_step_key as enum (
  'statio','prayer','context','read','imagine',
  'meditate','silence','action','close'
);
create type bible_step_input as enum ('none','text','chips','highlight','timer');
create type bible_plan_level as enum ('principiante','intermedio','avanzado');
create type bible_goal_tag as enum (
  'conocer_a_jesus','orar_mejor','entender_la_biblia',
  'seguir_la_misa','perdon','ansiedad','duelo','familia','vocacion','esperanza'
);
create type bible_enrollment_status as enum ('active','paused','completed');

create table public.bible_methods (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  purpose text not null,
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  audience text not null,
  steps jsonb not null,
  created_at timestamptz not null default now()
);

create table public.bible_lessons (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  summary text not null,
  body_md text not null,
  "order" int not null,
  category text not null,
  sources jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.bible_plans (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  description text not null,
  days_count int not null,
  level bible_plan_level not null default 'principiante',
  goal_tags bible_goal_tag[] not null default '{}',
  minutes_per_day int not null,
  cover text,
  created_at timestamptz not null default now()
);

create table public.bible_plan_days (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.bible_plans(id) on delete cascade,
  day_number int not null,
  title text not null,
  passage_refs text[] not null default '{}',
  context_note text not null,
  meditation_questions text[] not null default '{}',
  suggested_action text,
  method_slug_override text references public.bible_methods(slug) on delete set null,
  created_at timestamptz not null default now(),
  unique (plan_id, day_number)
);

create table public.user_bible_profile (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  level text not null default 'nunca_lei',
  minutes_per_day int not null default 10,
  preferred_time text,
  goal text not null default 'conocer_a_jesus',
  topic text,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_bible_enrollment (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id bigint not null references public.bible_plans(id) on delete restrict,
  started_at date not null default now(),
  current_day int not null default 1,
  status bible_enrollment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_id)
);

create table public.user_bible_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id bigint not null references public.user_bible_enrollment(id) on delete cascade,
  plan_day_id bigint not null references public.bible_plan_days(id) on delete restrict,
  completed_at timestamptz not null default now(),
  duration_sec int not null,
  highlighted_text text,
  meditation_answer text,
  prayer_text text,
  commitment text,
  mood text
);

create table public.user_bible_streak (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_completed_date date,
  grace_days_used int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.bible_methods enable row level security;
alter table public.bible_lessons enable row level security;
alter table public.bible_plans enable row level security;
alter table public.bible_plan_days enable row level security;
alter table public.user_bible_profile enable row level security;
alter table public.user_bible_enrollment enable row level security;
alter table public.user_bible_sessions enable row level security;
alter table public.user_bible_streak enable row level security;

create policy "bible_methods_select_anon" on public.bible_methods for select to anon, authenticated using (true);
create policy "bible_lessons_select_anon" on public.bible_lessons for select to anon, authenticated using (true);
create policy "bible_plans_select_anon" on public.bible_plans for select to anon, authenticated using (true);
create policy "bible_plan_days_select_anon" on public.bible_plan_days for select to anon, authenticated using (true);

create policy "user_bible_profile_owner" on public.user_bible_profile for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_bible_enrollment_owner" on public.user_bible_enrollment for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_bible_sessions_owner" on public.user_bible_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_bible_streak_owner" on public.user_bible_streak for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_bible_plan_days_plan on public.bible_plan_days(plan_id, day_number);
create index idx_user_bible_sessions_user on public.user_bible_sessions(user_id, completed_at desc);
create index idx_user_bible_enrollment_user on public.user_bible_enrollment(user_id);
