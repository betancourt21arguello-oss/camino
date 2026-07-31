-- ============================================================
--  Admin RPC: ajustar recuentos de eventos del jardín
--  Inserta o elimina eventos para igualar el recuento objetivo.
-- ============================================================

create or replace function admin_adjust_garden_counts(
  p_target_user_id uuid,
  p_event_type text,
  p_target_count int
)
returns void
language plpgsql
security definer
as $$
declare
  v_current_count int;
  v_diff int;
begin
  if not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Acceso denegado: Se requieren permisos de administrador';
  end if;

  if p_target_count < 0 then
    raise exception 'El recuento objetivo no puede ser negativo';
  end if;

  select count(*) into v_current_count
  from garden_events
  where user_id = p_target_user_id
    and event_type = p_event_type;

  v_diff := p_target_count - v_current_count;

  if v_diff > 0 then
    for i in 1..v_diff loop
      insert into garden_events(user_id, event_type, value, intention, created_at)
        values (p_target_user_id, p_event_type, 1, 'Ajuste manual por admin', now());
    end loop;
  elsif v_diff < 0 then
    delete from garden_events
    where id in (
      select id
      from garden_events
      where user_id = p_target_user_id
        and event_type = p_event_type
      order by created_at asc
      limit abs(v_diff)
    );
  end if;
end;
$$;

grant execute on function admin_adjust_garden_counts(uuid, text, int) to authenticated;
