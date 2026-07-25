create or replace function admin_insert_compensatory_event(
  p_target_user_id uuid,
  p_event_type text,
  p_value int,
  p_intention text,
  p_created_at timestamptz default now()
)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Acceso denegado: Se requieren permisos de administrador';
  end if;

  insert into garden_events(user_id, event_type, value, intention, created_at)
    values (p_target_user_id, p_event_type, p_value, p_intention, coalesce(p_created_at, now()));
end;
$$;

grant execute on function admin_insert_compensatory_event(uuid, text, int, text, timestamptz) to authenticated;