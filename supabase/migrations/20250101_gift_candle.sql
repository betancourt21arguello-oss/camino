create or replace function gift_candle(p_candle_id uuid, p_amount int)
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

  null;
end;
$$;

grant execute on function gift_candle(uuid, int) to authenticated;
