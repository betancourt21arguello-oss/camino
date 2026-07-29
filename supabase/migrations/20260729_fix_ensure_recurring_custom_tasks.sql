-- Fix: ensure_recurring_custom_tasks was missing from Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/asfqkirsogozshlzcfpe/editor

create or replace function public.ensure_recurring_custom_tasks(p_date text)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  custom_task record;
  day_of_week int;
  day_of_month int;
  should_insert boolean;
begin
  if v_user_id is null then
    raise exception 'No autorizado para realizar esta acción';
  end if;

  day_of_week := extract(dow from p_date::date)::int;
  day_of_month := extract(day from p_date::date)::int;

  for custom_task in
    select * from public.spiritual_tasks
    where profile_id = v_user_id
      and category = 'custom'
      and cadence in ('daily', 'weekly', 'monthly')
      and task_date <= p_date
  loop
    should_insert := false;

    if custom_task.cadence = 'daily' then
      should_insert := true;
    elsif custom_task.cadence = 'weekly' then
      if custom_task.days is null or array_length(custom_task.days, 1) = 0 or custom_task.days @> array[day_of_week] then
        should_insert := true;
      end if;
    elsif custom_task.cadence = 'monthly' then
      if custom_task.days is null or array_length(custom_task.days, 1) = 0 or custom_task.days @> array[day_of_month] then
        should_insert := true;
      end if;
    end if;

    if should_insert then
      insert into public.spiritual_tasks(profile_id, title, category, cadence, time, task_date, days, required, done)
      values (v_user_id, custom_task.title, 'custom', custom_task.cadence, custom_task.time, p_date, custom_task.days, false, false)
      on conflict (profile_id, task_date, category) do nothing;
    end if;
  end loop;
end;
$$;

grant execute on function public.ensure_recurring_custom_tasks(text) to authenticated;
