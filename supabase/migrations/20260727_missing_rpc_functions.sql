create or replace function public.ensure_daily_spiritual_tasks(
  p_date text,
  p_is_sunday boolean,
  p_is_solemnity boolean,
  p_is_fasting_day boolean,
  p_day_of_month int
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

  insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
  values
    (v_user_id, 'Ofrecimiento del día', 'ofrecimiento', 'daily', '07:00', true, false, p_date),
    (v_user_id, 'Evangelio del día', 'gospel', 'daily', null, true, false, p_date),
    (v_user_id, 'Salmo del día', 'psalm', 'daily', null, true, false, p_date)
  on conflict (profile_id, task_date, category) do nothing;

  if p_is_sunday or p_is_solemnity then
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
    values (v_user_id, 'Misa dominical', 'mass', 'weekly', null, true, false, p_date)
    on conflict (profile_id, task_date, category) do nothing;
  end if;

  if p_is_fasting_day then
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
    values (v_user_id, 'Ayuno y abstinencia', 'fasting', 'daily', null, false, false, p_date)
    on conflict (profile_id, task_date, category) do nothing;
  end if;

  if p_day_of_month = 1 then
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
    values (v_user_id, 'Examen de conciencia mensual', 'examen', 'monthly', null, false, false, p_date)
    on conflict (profile_id, task_date, category) do nothing;
  end if;
end;
$$;

grant execute on function public.ensure_daily_spiritual_tasks(text, boolean, boolean, boolean, int) to authenticated;

create or replace function public.rosary_lobby_metrics()
returns table(
  total int,
  community int,
  solo int
)
language sql
security definer
as $$
  select
    count(*) as total,
    count(*) filter (where mode = 'community') as community,
    count(*) filter (where mode = 'solo') as solo
  from public.prayer_rooms
  where status = 'running'
    and started_at > now() - interval '2 hours';
$$;

grant execute on function public.rosary_lobby_metrics() to authenticated;

create or replace function public.active_prayer_rooms()
returns table(
  id uuid,
  devotion_id text,
  mode text,
  status text,
  participants int,
  started_at timestamptz
)
language sql
security definer
as $$
  select
    id,
    devotion_id,
    mode,
    status,
    participants,
    started_at
  from public.prayer_rooms
  where status = 'running'
    and started_at > now() - interval '2 hours'
  order by started_at desc
  limit 50;
$$;

grant execute on function public.active_prayer_rooms() to authenticated;
