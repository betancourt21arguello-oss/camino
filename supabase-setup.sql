-- ============================================================
--  CAMINO — Supabase setup SQL
--  Ejecutar en SQL Editor para crear tablas de notificaciones.
-- ============================================================

-- 1) Tabla push_subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  channel text default 'web',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Tabla notification_preferences
create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email_reminders boolean default true,
  push_reminders boolean default true,
  laudes_time text default '07:00',
  angelus_time text default '12:00',
  rosary_time text default '20:00',
  updated_at timestamptz default now()
);

-- 3) Verificación rápida
select tablename
from pg_tables
where schemaname = 'public'
  and tablename in ('push_subscriptions', 'notification_preferences')
order by tablename;

-- 4) Columnas creadas
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('push_subscriptions', 'notification_preferences')
order by table_name, ordinal_position;
