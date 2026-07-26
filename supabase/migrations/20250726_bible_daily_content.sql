create table public.user_bible_daily_content (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  content jsonb not null default '{}',
  generated_by text not null default 'gemini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.user_bible_daily_content enable row level security;

create policy "user_bible_daily_content_owner_select" on public.user_bible_daily_content for select to authenticated using (auth.uid() = user_id);
create policy "user_bible_daily_content_owner_insert" on public.user_bible_daily_content for insert to authenticated with check (auth.uid() = user_id);
create policy "user_bible_daily_content_owner_update" on public.user_bible_daily_content for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_user_bible_daily_content_user on public.user_bible_daily_content(user_id, date);