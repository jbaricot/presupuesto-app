-- Ejecuta esto SOLO si ya corriste supabase/schema.sql anteriormente
-- (es decir, si tu tabla `budget` ya existe sin la columna pay_day).
-- Supabase → SQL Editor → New query → pega esto → Run.

alter table budget
  add column if not exists pay_day integer not null default 1;
