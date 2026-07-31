-- ============================================================
--  Consolidated fix: Missing spiritual_tasks table & RPC functions
--  Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/asfqkirsogozshlzcfpe/editor
-- ============================================================

-- 0. Create spiritual_tasks table if it doesn't exist
create table if not exists public.spiritual_tasks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  cadence text not null,
  time text,
  task_date text not null,
  days integer[],
  required boolean not null default false,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.spiritual_tasks enable row level security;

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

-- RLS policies for spiritual_tasks
drop policy if exists "Users can view own spiritual tasks" on public.spiritual_tasks;
create policy "Users can view own spiritual tasks"
  on public.spiritual_tasks for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "Users can insert own spiritual tasks" on public.spiritual_tasks;
create policy "Users can insert own spiritual tasks"
  on public.spiritual_tasks for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "Users can update own spiritual tasks" on public.spiritual_tasks;
create policy "Users can update own spiritual tasks"
  on public.spiritual_tasks for update
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "Service role can manage spiritual tasks" on public.spiritual_tasks;
create policy "Service role can manage spiritual tasks"
  on public.spiritual_tasks for all
  to service_role
  using (true)
  with check (true);

-- 1. ensure_daily_spiritual_tasks (6-parameter version with p_is_last_day_of_month)
create or replace function public.ensure_daily_spiritual_tasks(
  p_date text,
  p_is_sunday boolean,
  p_is_solemnity boolean,
  p_is_fasting_day boolean,
  p_day_of_month int,
  p_is_last_day_of_month boolean
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
  values
    (v_user_id, 'Ofrecimiento matutino', 'ofrecimiento', 'daily', '06:30', true, false, p_date),
    (v_user_id, 'Laudes (oración de la mañana)', 'laudes', 'daily', '07:00', true, false, p_date),
    (v_user_id, 'Lectura del Evangelio del día', 'gospel', 'daily', '08:00', true, false, p_date),
    (v_user_id, 'Salmo del día', 'psalm', 'daily', '08:10', true, false, p_date),
    (v_user_id, 'Primera lectura', 'first_reading', 'daily', '08:20', true, false, p_date),
    (v_user_id, 'Segunda lectura', 'second_reading', 'daily', '08:30', true, false, p_date),
    (v_user_id, 'Oración mental o silencio', 'silence', 'daily', '09:00', true, false, p_date),
    (v_user_id, 'Ángelus', 'angelus', 'daily', '12:00', true, false, p_date),
    (v_user_id, 'Santo Rosario', 'rosary', 'daily', '20:00', true, false, p_date),
    (v_user_id, 'Examen de conciencia', 'examen', 'daily', '21:00', true, false, p_date)
  on conflict (profile_id, task_date, category) do nothing;

  if p_is_sunday or p_is_solemnity then
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
    values (v_user_id, 'Santa Misa dominical', 'mass', 'weekly', '10:00', true, false, p_date)
    on conflict (profile_id, task_date, category) do nothing;
  end if;

  if p_is_fasting_day then
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
    values (v_user_id, 'Ayuno de hábito o de alimento', 'fasting', 'weekly', '06:00', true, false, p_date)
    on conflict (profile_id, task_date, category) do nothing;
  end if;

  if p_is_last_day_of_month then
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
    values (v_user_id, 'Confesión o guía espiritual', 'confession', 'monthly', null, true, false, p_date)
    on conflict (profile_id, task_date, category) do nothing;
  end if;
end;
$$;

grant execute on function public.ensure_daily_spiritual_tasks(text, boolean, boolean, boolean, int, boolean) to authenticated;

-- 2. ensure_recurring_custom_tasks
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

-- 3. insert_spiritual_task (used by generateRecurringInstances in frontend)
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