-- ============================================================
-- Migración: identificar cuáles plataformas de inversión forman tu
-- "fondo de emergencia" (puede ser una sola o varias, ej. Skandia +
-- Colfondos), para que el indicador "Meses de reserva cubiertos" del
-- Panorama use el dato correcto en vez de adivinar con el último
-- registro de cualquier plataforma.
--
-- Ejecuta esto en: Supabase → SQL Editor → New query → Run.
-- ============================================================

alter table budget
  add column if not exists emergency_fund_platforms text;
