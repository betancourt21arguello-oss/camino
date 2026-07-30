L SV-- ============================================================
--  daily_completions
--  Evita recompensas duplicadas: cada usuario solo recibe
--  recompensa UNA VEZ al día por cada tipo de evento.
-- ============================================================

create table if not exists daily_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  completed_date date not null default (timezone('America/Caracas', current_date)),
  created_at timestamptz not null default now(),
  unique (user_id, event_type, completed_date)
);

alter table daily_completions enable row level security;

create policy "Users can insert own completions"
  on daily_completions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can view own completions"
  on daily_completions for select
  to authenticated
  using (user_id = auth.uid());

create index idx_daily_completions_user_date
  on daily_completions(user_id, completed_date);

-- ============================================================
--  claim_daily_completion RPC
--  Intenta marcar una acción como completada hoy.
--  Retorna true si es la PRIMERA vez hoy (→ dar recompensa),
--  false si ya estaba completada (→ no dar recompensa).
-- ============================================================
create or replace function claim_daily_completion(
  p_event_type text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := timezone('America/Caracas', current_date);
  v_inserted boolean;
begin
  if v_user_id is null then
    raise exception 'No autorizado';
  end if;

  insert into daily_completions (user_id, event_type, completed_date)
  values (v_user_id, p_event_type, v_today)
  on conflict (user_id, event_type, completed_date) do nothing
  returning true into v_inserted;

  return coalesce(v_inserted, false);
end;
$$;

grant execute on function claim_daily_completion(text) to authenticated;