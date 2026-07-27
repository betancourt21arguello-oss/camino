create table if not exists public.community_works (
  id text primary key,
  session_id text not null,
  composition text not null,
  season text not null default 'ordinary',
  community_seed text not null,
  signatures jsonb not null default '[]'::jsonb,
  participants int not null default 0,
  intentions int not null default 0,
  ave_marias int not null default 0,
  completed_at bigint not null default extract(epoch from now()) * 1000,
  title text not null,
  intention_theme text not null default 'paz',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.community_works enable row level security;

create policy "Users can view all community works"
  on public.community_works for select
  to authenticated
  using (true);

create policy "Users can insert own community works"
  on public.community_works for insert
  to authenticated
  with check (true);

create policy "Users can update own community works"
  on public.community_works for update
  to authenticated
  using (true);

create index idx_community_works_session_id on public.community_works(session_id);
create index idx_community_works_completed_at on public.community_works(completed_at desc);
