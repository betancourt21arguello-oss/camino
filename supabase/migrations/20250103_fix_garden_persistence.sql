create or replace function emit_spiritual_event(
  p_event_type text,
  p_value int default 1,
  p_intention text default null,
  p_vela int default 0,
  p_semilla int default 0,
  p_agua int default 0,
  p_note text default null
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
  values (v_user_id, p_event_type, p_value, p_intention, now());

  if p_vela != 0 or p_semilla != 0 or p_agua != 0 then
    insert into fruits(profile_id, vela, semilla, agua, updated_at)
    values (v_user_id, p_vela, p_semilla, p_agua, now())
    on conflict (profile_id) do update set
      vela = fruits.vela + p_vela,
      semilla = fruits.semilla + p_semilla,
      agua = fruits.agua + p_agua,
      updated_at = now();

    insert into fruit_history(profile_id, note, vela, semilla, agua, created_at)
    values (v_user_id, p_note, p_vela, p_semilla, p_agua, now());
  end if;
end;
$$;

grant execute on function emit_spiritual_event(text, int, text, int, int, int, text) to authenticated;

create or replace function commit_candle(
  p_intention text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_candle_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  insert into candles(owner_id, intention, lit_at, expires_at)
  values (v_user_id, p_intention, now(), now() + interval '24 hours')
  returning id into v_candle_id;

  insert into garden_events(user_id, event_type, value, intention, created_at)
  values (v_user_id, 'CANDLE_LIT', 1, p_intention, now());

  insert into fruits(profile_id, vela, semilla, agua, updated_at)
  values (v_user_id, -1, 0, 0, now())
  on conflict (profile_id) do update set
    vela = fruits.vela - 1,
    updated_at = now();

  insert into fruit_history(profile_id, note, vela, semilla, agua, created_at)
  values (v_user_id, 'Encendiste una vela', -1, 0, 0, now());

  return v_candle_id;
end;
$$;

grant execute on function commit_candle(text) to authenticated;

create or replace function commit_gift_candle(
  p_candle_id uuid,
  p_amount int default 1
)
returns void
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

  insert into garden_events(user_id, event_type, value, created_at)
  values (v_user_id, 'PRAY_FOR_OTHER', p_amount, now());

  insert into fruits(profile_id, vela, semilla, agua, updated_at)
  values (v_user_id, -p_amount, 0, 0, now())
  on conflict (profile_id) do update set
    vela = fruits.vela - p_amount,
    updated_at = now();

  insert into fruits(profile_id, vela, semilla, agua, updated_at)
  values (v_owner_id, p_amount, 0, 0, now())
  on conflict (profile_id) do update set
    vela = fruits.vela + p_amount,
    updated_at = now();

  insert into fruit_history(profile_id, note, vela, semilla, agua, created_at)
  values (v_user_id, 'Regalaste una vela', -p_amount, 0, 0, now());

  insert into fruit_history(profile_id, note, vela, semilla, agua, created_at)
  values (v_owner_id, 'Recibiste una vela regalada', p_amount, 0, 0, now());
end;
$$;

grant execute on function commit_gift_candle(uuid, int) to authenticated;

create table if not exists garden_waterings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount int not null default 1,
  intention text default 'Paz',
  watered_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table garden_waterings enable row level security;

create policy "Users can insert own waterings"
  on garden_waterings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can view own waterings"
  on garden_waterings for select
  to authenticated
  using (user_id = auth.uid());

create index idx_garden_waterings_user_id on garden_waterings(user_id);

create table if not exists fruit_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  note text not null,
  vela int default 0,
  semilla int default 0,
  agua int default 0,
  created_at timestamptz default now()
);

alter table fruit_history enable row level security;

create policy "Users can view own history"
  on fruit_history for select
  to authenticated
  using (profile_id = auth.uid());

create policy "Users can insert own history"
  on fruit_history for insert
  to authenticated
  with check (profile_id = auth.uid());

create index idx_fruit_history_profile_id on fruit_history(profile_id);
