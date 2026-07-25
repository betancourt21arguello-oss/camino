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

  insert into garden_events(user_id, event_type, value, intention)
    values (v_user_id, 'WATER_GARDEN', 1, p_intention);
  update fruits set agua = agua - 1, updated_at = now() where profile_id = v_user_id;
end;
$$;

grant execute on function water_garden(text) to authenticated;
