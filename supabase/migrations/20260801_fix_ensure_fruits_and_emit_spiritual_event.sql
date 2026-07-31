-- ============================================================
-- Fix: ensure_fruits return syntax, emit_spiritual_event ordering,
-- and garden_events FK constraint
-- ============================================================

-- Fix ensure_fruits to properly return values
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

  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
    values (v_user_id, 0, 0, 0, now())
    on conflict (profile_id) do nothing;

  select vela, semilla, agua into v_balance
  from public.fruits
  where profile_id = v_user_id;

  return next v_balance;
end;
$$;

grant execute on function public.ensure_fruits() to authenticated;

-- Fix emit_spiritual_event: ensure fruits row exists BEFORE inserting garden event
-- This handles the case where garden_events.user_id references fruits.profile_id
create or replace function public.emit_spiritual_event(
  p_event_type text,
  p_value int default 1,
  p_intention text default null,
  p_vela int default 0,
  p_semilla int default 0,
  p_agua int default 0,
  p_note text default null
)
returns text
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

  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
    values (v_user_id, 0, 0, 0, now())
    on conflict (profile_id) do nothing;

  insert into public.garden_events(user_id, event_type, value, intention, created_at)
  values (v_user_id, v_garden_type, p_value, p_intention, now());

  if p_vela != 0 or p_semilla != 0 or p_agua != 0 then
    update public.fruits set
      vela = fruits.vela + p_vela,
      semilla = fruits.semilla + p_semilla,
      agua = fruits.agua + p_agua,
      updated_at = now()
    where profile_id = v_user_id;

    insert into public.fruit_history(profile_id, note, vela, semilla, agua, created_at)
    values (v_user_id, p_note, p_vela, p_semilla, p_agua, now());
  end if;
  
  return 'ok';
end;
$$;

grant execute on function public.emit_spiritual_event(text, int, text, int, int, int, text) to authenticated;

-- Fix garden_events FK to ensure it references auth.users(id)
-- Drop existing constraint and recreate with correct reference
-- Use NOT VALID to avoid failing on existing data that may have been
-- inserted before the FK was properly set
alter table public.garden_events drop constraint if exists garden_events_user_id_fkey;
alter table public.garden_events
  add constraint garden_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
