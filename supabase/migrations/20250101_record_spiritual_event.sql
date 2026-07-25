create or replace function record_spiritual_event(
  p_event_type text,
  p_value int,
  p_meta jsonb default '{}'::jsonb
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

  insert into garden_events(user_id, event_type, value, intention, created_at)
  values (
    v_user_id,
    p_event_type,
    p_value,
    coalesce(p_meta->>'intention', null),
    now()
  );
end;
$$;

grant execute on function record_spiritual_event(text, int, jsonb) to authenticated;
