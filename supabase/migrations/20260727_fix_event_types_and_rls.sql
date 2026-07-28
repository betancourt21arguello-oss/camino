-- ============================================================
--  Fix: emit_spiritual_event stores garden event type
--  The RPC receives spiritual event types (e.g. "rosary-complete")
--  but should store garden event types (e.g. "ROSARY_COMPLETED")
--  in the garden_events table for consistency with other RPCs.
-- ============================================================

create or replace function public.emit_spiritual_event(
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
  v_garden_type text;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  -- Map spiritual event type to garden event type
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
    else p_event_type -- fallback: store as-is
  end;

  insert into garden_events(user_id, event_type, value, intention, created_at)
  values (v_user_id, v_garden_type, p_value, p_intention, now());

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

grant execute on function public.emit_spiritual_event(text, int, text, int, int, int, text) to authenticated;

-- ============================================================
--  RLS policies for candles
-- ============================================================

alter table candles enable row level security;

drop policy if exists "Users can insert own candles" on candles;
create policy "Users can insert own candles"
  on candles for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Users can view all candles" on candles;
create policy "Users can view all candles"
  on candles for select
  to authenticated
  using (true);

drop policy if exists "Users can update own candles" on candles;
create policy "Users can update own candles"
  on candles for update
  to authenticated
  using (owner_id = auth.uid());

-- ============================================================
--  RLS policies for intentions
-- ============================================================

alter table intentions enable row level security;

drop policy if exists "Users can insert own intentions" on intentions;
create policy "Users can insert own intentions"
  on intentions for insert
  to authenticated
  with check (pray_for_id = auth.uid());

drop policy if exists "Users can view intentions for their candles" on intentions;
create policy "Users can view intentions for their candles"
  on intentions for select
  to authenticated
  using (
    candle_id in (
      select id from candles where owner_id = auth.uid()
    )
  );

-- ============================================================
--  RLS policies for prayer_rooms
-- ============================================================

alter table prayer_rooms enable row level security;

drop policy if exists "Users can insert own prayer rooms" on prayer_rooms;
create policy "Users can insert own prayer rooms"
  on prayer_rooms for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Users can view active prayer rooms" on prayer_rooms;
create policy "Users can view active prayer rooms"
  on prayer_rooms for select
  to authenticated
  using (true);

drop policy if exists "Users can update own prayer rooms" on prayer_rooms;
create policy "Users can update own prayer rooms"
  on prayer_rooms for update
  to authenticated
  using (created_by = auth.uid());

-- ============================================================
--  RLS policies for garden_events
-- ============================================================

alter table garden_events enable row level security;

drop policy if exists "Users can insert own garden events" on garden_events;
create policy "Users can insert own garden events"
  on garden_events for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can view own garden events" on garden_events;
create policy "Users can view own garden events"
  on garden_events for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
--  RLS policies for fruits
-- ============================================================

alter table fruits enable row level security;

drop policy if exists "Users can view own fruits" on fruits;
create policy "Users can view own fruits"
  on fruits for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "Users can update own fruits" on fruits;
create policy "Users can update own fruits"
  on fruits for update
  to authenticated
  using (profile_id = auth.uid());