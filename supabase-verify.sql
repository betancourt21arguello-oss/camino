-- ============================================================
--  CAMINO — Supabase verification SQL
--  Ejecutar en SQL Editor para confirmar que todo está.
--  No modifica datos; solo consulta metadata y funciones.
-- ============================================================

-- 1) TABLAS ESPERADAS
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2) COLUMNAS POR TABLA (detecta faltantes)
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles','garden_events','garden_waterings','daily_liturgy',
    'devotions','sessions','participants','progress','candles',
    'intentions','chat','voice_notes','spiritual_tasks','fruits',
    'fruit_history','assets','daily_prayer_presence','push_subscriptions',
    'notification_preferences'
  )
order by table_name, ordinal_position;

-- 3) RPCs ESPERADAS
select routine_name, routine_type, routine_definition
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'ensure_daily_spiritual_tasks',
    'rosary_lobby_metrics',
    'record_spiritual_event',
    'water_garden'
  );

-- 4) RLS HABILITADO
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles','garden_events','garden_waterings','daily_liturgy',
    'devotions','sessions','participants','progress','candles',
    'intentions','chat','voice_notes','spiritual_tasks','fruits',
    'fruit_history','assets','daily_prayer_presence','push_subscriptions',
    'notification_preferences'
  );

-- 5) POLÍTICAS RLS
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles','garden_events','garden_waterings','daily_liturgy',
    'devotions','sessions','participants','progress','candles',
    'intentions','chat','voice_notes','spiritual_tasks','fruits',
    'fruit_history','assets','daily_prayer_presence','push_subscriptions',
    'notification_preferences'
  )
order by tablename, policyname;

-- 6) REPLICA EN SUPABASE REALTIME
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in (
    'profiles','garden_events','garden_waterings','daily_liturgy',
    'devotions','sessions','participants','progress','candles',
    'intentions','chat','voice_notes','spiritual_tasks','fruits',
    'fruit_history','assets','daily_prayer_presence','push_subscriptions',
    'notification_preferences'
  )
order by tablename;

-- 7) FOREIGN KEYS (confirmar relaciones)
select tc.table_name, kcu.column_name, ccu.table_name as foreign_table, ccu.column_name as foreign_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in (
    'profiles','garden_events','garden_waterings','daily_liturgy',
    'devotions','sessions','participants','progress','candles',
    'intentions','chat','voice_notes','spiritual_tasks','fruits',
    'fruit_history','assets','daily_prayer_presence','push_subscriptions',
    'notification_preferences'
  )
order by tc.table_name, kcu.column_name;
