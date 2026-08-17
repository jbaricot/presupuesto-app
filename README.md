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

1. Ve a **Authentication → Providers → Email** y confirma que esté habilitado. Puedes usar acceso por enlace (magic link) o contraseña.

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
