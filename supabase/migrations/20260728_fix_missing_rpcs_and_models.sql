-- ============================================================
--  Fix: ensure_recurring_custom_tasks was missing from Supabase
--  This function creates recurring custom tasks for users
-- ============================================================

create or replace function public.ensure_recurring_custom_tasks(p_date text)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  custom_task record;
  day_of_week int;
  day_of_month int;
  should_insert boolean;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  day_of_week := extract(dow from p_date::date)::int;
  day_of_month := extract(day from p_date::date)::int;

  for custom_task in
    select * from public.spiritual_tasks
    where profile_id = v_user_id
      and category = 'custom'
      and cadence in ('daily', 'weekly', 'monthly')
      and task_date <= p_date
  loop
    should_insert := false;

    if custom_task.cadence = 'daily' then
      should_insert := true;
    elsif custom_task.cadence = 'weekly' then
      if custom_task.days is null or array_length(custom_task.days, 1) = 0 or custom_task.days @> array[day_of_week] then
        should_insert := true;
      end if;
    elsif custom_task.cadence = 'monthly' then
      if custom_task.days is null or array_length(custom_task.days, 1) = 0 or custom_task.days @> array[day_of_month] then
        should_insert := true;
      end if;
    end if;

    if should_insert then
      insert into public.spiritual_tasks(profile_id, title, category, cadence, time, task_date, days, required, done)
      values (v_user_id, custom_task.title, 'custom', custom_task.cadence, custom_task.time, p_date, custom_task.days, false, false)
      on conflict (profile_id, task_date, category) do nothing;
    end if;
  end loop;
end;
$$;

grant execute on function public.ensure_recurring_custom_tasks(text) to authenticated;

-- ============================================================
--  Fix: insert_spiritual_task was missing from Supabase
--  This function inserts a spiritual task with conflict handling
-- ============================================================

create or replace function public.insert_spiritual_task(
    p_profile_id uuid,
    p_title text,
    p_category text,
    p_cadence text,
    p_time text,
    p_task_date text,
    p_days integer[],
    p_required boolean,
    p_done boolean
)
returns void
language plpgsql
security definer
as $$
begin
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, task_date, days, required, done)
    values (p_profile_id, p_title, p_category, p_cadence, p_time, p_task_date, p_days, p_required, p_done)
    on conflict (profile_id, task_date, category) do nothing;
end;
$$;

grant execute on function public.insert_spiritual_task(uuid, text, text, text, text, text, integer[], boolean, boolean) to authenticated;

-- ============================================================
--  Fix: admin_insert_compensatory_event was missing
--  This function allows admin to insert compensatory garden events
-- ============================================================

create or replace function public.admin_insert_compensatory_event(
  p_target_user_id uuid,
  p_event_type text,
  p_value int,
  p_intention text default 'Ajuste manual por admin',
  p_created_at timestamptz default now()
)
returns void
language plpgsql
security definer
as $$
begin
  insert into garden_events(user_id, event_type, value, intention, created_at)
  values (p_target_user_id, p_event_type, p_value, p_intention, p_created_at);
end;
$$;

grant execute on function public.admin_insert_compensatory_event(uuid, text, int, text, timestamptz) to authenticated;

-- ============================================================
--  Fix: claim_daily_completion was missing
--  This function checks if a daily completion has already been claimed
-- ============================================================

create or replace function public.claim_daily_completion(p_event_type text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  select count(*) into v_count
  from public.daily_completions
  where profile_id = v_user_id
    and event_type = p_event_type
    and completed_date = timezone('America/Caracas', current_date);

  if v_count > 0 then
    return false;
  end if;

  insert into public.daily_completions(profile_id, event_type, completed_date)
  values (v_user_id, p_event_type, timezone('America/Caracas', current_date))
  on conflict (profile_id, event_type, completed_date) do nothing;

  return true;
end;
$$;

grant execute on function public.claim_daily_completion(text) to authenticated;

-- ============================================================
--  Fix: Ensure daily_completions table exists
-- ============================================================

create table if not exists public.daily_completions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  event_type text not null,
  completed_date date not null default (timezone('America/Caracas', current_date)),
  created_at timestamptz default now(),
  unique (profile_id, event_type, completed_date)
);

