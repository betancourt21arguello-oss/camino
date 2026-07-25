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

  select agua into v_agua from fruits where profile_id = v_user_id for update;
  if v_agua is null or v_agua <= 0 then
    raise exception 'No tienes agua disponible';
  end if;

  insert into garden_events(user_id, event_type, value, intention, created_at)
    values (v_user_id, 'WATER_GARDEN', 1, p_intention, now());

  insert into garden_waterings(user_id, amount, intention, watered_at)
    values (v_user_id, 1, p_intention, now());

  update fruits set agua = agua - 1, updated_at = now() where profile_id = v_user_id;
end;
$$;

grant execute on function water_garden(text) to authenticated;

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

  select agua into v_agua from fruits where profile_id = p_user_id for update;
  if v_agua is null or v_agua <= 0 then
    watered := false; amount := 0; new_water_level := 0; return next;
    return;
  end if;

  insert into garden_events(user_id, event_type, value, intention, created_at)
    values (p_user_id, 'WATER_GARDEN', v_agua, p_intention, now());

  insert into garden_waterings(user_id, amount, intention, watered_at)
    values (p_user_id, v_agua, p_intention, now());

  update fruits set agua = 0, updated_at = now() where profile_id = p_user_id;
  watered := true; amount := v_agua;
  new_water_level := least(100, v_agua * 8);
  return next;
end;
$$;

grant execute on function bulk_water_garden(uuid, text) to authenticated;
