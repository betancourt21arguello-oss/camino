-- ============================================================
--  Community public access
--  Allow anonymous (not logged in) users to read candles and
--  jornada reflections, so the comunidad tab works for everyone.
-- ============================================================

drop policy if exists "Anon can view all candles" on public.candles;
create policy "Anon can view all candles"
  on public.candles for select
  to anon
  using (true);

drop policy if exists "Anon can view all jornada reflections" on public.jornada_reflections;
create policy "Anon can view all jornada reflections"
  on public.jornada_reflections for select
  to anon
  using (true);
