-- ============================================================
--  INFRAESTRUCTURA DE NOTIFICACIONES (OneSignal)
--  Tablas, funciones y triggers para notificaciones push
-- ============================================================

-- 1. Notificaciones programadas (log)
create table if not exists public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  target_user_id uuid references auth.users(id) on delete cascade,
  target_all boolean not null default false,
  url text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  error text,
  created_at timestamptz default now()
);

alter table public.scheduled_notifications enable row level security;

-- Solo admin puede ver el log
create policy "admin_only_scheduled_notifications"
  on public.scheduled_notifications
  for all
  using (
    auth.role() = 'service_role'
    or exists (
      select 1 from auth.users
      where id = auth.uid()
      and raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 2. Notificaciones comunitarias (cuando alguien inicia un rosario comunitario)
create table if not exists public.community_prayer_invites (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  devotion_id text not null,
  started_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  created_at timestamptz default now()
);

alter table public.community_prayer_invites enable row level security;

-- Cualquiera puede leer invites activos
create policy "anyone_read_community_invites"
  on public.community_prayer_invites
  for select
  using (true);

-- Solo admin o service_role puede insertar
create policy "service_role_insert_community_invites"
  on public.community_prayer_invites
  for insert
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1 from auth.users
      where id = auth.uid()
      and raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 3. Función para enviar notificación de Coronilla de la Divina Misericordia (3:00 PM)
-- Esta función es llamada por un cron job externo
create or replace function public.send_coronilla_reminder()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insertamos un registro en scheduled_notifications para logging
  insert into public.scheduled_notifications (
    title,
    message,
    target_all,
    url,
    scheduled_at
  ) values (
    '🕊️ Hora de la Misericordia',
    'Son las 3:00 PM, la hora de la Divina Misericordia. Reza la Coronilla.',
    true,
    '/rosario/divina-misericordia',
    now()
  );
end;
$$;

-- 4. Función para verificar si un usuario ha regado su jardín hoy
create or replace function public.has_watered_today(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from garden_events
  where user_id = p_user_id
    and event_type = 'WATER_GARDEN'
    and created_at >= current_date
    and created_at < current_date + interval '1 day';
  
  return v_count > 0;
end;
$$;

-- 5. Función para verificar si un usuario ha rezado la Coronilla hoy
create or replace function public.has_prayed_coronilla_today(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from garden_events
  where user_id = p_user_id
    and event_type = 'CORONILLA_COMPLETED'
    and created_at >= current_date
    and created_at < current_date + interval '1 day';
  
  return v_count > 0;
end;
$$;

-- 6. Función para obtener tareas pendientes de un usuario para hoy
create or replace function public.get_pending_tasks_today(p_user_id uuid)
returns table (
  task_title text,
  task_category text,
  task_time text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select st.title, st.category, st.time
  from spiritual_tasks st
  where st.user_id = p_user_id
    and st.task_date = current_date::text
    and st.done = false
    and st.required = true
  order by st.time nulls last;
end;
$$;

-- 7. Función para enviar recordatorio de riego del jardín (8:00 PM)
-- Esta función es llamada por un cron job externo
create or replace function public.send_garden_watering_reminder()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insertamos un registro en scheduled_notifications para logging
  insert into public.scheduled_notifications (
    title,
    message,
    target_all,
    url,
    scheduled_at
  ) values (
    '🌱 Riega tu jardín espiritual',
    'Son las 8:00 PM. No olvides regar tu jardín para mantenerlo vivo.',
    true,
    '/perfil',
    now()
  );
end;
$$;

-- 8. Trigger: cuando se inicia una sesión comunitaria, registrar invitación
-- (El frontend llama a la Edge Function directamente, esto es solo para logging)
create or replace function public.log_community_prayer_start()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_devotion_title text;
begin
  -- Determinar el título según la devoción
  v_devotion_title := case
    when new.devotion_id like 'rosario-%' then 'Santo Rosario'
    when new.devotion_id = 'divina-misericordia' then 'Coronilla de la Divina Misericordia'
    else 'Oración comunitaria'
  end;

  insert into public.community_prayer_invites (
    session_id,
    devotion_id,
    started_by,
    title,
    message
  ) values (
    new.id,
    new.devotion_id,
    new.created_by,
    '📿 Oración comunitaria: ' || v_devotion_title,
    '¡Únete a la oración! ' || v_devotion_title || ' en vivo.'
  );

  return new;
end;
$$;

-- Aplicar el trigger a la tabla sessions
drop trigger if exists trg_community_prayer_start on public.sessions;
create trigger trg_community_prayer_start
  after insert on public.sessions
  for each row
  when (new.ended_at is null)
  execute function public.log_community_prayer_start();

-- 9. Función para usuarios de prueba (debug)
create or replace function public.get_onesignal_user_ids()
returns table (
  user_id uuid,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select au.id, au.email
  from auth.users au
  where au.raw_app_meta_data->>'provider' = 'email'
    and au.confirmed_at is not null
  order by au.created_at desc;
end;
$$;