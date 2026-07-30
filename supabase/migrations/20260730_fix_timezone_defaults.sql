-- ============================================================
-- Fix: Use America/Caracas timezone for date columns that default to today
-- ============================================================

-- bible_schema tables
alter table if exists public.bible_plans alter column started_at set default (timezone('America/Caracas', current_date));
alter table if exists public.bible_plan_progress alter column started_at set default (timezone('America/Caracas', current_date));
