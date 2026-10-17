with
tablas_datos(t) as (values ('budget'),('categories'),('transactions'),('goals'),('goal_contributions'),('investments')),
funciones(f) as (values ('has_write_access()'),('activate_trial(text)'),('accept_terms(text)'),('delete_my_account()'),('handle_new_user_access()'))
select '1. RLS activo en TODAS las tablas de public' as chequeo,
       case when count(*) = 0 then 'OK' else 'REVISAR' end as resultado,
       coalesce(string_agg(c.relname, ', '), 'ninguna sin RLS') as detalle
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
union all
select '2. Cada tabla de datos tiene 4 políticas (select/insert/update/delete)',
       case when count(*) filter (where cnt = 4) = 6 then 'OK' else 'REVISAR' end,
       string_agg(t || '=' || cnt, ', ' order by t)
from (select td.t, count(p.policyname) as cnt from tablas_datos td left join pg_policies p on p.schemaname='public' and p.tablename = td.t and p.cmd in ('SELECT','INSERT','UPDATE','DELETE') group by td.t) x
union all
select '3. Ninguna política abierta (using true / ALL) en tablas de datos',
       case when count(*) = 0 then 'OK' else 'REVISAR' end,
       coalesce(string_agg(tablename || '.' || policyname, ', '), 'ninguna')
from pg_policies
where schemaname='public' and tablename in (select t from tablas_datos)
  and (cmd = 'ALL' or coalesce(qual,'') = 'true' or coalesce(with_check,'') = 'true')
union all
select '4. Escribir exige acceso vigente (insert/update/delete usan has_write_access)',
       case when count(*) = 18 then 'OK' else 'REVISAR' end,
       count(*) || ' de 18 políticas de escritura lo exigen'
from pg_policies
where schemaname='public' and tablename in (select t from tablas_datos) and cmd in ('INSERT','UPDATE','DELETE')
  and (coalesce(qual,'') || coalesce(with_check,'')) like '%has_write_access%'
union all
select '5. user_access: el usuario no puede escribir (solo leer)',
       case when not (has_table_privilege('authenticated','public.user_access','INSERT')
                   or has_table_privilege('authenticated','public.user_access','UPDATE')
                   or has_table_privilege('authenticated','public.user_access','DELETE')
                   or has_table_privilege('anon','public.user_access','SELECT')) then 'OK' else 'REVISAR' end,
       'permisos a nivel de tabla para authenticated / anon'
union all
select '6. access_codes: RLS activo y sin políticas permisivas',
       case when (select relrowsecurity from pg_class where oid = 'public.access_codes'::regclass)
              and not exists (select 1 from pg_policies where schemaname='public' and tablename='access_codes' and coalesce(qual,'') <> 'false') then 'OK' else 'REVISAR' end,
       'los códigos del bono no se pueden leer desde la app'
union all
select '7. Funciones sensibles no ejecutables por visitantes (anon)',
       case when count(*) = 0 then 'OK' else 'REVISAR' end,
       coalesce(string_agg(f, ', '), 'ninguna expuesta')
from funciones where f <> 'has_write_access()' and has_function_privilege('anon', ('public.' || f)::regprocedure, 'EXECUTE')
union all
select '8. Funciones SECURITY DEFINER con search_path fijo',
       case when count(*) = 0 then 'OK' else 'REVISAR' end,
       coalesce(string_agg(p.proname, ', '), 'todas fijas')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.prosecdef and p.proname in ('has_write_access','activate_trial','accept_terms','delete_my_account','handle_new_user_access')
  and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')
union all
select '9. Existen las 5 funciones (migraciones v5 y v6)',
       case when count(*) = 5 then 'OK' else 'REVISAR' end,
       count(*) || ' de 5'
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname in ('has_write_access','activate_trial','accept_terms','delete_my_account','handle_new_user_access')
union all
select '10. Trigger que crea el acceso de cada usuario nuevo',
       case when exists (select 1 from pg_trigger where tgname='on_auth_user_created_access' and not tgisinternal) then 'OK' else 'REVISAR' end,
       'on_auth_user_created_access en auth.users'
union all
select '11. Columnas de consentimiento en user_access',
       case when count(*) = 2 then 'OK' else 'REVISAR' end,
       coalesce(string_agg(column_name, ', '), 'faltan: ejecuta la migración v6')
from information_schema.columns
where table_schema='public' and table_name='user_access' and column_name in ('terms_version','terms_accepted_at')
union all
select '12. Todo usuario tiene su fila de acceso',
       case when count(*) = 0 then 'OK' else 'REVISAR' end,
       count(*) || ' usuarios sin fila'
from auth.users u where not exists (select 1 from public.user_access a where a.user_id = u.id)
union all
select '15. Usuarios autenticados SÍ pueden ejecutar las funciones que la app necesita',
       case when count(*) = 0 then 'OK' else 'REVISAR' end,
       coalesce(string_agg(f, ', '), 'todas ejecutables (sin esto, guardar falla con permission denied)')
from funciones where f in ('has_write_access()', 'activate_trial(text)', 'accept_terms(text)', 'delete_my_account()')
  and not has_function_privilege('authenticated', ('public.' || f)::regprocedure, 'EXECUTE')
union all
select '13. (Informativo) cuentas por estado de acceso', 'MIRAR',
       coalesce(string_agg(status || '=' || n, ', '), 'sin cuentas')
from (select status, count(*) n from public.user_access group by status) s
union all
select '14. (Informativo) códigos de bono', 'MIRAR',
       coalesce(string_agg(code || ' (' || days || ' días, usos ' || uses || coalesce('/' || max_uses, '/sin límite') || ', ' || case when active then 'activo' else 'inactivo' end || ')', '; '), 'NO HAY CÓDIGOS: crea uno')
from public.access_codes;
