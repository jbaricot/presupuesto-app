# Mi Libro de Cuentas

App de presupuesto personal: transacciones, metas, inversión, presupuesto e indicadores, con base de datos propia en Supabase.

## Stack
- **Frontend:** React + Vite
- **Base de datos + Auth:** Supabase (Postgres, gratis)
- **Hosting sugerido:** Vercel (gratis)

---

## 1. Crear el proyecto en Supabase

1. Ve a https://supabase.com → crea una cuenta → **New project**.
2. Elige nombre, contraseña de base de datos (guárdala) y región (idealmente cercana a Colombia, ej. `us-east-1`).
3. Cuando el proyecto esté listo, ve a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` de este repo, y dale **Run**. Esto crea las tablas y las políticas de seguridad (cada usuario solo ve sus propios datos).
4. Ve a **Authentication → Providers → Email** y confirma que esté habilitado (viene por defecto). No necesitas configurar contraseñas: la app usa "magic link" (enlace por correo).
5. Ve a **Project Settings → API**. Copia:
   - `Project URL`
   - `anon public` key

---

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env
```

Abre `.env` y pega tus valores de Supabase:

```
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

Prueba localmente:

```bash
npm run dev
```

Abre `http://localhost:5173`, escribe tu correo, revisa tu bandeja de entrada y haz clic en el enlace de acceso.

---

## 3. Desplegar en Vercel (acceso remoto desde cualquier dispositivo)

1. Sube este proyecto a un repositorio de GitHub (puedes usar `git init`, `git add .`, `git commit`, y crear el repo en GitHub).
2. Ve a https://vercel.com → **Add New → Project** → conecta tu repo.
3. En **Environment Variables**, agrega las mismas dos variables de tu `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Vercel te da una URL pública (ej. `https://mi-libro-de-cuentas.vercel.app`).
5. En Supabase, ve a **Authentication → URL Configuration** y agrega esa URL en **Site URL** y **Redirect URLs**, para que el enlace de acceso funcione también en producción.

Desde ese momento puedes entrar desde tu celular o tu PC con el mismo correo y vas a ver los mismos datos, guardados en tu base de datos de Supabase.

---

## Estructura del proyecto

```
src/
  supabaseClient.js   # cliente de Supabase
  theme.js             # colores, tipografía, categorías por defecto
  lib/
    helpers.js          # formateo de moneda, fechas, períodos
    data.js              # funciones CRUD contra Supabase
  components/
    ui.jsx               # Card, Btn, ProgressBar, etc.
    Login.jsx            # pantalla de acceso (magic link)
  tabs/
    Dashboard.jsx, Transactions.jsx, Goals.jsx, Investments.jsx, Categories.jsx, Budget.jsx
  App.jsx               # navegación y orquestación de datos
supabase/
  schema.sql            # esquema completo con Row Level Security
```

## Notas

- **Seguridad:** cada tabla tiene Row Level Security activado — aunque la URL sea pública, nadie puede ver o modificar los datos de otra persona, solo los suyos.
- **Respaldo:** puedes exportar tus datos en cualquier momento desde Supabase (**Table Editor** → exportar CSV, o `pg_dump` desde la línea de comandos).
- **Costos:** el plan gratuito de Supabase y Vercel es suficiente para uso personal indefinidamente, mientras no superes ~500MB de base de datos.
- **Múltiples usuarios:** si en el futuro quieres compartir la app con tu pareja o familia con datos separados, ya funciona así de fábrica — cada correo que inicie sesión tiene sus propios datos aislados.
