-- Migration: liturgy_cache
-- Cache de lecturas litúrgicas desde evangelizo.org para reducir llamadas a Gemini.
-- Clave primaria compuesta: (date_key, locale)

create table if not exists public.liturgy_cache (
  date_key text not null check (date_key ~ '^\d{8}$'),
  locale text not null default 'es',
  gospel text not null default '',
  first_reading text not null default '',
  psalm text not null default '',
  saint text not null default '',
  raw_source jsonb,
  source text check (source in ('cache', 'evangelizo', 'fallback')),
  confidence integer default 80,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (date_key, locale)
);

create index if not exists idx_liturgy_cache_locale on public.liturgy_cache(locale);
create index if not exists idx_liturgy_cache_created_at on public.liturgy_cache(created_at);

drop trigger if exists set_updated_at on public.liturgy_cache;
create trigger set_updated_at before update on public.liturgy_cache
  for each row execute function public.trigger_set_timestamp();
