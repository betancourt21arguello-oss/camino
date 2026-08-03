-- Migration: oraciones_transcripts
-- Añade columnas JSONB para almacenar los transcripts de los videos
-- de Laudes, Vísperas y Completas extraídos del feed RSS de YouTube.
ALTER TABLE public.oraciones_diarias
  ADD COLUMN IF NOT EXISTS laudes_transcript jsonb,
  ADD COLUMN IF NOT EXISTS visperas_transcript jsonb,
  ADD COLUMN IF NOT EXISTS completas_transcript jsonb;