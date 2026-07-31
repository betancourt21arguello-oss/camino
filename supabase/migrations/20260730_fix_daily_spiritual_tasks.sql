create or replace function public.ensure_daily_spiritual_tasks(
  p_date text,
  p_is_sunday boolean,
  p_is_solemnity boolean,
  p_is_fasting_day boolean,
  p_day_of_month int,
  p_is_last_day_of_month boolean
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
    (v_user_id, 'Ofrecimiento matutino', 'ofrecimiento', 'daily', '06:30', true, false, p_date),
    (v_user_id, 'Laudes (oración de la mañana)', 'laudes', 'daily', '07:00', true, false, p_date),
    (v_user_id, 'Lectura del Evangelio del día', 'gospel', 'daily', '08:00', true, false, p_date),
    (v_user_id, 'Salmo del día', 'psalm', 'daily', '08:10', true, false, p_date),
    (v_user_id, 'Primera lectura', 'first_reading', 'daily', '08:20', true, false, p_date),
    (v_user_id, 'Segunda lectura', 'second_reading', 'daily', '08:30', true, false, p_date),
    (v_user_id, 'Oración mental o silencio', 'silence', 'daily', '09:00', true, false, p_date),
    (v_user_id, 'Ángelus', 'angelus', 'daily', '12:00', true, false, p_date),
    (v_user_id, 'Santo Rosario', 'rosary', 'daily', '20:00', true, false, p_date),
    (v_user_id, 'Examen de conciencia', 'examen', 'daily', '21:00', true, false, p_date)
  on conflict (profile_id, task_date, category) do nothing;

  if p_is_sunday or p_is_solemnity then
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
    values (v_user_id, 'Santa Misa dominical', 'mass', 'weekly', '10:00', true, false, p_date)
    on conflict (profile_id, task_date, category) do nothing;
  end if;

  if p_is_fasting_day then
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
    values (v_user_id, 'Ayuno de hábito o de alimento', 'fasting', 'weekly', '06:00', true, false, p_date)
    on conflict (profile_id, task_date, category) do nothing;
  end if;

  if p_is_last_day_of_month then
    insert into public.spiritual_tasks(profile_id, title, category, cadence, time, required, done, task_date)
    values (v_user_id, 'Confesión o guía espiritual', 'confession', 'monthly', null, true, false, p_date)
    on conflict (profile_id, task_date, category) do nothing;
  end if;
end;
$$;

grant execute on function public.ensure_daily_spiritual_tasks(text, boolean, boolean, boolean, int, boolean) to authenticated;
