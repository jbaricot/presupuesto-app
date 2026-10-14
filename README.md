# Mi Libro de Cuentas

App avanzada de presupuesto personal: transacciones, metas jerárquicas (bolsillos/sinking funds), control detallado de inversiones y ahorros por plataforma, presupuesto, indicadores de rendimiento en tiempo real y base de datos propia en Supabase.

## Stack

* **Frontend:** React + Vite, Recharts, Lucide Icons
* **Base de datos + Auth:** Supabase (Postgres, Row Level Security)
* **Hosting sugerido:** Vercel

---

## 1. Crear el proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) → crea una cuenta → **New project**.

2. Elige nombre, contraseña de base de datos (guárdala) y región (idealmente cercana a Colombia, ej. `us-east-1`).

3. Cuando el proyecto esté listo, ve a **SQL Editor → New query**, pega el contenido del esquema base y ejecuta las siguientes consultas para soportar sub-metas y el desglose de inversiones:

```sql
-- Esquema para sub-metas jerárquicas
ALTER TABLE goals ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES goals(id) ON DELETE CASCADE;

-- Campos detallados para inversiones y ahorros por plataforma
ALTER TABLE investments ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'General';
ALTER TABLE investments ADD COLUMN IF NOT EXISTS aporte NUMERIC DEFAULT 0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS retiros NUMERIC DEFAULT 0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS rendimientos NUMERIC DEFAULT 0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS costos NUMERIC DEFAULT 0;

```

1. Ve a **Authentication → Providers → Email** y confirma que esté habilitado. La app usa correo + contraseña. Deja habilitado *Allow new users to sign up* (y, recomendado, *Confirm email*): crear una cuenta NO da acceso a escribir datos, porque cada cuenta nueva nace `pending` y solo se activa con el código del bono (ver sección *Acceso de prueba*).

2. Ve a **Project Settings → API** y copia:

* `Project URL`
* `anon public` key

---

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env

```

Abre `.env` y pega tus valores de Supabase:

```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima

```

Prueba localmente:

```bash
npm run dev

```

Abre `http://localhost:5173` en tu navegador.

---

## 3. Características Principales de la Versión Actual

* **Ciclos de Pago Dinámicos e Inteligentes:** Define tu día de pago (ej. 26 de cada mes) para que los períodos se ajusten al flujo real de tu dinero, o usa anclas automáticas basadas en las fechas reales de tus ingresos.

* **Metas Jerárquicas (Bolsillos / Sinking Funds):** Estructura tus finanzas agrupando sub-metas (ej. *SOAT*, *Seguro Auto*, *Predial*) dentro de macro-metas (ej. *Gastos Anuales*), con cálculo automático de totales y barras de progreso globales.
* **Inversiones y Ahorros Multientidad:** Registra el estado de tu dinero indicando la plataforma o entidad (Nubank, Skandia, etc.) y desglosando con precisión **Aportes, Retiros, Rendimientos y Costos**.
* **Sincronización Bidireccional:** Los movimientos de ahorro o aportes a metas pueden reflejarse automáticamente como transacciones de provisión en tu flujo de caja con un solo clic.
* **KPIs Financieros Avanzados:**
* *Velocidad de Gasto Operativo (Burn Rate / Pacing):* Monitoreo proactivo del avance de los días del ciclo frente al consumo real del presupuesto operativo.
* *Patrimonio Neto:* Gráfica de área que consolida la evolución histórica del efectivo acumulado y las inversiones.
* **Seguridad Robusta:** Cada tabla cuenta con *Row Level Security* (RLS) habilitado en Supabase, garantizando que cada usuario autenticado mantenga sus datos estrictamente privados y aislados.
* los ciclos inteligentes, las metas jerárquicas con sub-metas, el control detallado de inversiones por plataforma con rendimientos/costos, la sincronización bidireccional de transacciones y los nuevos KPIs financieros.

---

## 4. Desplegar en Vercel (Acceso Remoto)

1. Sube este proyecto a un repositorio de GitHub.

2. Ve a [https://vercel.com](https://vercel.com) → **Add New → Project** → conecta tu repositorio.

3. En **Environment Variables**, agrega las variables de entorno:

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`

1. Despliega. Vercel te asignará una URL pública.


---

## 5. Acceso de prueba (bono de 90 días)

1. Ejecuta `supabase/migration_v5_acceso_y_rls.sql` en el SQL Editor (es idempotente). Los usuarios que ya existen quedan como `active`, sin vencimiento.
2. Crea el código del bono:

```sql
insert into access_codes (code, days) values ('BONO90', 90);
-- opcional: límite de usos
-- update access_codes set max_uses = 500 where code = 'BONO90';
```

3. El enlace que va en el ebook es `https://TU-APP.vercel.app/?bono=BONO90`. La persona crea su cuenta y el bono se activa solo (si abre el enlace de confirmación del correo en el mismo navegador); si no, la app le pide el código.
4. Al vencer, la persona pasa a **solo lectura**: puede ver y exportar sus datos (CSV), pero la base de datos rechaza cualquier escritura (RLS).

Para dar acceso permanente a alguien: `update user_access set status = 'active', trial_ends_at = null where user_id = '...';`

---

## 6. Legal y cuenta (Ley 1581)

1. **Orden de despliegue:** ejecuta `supabase/migration_v6_legal_y_cuenta.sql` en Supabase **antes** de publicar esta versión en Vercel. Después de v5, es idempotente.
2. Completa los campos `[COMPLETAR: …]` de `LEGAL` en `src/lib/legal.js` (responsable, documento, domicilio, correo y región de los servidores) y haz revisar los textos por un abogado. En desarrollo (`npm run dev`) la consola avisa qué campos faltan.
3. La casilla de aceptación del registro guarda la versión y la fecha (`user_access.terms_version` / `terms_accepted_at`, la fecha la pone el servidor). Quien ya tenía cuenta ve una pantalla para aceptar antes de seguir. Si cambias los textos de forma importante, sube `TERMS_VERSION` y todos tendrán que aceptar de nuevo.
4. **Mi perfil** (botón arriba a la derecha): cambiar contraseña, descargar copia de los datos (JSON), ver los textos legales, cerrar sesión y **eliminar el perfil con todos sus datos** (función `delete_my_account`, que borra al usuario y, por cascada, todas sus filas). Funciona también con el acceso vencido.
