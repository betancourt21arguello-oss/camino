-- ============================================================
--  Fix: water_garden fails when fruits row doesn't exist
--  This migration ensures:
--  1. fruits table exists with proper schema
--  2. water_garden creates fruits row if missing
--  3. bulk_water_garden creates fruits row if missing
--  4. ensure_fruits function for frontend initialization
-- ============================================================

-- Ensure fruits table exists
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

drop policy if exists "Users can insert own fruits" on public.fruits;
create policy "Users can insert own fruits"
  on public.fruits for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "Service role can manage fruits" on public.fruits;
create policy "Service role can manage fruits"
  on public.fruits for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
--  ensure_fruits: Creates a fruits row for the user if it doesn't exist
--  Returns the current balance
-- ============================================================
create or replace function public.ensure_fruits()
returns table(vela int, semilla int, agua int)
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance record;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  -- Insert if not exists
  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
  values (v_user_id, 0, 0, 0, now())
  on conflict (profile_id) do nothing;

  -- Return current balance
  select vela, semilla, agua into v_balance
  from public.fruits
  where profile_id = v_user_id;

  return next v_balance.vela, v_balance.semilla, v_balance.agua;
end;
$$;

grant execute on function public.ensure_fruits() to authenticated;

-- ============================================================
--  Fix water_garden: Create fruits row if it doesn't exist
-- ============================================================
create or replace function water_garden(p_intention text)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_agua int;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  -- Ensure fruits row exists
  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
  values (v_user_id, 0, 0, 0, now())
  on conflict (profile_id) do nothing;

  select agua into v_agua from public.fruits where profile_id = v_user_id for update;
  if v_agua is null or v_agua <= 0 then
    raise exception 'No tienes agua disponible';
  end if;

  insert into garden_events(user_id, event_type, value, intention, created_at)
    values (v_user_id, 'WATER_GARDEN', 1, p_intention, now());

  insert into garden_waterings(user_id, amount, intention, watered_at)
    values (v_user_id, 1, p_intention, now());

  update public.fruits set agua = agua - 1, updated_at = now() where profile_id = v_user_id;
end;
$$;

grant execute on function water_garden(text) to authenticated;

-- ============================================================
--  Fix bulk_water_garden: Create fruits row if it doesn't exist
-- ============================================================
create or replace function bulk_water_garden(p_user_id uuid, p_intention text)
returns table(watered boolean, amount int, new_water_level int)
language plpgsql
security definer
as $$
declare
  v_agua int;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  -- Ensure fruits row exists
  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
  values (p_user_id, 0, 0, 0, now())
  on conflict (profile_id) do nothing;

  select agua into v_agua from public.fruits where profile_id = p_user_id for update;
  if v_agua is null or v_agua <= 0 then
    watered := false; amount := 0; new_water_level := 0; return next;
    return;
  end if;

  insert into garden_events(user_id, event_type, value, intention, created_at)
    values (p_user_id, 'WATER_GARDEN', v_agua, p_intention, now());

  insert into garden_waterings(user_id, amount, intention, watered_at)
    values (p_user_id, v_agua, p_intention, now());

  update public.fruits set agua = 0, updated_at = now() where profile_id = p_user_id;
  watered := true; amount := v_agua;
  new_water_level := least(100, v_agua * 8);
  return next;
end;
$$;

grant execute on function bulk_water_garden(uuid, text) to authenticated;

-- ============================================================
--  Fix emit_spiritual_event: Ensure fruits row exists before upsert
-- ============================================================
create or replace function public.emit_spiritual_event(
  p_event_type text,
  p_value int default 1,
  p_intention text default null,
  p_vela int default 0,
  p_semilla int default 0,
  p_agua int default 0,
  p_note text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_garden_type text;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  -- Map spiritual event type to garden event type
  v_garden_type := case p_event_type
    when 'rosary-complete'    then 'ROSARY_COMPLETED'
    when 'novena-complete'    then 'NOVENA_COMPLETED'
    when 'coronilla-complete' then 'CORONILLA_COMPLETED'
    when 'task-complete'      then 'TASK_COMPLETED'
    when 'gospel-read'        then 'GOSPEL_READ'
    when 'daily-streak'       then 'STREAK_MAINTAINED'
    when 'community-join'     then 'COMMUNITY_PRAYER'
    when 'candle-lit'         then 'CANDLE_LIT'
    when 'pray-for-other'     then 'PRAY_FOR_OTHER'
    when 'water-garden'       then 'WATER_GARDEN'
    when 'read-intention'     then 'SILENCE_TIME'
    when 'reflection-finish'  then 'SILENCE_TIME'
    when 'reflection-complete' then 'REFLECTION_COMPLETED'
    when 'seed-received'      then 'SEED_RECEIVED'
    when 'water-received'     then 'WATER_RECEIVED'
    else p_event_type
  end;

  insert into garden_events(user_id, event_type, value, intention, created_at)
  values (v_user_id, v_garden_type, p_value, p_intention, now());

  if p_vela != 0 or p_semilla != 0 or p_agua != 0 then
    -- Ensure fruits row exists
    insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
    values (v_user_id, 0, 0, 0, now())
    on conflict (profile_id) do nothing;

    update public.fruits set
      vela = fruits.vela + p_vela,
      semilla = fruits.semilla + p_semilla,
      agua = fruits.agua + p_agua,
      updated_at = now()
    where profile_id = v_user_id;

    insert into fruit_history(profile_id, note, vela, semilla, agua, created_at)
    values (v_user_id, p_note, p_vela, p_semilla, p_agua, now());
  end if;
end;
$$;

grant execute on function public.emit_spiritual_event(text, int, text, int, int, int, text) to authenticated;

-- ============================================================
--  Fix commit_candle: Ensure fruits row exists
-- ============================================================
create or replace function commit_candle(p_intention text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_candle_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  insert into candles(owner_id, intention, lit_at, expires_at)
  values (v_user_id, p_intention, now(), now() + interval '24 hours')
  returning id into v_candle_id;

  insert into garden_events(user_id, event_type, value, intention, created_at)
  values (v_user_id, 'CANDLE_LIT', 1, p_intention, now());

  -- Ensure fruits row exists
  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
  values (v_user_id, 0, 0, 0, now())
  on conflict (profile_id) do nothing;

  update public.fruits set
    vela = fruits.vela - 1,
    updated_at = now()
  where profile_id = v_user_id;

  insert into fruit_history(profile_id, note, vela, semilla, agua, created_at)
  values (v_user_id, 'Encendiste una vela', -1, 0, 0, now());

  return v_candle_id;
end;
$$;

grant execute on function commit_candle(text) to authenticated;