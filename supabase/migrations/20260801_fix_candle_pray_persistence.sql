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

  update public.candles
    set prayed_by = array_append(prayed_by, v_user_id)
  where id = p_candle_id
    and not (v_user_id = any(prayed_by));

  return 'ok';
end;
$$;

grant execute on function commit_gift_candle(uuid, int) to authenticated;
