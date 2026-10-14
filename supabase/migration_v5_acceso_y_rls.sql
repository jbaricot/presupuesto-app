-- ==============================================================================
-- MIGRACIÓN V5: Acceso de prueba (90 días) + RLS completo
--
-- Qué hace:
--   1. Crea `user_access` (estado de acceso por usuario) y `access_codes`
--      (códigos de bono, p. ej. el del ebook).
--   2. Todo usuario nuevo nace en estado 'pending': puede iniciar sesión pero
--      NO escribir datos hasta activar un código (activate_trial).
--   3. Los usuarios que ya existen quedan como 'active' (sin vencimiento).
--   4. Reescribe las políticas RLS de las 6 tablas (incluye `investments`,
--      que no tenía política en schema.sql):
--        - LEER: siempre, solo las filas propias (así el usuario con acceso
--          vencido pasa a "solo lectura" y puede exportar sus datos).
--        - ESCRIBIR: solo con acceso 'active' o 'trial' vigente.
--
-- Ejecutar en: Supabase → SQL Editor → New query → Run.
-- Es idempotente: se puede correr más de una vez.
--
-- Después de correrla, crea el código del bono, por ejemplo:
--   insert into access_codes (code, days) values ('BONO90', 90);
-- ==============================================================================

-- ---------- 1. TABLAS ----------
create table if not exists public.access_codes (
  code text primary key,
  days integer not null default 90 check (days > 0),
  active boolean not null default true,
  max_uses integer,                        -- null = sin límite
  uses integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.access_codes enable row level security;
-- Sin políticas a propósito: nadie puede leerla desde la app, solo la función
-- activate_trial (security definer).

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'trial', 'active')),
  trial_ends_at timestamptz,
  code_used text,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.user_access enable row level security;

drop policy if exists "Users read own access" on public.user_access;
create policy "Users read own access" on public.user_access
  for select using (auth.uid() = user_id);
-- Sin políticas de insert/update/delete: el estado solo cambia vía funciones.
-- Refuerzo: además de RLS, se quitan los permisos de escritura a nivel de tabla.
revoke all on public.user_access from anon, authenticated;
grant select on public.user_access to authenticated;

-- ---------- 2. USUARIOS NUEVOS → 'pending' ----------
create or replace function public.handle_new_user_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_access (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_access on auth.users;
create trigger on_auth_user_created_access
  after insert on auth.users
  for each row execute function public.handle_new_user_access();

-- ---------- 3. USUARIOS EXISTENTES → 'active' ----------
insert into public.user_access (user_id, status, activated_at)
select id, 'active', now() from auth.users
on conflict (user_id) do nothing;

-- ---------- 4. ¿TIENE ACCESO DE ESCRITURA? ----------
create or replace function public.has_write_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_access ua
    where ua.user_id = auth.uid()
      and (ua.status = 'active' or (ua.status = 'trial' and ua.trial_ends_at > now()))
  );
$$;

-- ---------- 5. ACTIVAR EL BONO (una sola vez por usuario) ----------
create or replace function public.activate_trial(p_code text)
returns public.user_access
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code public.access_codes%rowtype;
  v_row public.user_access%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_row from public.user_access where user_id = v_uid for update;
  if not found then
    insert into public.user_access (user_id) values (v_uid) returning * into v_row;
  end if;

  -- Si ya activó antes (o ya es 'active'), no se reinicia el plazo.
  if v_row.status <> 'pending' then
    return v_row;
  end if;

  select * into v_code from public.access_codes
  where lower(code) = lower(trim(p_code)) and active
  for update;

  if not found or (v_code.max_uses is not null and v_code.uses >= v_code.max_uses) then
    raise exception 'Código inválido o agotado';
  end if;

  update public.access_codes set uses = uses + 1 where code = v_code.code;

  update public.user_access
  set status = 'trial',
      trial_ends_at = now() + make_interval(days => v_code.days),
      code_used = v_code.code,
      activated_at = now()
  where user_id = v_uid
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.activate_trial(text) from public, anon;
grant execute on function public.activate_trial(text) to authenticated;
grant execute on function public.has_write_access() to authenticated;

-- ---------- 6. RLS DE LAS TABLAS DE DATOS ----------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['budget', 'categories', 'transactions', 'goals', 'goal_contributions', 'investments']
  loop
    execute format('alter table public.%I enable row level security', t);

    -- Quita cualquier política anterior (cualquiera sea su nombre)
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)',
      t || '_select_own', t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id and (select public.has_write_access()))',
      t || '_insert_own', t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id and (select public.has_write_access())) with check (auth.uid() = user_id and (select public.has_write_access()))',
      t || '_update_own', t);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id and (select public.has_write_access()))',
      t || '_delete_own', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
