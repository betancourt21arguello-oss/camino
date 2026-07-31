-- ============================================================
--  Fix: water_garden returns void causing null data responses
--  and potential Supabase JS client issues with void returns.
--  Also ensures public schema prefix consistency and fixes
--  related RPCs (ensure_fruits, emit_spiritual_event,
--  commit_gift_candle) to return proper values.
-- ============================================================

create or replace function water_garden(p_intention text)
returns int  -- returns the new agua balance
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_agua int;
  v_new_agua int;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
    values (v_user_id, 0, 0, 0, now())
    on conflict (profile_id) do nothing;

  select agua into v_agua from public.fruits where profile_id = v_user_id for update;
  if v_agua is null or v_agua <= 0 then
    raise exception 'No tienes agua disponible';
  end if;

  insert into public.garden_events(user_id, event_type, value, intention, created_at)
    values (v_user_id, 'WATER_GARDEN', 1, p_intention, now());

  insert into public.garden_waterings(user_id, amount, intention, watered_at)
    values (v_user_id, 1, p_intention, now());

  update public.fruits set agua = agua - 1, updated_at = now() where profile_id = v_user_id
    returning agua into v_new_agua;

  return v_new_agua;
end;
$$;

grant execute on function water_garden(text) to authenticated;

-- Also fix bulk_water_garden to return new agua level
create or replace function bulk_water_garden(p_user_id uuid, p_intention text)
returns table(watered boolean, amount int, new_water_level int)
language plpgsql
security definer
as $$
declare
  v_agua int;
  v_new_water int;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
    values (p_user_id, 0, 0, 0, now())
    on conflict (profile_id) do nothing;

  select agua into v_agua from public.fruits where profile_id = p_user_id for update;
  if v_agua is null or v_agua <= 0 then
    watered := false; amount := 0; new_water_level := 0; return next;
    return;
  end if;

  insert into public.garden_events(user_id, event_type, value, intention, created_at)
    values (p_user_id, 'WATER_GARDEN', v_agua, p_intention, now());

  insert into public.garden_waterings(user_id, amount, intention, watered_at)
    values (p_user_id, v_agua, p_intention, now());

  update public.fruits set agua = 0, updated_at = now() where profile_id = p_user_id
    returning agua into v_new_water;

  watered := true; amount := v_agua;
  new_water_level := least(100, v_agua * 8);
  return next;
end;
$$;

grant execute on function bulk_water_garden(uuid, text) to authenticated;

-- Fix ensure_fruits to properly return a value
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

  return next v_balance.vela, v_balance.semilla, v_balance.agua;
  return;
end;
$$;

grant execute on function public.ensure_fruits() to authenticated;

-- Fix emit_spiritual_event to return text instead of void
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

  insert into public.garden_events(user_id, event_type, value, intention, created_at)
  values (v_user_id, v_garden_type, p_value, p_intention, now());

  if p_vela != 0 or p_semilla != 0 or p_agua != 0 then
    insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
      values (v_user_id, 0, 0, 0, now())
      on conflict (profile_id) do nothing;

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

-- Fix commit_gift_candle to return text instead of void
create or replace function commit_gift_candle(p_candle_id uuid, p_amount int)
returns text
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  select owner_id into v_owner_id from candles where id = p_candle_id;
  if v_owner_id is null then
    raise exception 'Vela no encontrada';
  end if;

  insert into intentions(candle_id, pray_for_id)
    values (p_candle_id, v_user_id);

  insert into public.garden_events(user_id, event_type, value, created_at)
    values (v_user_id, 'PRAY_FOR_OTHER', p_amount, now());

  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
    values (v_user_id, -p_amount, 0, 0, now())
    on conflict (profile_id) do update set
      vela = fruits.vela - p_amount,
      updated_at = now();

  insert into public.fruits(profile_id, vela, semilla, agua, updated_at)
    values (v_owner_id, p_amount, 0, 0, now())
    on conflict (profile_id) do update set
      vela = fruits.vela + p_amount,
      updated_at = now();

  insert into public.fruit_history(profile_id, note, vela, semilla, agua, created_at)
    values (v_user_id, 'Regalaste una vela', -p_amount, 0, 0, now());

  insert into public.fruit_history(profile_id, note, vela, semilla, agua, created_at)
    values (v_owner_id, 'Recibiste una vela regalada', p_amount, 0, 0, now());
    
  return 'ok';
end;
$$;

grant execute on function commit_gift_candle(uuid, int) to authenticated;
