-- ==============================================================================
-- MIGRACIÓN V6: Autorización de datos (Ley 1581) + eliminación de cuenta
--
-- Qué hace:
--   1. Guarda la evidencia de aceptación de Términos y Política de datos en
--      `user_access` (versión aceptada + fecha). La fecha la pone el servidor.
--   2. El trigger de usuarios nuevos lee la versión desde los metadatos del
--      registro (`terms_version`), que la app envía solo si la persona marcó
--      la casilla de aceptación.
--   3. accept_terms(version): para quien ya tenía cuenta (o cuando cambie la
--      versión de los textos) y debe aceptar antes de seguir usando la app.
--   4. delete_my_account(): borra al usuario de auth.users. Todas las tablas
--      de datos tienen `user_id ... on delete cascade`, así que se elimina
--      todo: presupuesto, categorías, transacciones, metas, aportes,
--      inversiones y acceso. Funciona también con el acceso vencido.
--
-- Requiere haber ejecutado antes migration_v5_acceso_y_rls.sql.
-- Ejecutar en: Supabase → SQL Editor → New query → Run. Es idempotente.
-- ==============================================================================

-- ---------- 1. EVIDENCIA DE ACEPTACIÓN ----------
alter table public.user_access
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

-- ---------- 2. TRIGGER DE USUARIOS NUEVOS (lee la versión aceptada) ----------
create or replace function public.handle_new_user_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_terms text := nullif(new.raw_user_meta_data ->> 'terms_version', '');
begin
  insert into public.user_access (user_id, terms_version, terms_accepted_at)
  values (new.id, v_terms, case when v_terms is not null then now() end)
  on conflict do nothing;
  return new;
end;
$$;

-- ---------- 3. ACEPTAR TÉRMINOS / POLÍTICA ----------
create or replace function public.accept_terms(p_version text)
returns public.user_access
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_access%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_version is null or length(trim(p_version)) = 0 then
    raise exception 'Versión inválida';
  end if;

  insert into public.user_access (user_id, terms_version, terms_accepted_at)
  values (v_uid, trim(p_version), now())
  on conflict (user_id) do update
    set terms_version = excluded.terms_version,
        terms_accepted_at = excluded.terms_accepted_at
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------- 4. ELIMINAR MI CUENTA Y TODOS MIS DATOS ----------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  -- ON DELETE CASCADE elimina todas las filas del usuario en las demás tablas.
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.accept_terms(text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.accept_terms(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

notify pgrst, 'reload schema';