alter table public.daily_completions enable row level security;

drop policy if exists "Users can view own completions" on public.daily_completions;
create policy "Users can view own completions"
  on public.daily_completions for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "Users can insert own completions" on public.daily_completions;
create policy "Users can insert own completions"
  on public.daily_completions for insert
  to authenticated
  with check (profile_id = auth.uid());

-- ============================================================
--  Fix: Ensure spiritual_tasks has proper unique constraint
-- ============================================================

-- Add unique constraint if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'spiritual_tasks_profile_id_task_date_category_key'
  ) then
    alter table public.spiritual_tasks
      add constraint spiritual_tasks_profile_id_task_date_category_key
      unique (profile_id, task_date, category);
  end if;
end;
$$;

-- ============================================================
--  Fix: Ensure core tables exist (fruits, candles, garden_events, intentions)
--  These tables are referenced by RPCs but may not have been created
-- ============================================================

create table if not exists public.fruits (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  vela int not null default 0,
  semilla int not null default 0,
  agua int not null default 0,
  updated_at timestamptz default now()
);

alter table public.fruits enable row level security;

drop policy if exists "Users can view own fruits" on public.fruits;
create policy "Users can view own fruits"
  on public.fruits for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "Users can update own fruits" on public.fruits;
create policy "Users can update own fruits"
  on public.fruits for update
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "Service role can manage fruits" on public.fruits;
create policy "Service role can manage fruits"
  on public.fruits for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.candles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  intention text not null,
  lit_at timestamptz default now(),
  expires_at timestamptz not null,
  prayed_by uuid[] default '{}',
  created_at timestamptz default now()
);

alter table public.candles enable row level security;

drop policy if exists "Users can insert own candles" on public.candles;
create policy "Users can insert own candles"
  on public.candles for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Users can view all candles" on public.candles;
create policy "Users can view all candles"
  on public.candles for select
  to authenticated
  using (true);

drop policy if exists "Users can update own candles" on public.candles;
create policy "Users can update own candles"
  on public.candles for update
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Service role can manage candles" on public.candles;
create policy "Service role can manage candles"
  on public.candles for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.intentions (
  id uuid primary key default gen_random_uuid(),
  candle_id uuid not null references public.candles(id) on delete cascade,
  pray_for_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.intentions enable row level security;

drop policy if exists "Users can insert own intentions" on public.intentions;
create policy "Users can insert own intentions"
  on public.intentions for insert
  to authenticated
  with check (pray_for_id = auth.uid());

drop policy if exists "Users can view intentions for their candles" on public.intentions;
create policy "Users can view intentions for their candles"
  on public.intentions for select
  to authenticated
  using (
    candle_id in (
      select id from public.candles where owner_id = auth.uid()
    )
  );

drop policy if exists "Service role can manage intentions" on public.intentions;
create policy "Service role can manage intentions"
  on public.intentions for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.garden_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  value int default 1,
  intention text,
  created_at timestamptz default now()
);

create index if not exists idx_garden_events_user_id on public.garden_events(user_id);
create index if not exists idx_garden_events_created_at on public.garden_events(created_at);
create index if not exists idx_garden_events_type on public.garden_events(event_type);

alter table public.garden_events enable row level security;

drop policy if exists "Users can insert own garden events" on public.garden_events;
create policy "Users can insert own garden events"
  on public.garden_events for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can view own garden events" on public.garden_events;
create policy "Users can view own garden events"
  on public.garden_events for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Service role can insert garden events" on public.garden_events;
create policy "Service role can insert garden events"
  on public.garden_events for insert
  to service_role
  with check (true);

drop policy if exists "Service role can view garden events" on public.garden_events;
create policy "Service role can view garden events"
  on public.garden_events for select
  to service_role
  using (true);

-- ============================================================
--  Fix: Ensure spiritual_tasks has proper unique constraint
-- ============================================================

-- Add unique constraint if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'spiritual_tasks_profile_id_task_date_category_key'
  ) then
    alter table public.spiritual_tasks
      add constraint spiritual_tasks_profile_id_task_date_category_key
      unique (profile_id, task_date, category);
  end if;
end;
$$;
