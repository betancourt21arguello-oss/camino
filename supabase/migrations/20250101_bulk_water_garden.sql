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
  insert into garden_events(user_id, event_type, value, intention)
    values (p_user_id, 'WATER_GARDEN', v_agua, p_intention);
  update fruits set agua = 0, updated_at = now() where profile_id = p_user_id;
  watered := true; amount := v_agua;
  new_water_level := least(100, v_agua * 8);
  return next;
end;
$$;

grant execute on function bulk_water_garden(uuid, text) to authenticated;