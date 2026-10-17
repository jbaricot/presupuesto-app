-- ==============================================================================
-- MIGRACIÓN V7: alinear el esquema del repo con el de producción + endurecer
--
-- Qué hace (todo idempotente; en tu base ya existente casi todo es un no-op):
--   1. `budget`: agrega `imprevistos` y `emergency_fund_platforms`, que la app
--      ya usa pero no estaban en ninguna migración del repo. Sin estas
--      columnas, guardar Presupuesto falla en un proyecto nuevo.
--   2. `transactions`: el CHECK de tipos incluye 'imprevistos'.
--   3. Cierra la ejecución pública de la función del trigger de usuarios
--      nuevos (la auditoría de seguridad la marcaba como REVISAR) y reafirma
--      que los usuarios autenticados SÍ pueden ejecutar las funciones que
--      la app necesita (has_write_access, activate_trial, accept_terms,
--      delete_my_account).
--   4. `access_codes`: política explícita que niega la lectura directa
--      (el comportamiento no cambia; silencia el aviso del linter de Supabase).
--
-- Requiere haber ejecutado antes las migraciones v5 y v6.
-- Ejecutar en: Supabase → SQL Editor → New query → Run.
-- ==============================================================================

alter table public.budget add column if not exists imprevistos numeric default 0;
alter table public.budget add column if not exists emergency_fund_platforms text;

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('ingreso', 'gastos_esenciales', 'gastos_no_esenciales', 'credito', 'provision', 'imprevistos'));

revoke all on function public.handle_new_user_access() from public, anon, authenticated;

-- Reafirma los permisos de ejecución que la app necesita. Las políticas RLS
-- llaman a has_write_access() con el rol del usuario: si `authenticated` no
-- puede ejecutarla, TODA escritura falla con
-- "permission denied for function has_write_access".
grant execute on function public.has_write_access() to authenticated;
grant execute on function public.activate_trial(text) to authenticated;
grant execute on function public.accept_terms(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

drop policy if exists "Sin acceso directo" on public.access_codes;
create policy "Sin acceso directo" on public.access_codes for select using (false);

notify pgrst, 'reload schema';
