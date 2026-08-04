-- Migration: daily_quotes
-- Tabla de citas diarias pre-cargadas para reemplazar la generación por Gemini.
-- Una fila por fecha (YYYYMMDD). Gemini ya no genera dailySpiritualPearl ni messages.

create table if not exists public.daily_quotes (
  fecha text not null check (fecha ~ '^\d{8}$') primary key,
  cita text not null,
  speaker text not null default '',
  contexto text not null default '',
  created_at timestamptz default now()
);

create index if not exists idx_daily_quotes_created_at on public.daily_quotes(created_at);
