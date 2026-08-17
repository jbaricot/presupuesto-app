-- ============================================================
-- Migración: soporte para sub-metas, vínculo automático
-- (Provisión → Meta/Inversión) e inversiones por plataforma.
--
-- Ejecuta esto en: Supabase → SQL Editor → New query → Run.
-- Es seguro correrlo aunque ya tengas datos: todas las columnas
-- se agregan con "if not exists" y valores por defecto que no
-- rompen filas existentes.
-- ============================================================

-- ---------- METAS: soporte de sub-metas ----------
alter table goals
  add column if not exists parent_goal_id uuid references goals(id) on delete cascade;

-- ---------- APORTES A METAS: vínculo con su transacción de origen ----------
alter table goal_contributions
  add column if not exists transaction_id uuid references transactions(id) on delete set null;

-- ---------- INVERSIONES: seguimiento por plataforma (Nubank, Skandia, etc.) ----------
alter table investments
  add column if not exists platform text default 'General',
  add column if not exists aporte numeric default 0,
  add column if not exists retiros numeric default 0,
  add column if not exists rendimientos numeric default 0,
  add column if not exists costos numeric default 0,
  add column if not exists transaction_id uuid references transactions(id) on delete set null;
