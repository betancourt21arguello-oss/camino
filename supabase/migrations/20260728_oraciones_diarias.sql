-- Migration: oraciones_diarias
-- Tabla para almacenar las URLs de video de Laudes, Vísperas y Completas
-- extraídas del feed RSS de YouTube del canal Cathopray.
CREATE TABLE IF NOT EXISTS public.oraciones_diarias (
  fecha date PRIMARY KEY,
  laudes text,
  visperas text,
  completas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.oraciones_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.oraciones_diarias
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access" ON public.oraciones_diarias
  FOR SELECT USING (true);
