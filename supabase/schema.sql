-- ============================================================
-- Mi Libro de Cuentas — esquema de base de datos (Supabase/Postgres)
-- Ejecuta esto completo en: Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- CATEGORÍAS ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz default now()
);

-- ---------- TRANSACCIONES ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,             -- formato 'YYYY-MM'
  date date,
  name text not null,
  type text not null check (type in ('ingreso','fijo','variable','credito','provision')),
  category text default '',
  payment_method text default '',
  value numeric not null default 0,
  paid boolean default false,
  created_at timestamptz default now()
);
create index if not exists transactions_user_period_idx on transactions(user_id, period);

-- ---------- METAS ----------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_total numeric not null default 0,
  due_date date,
  parent_goal_id uuid references goals(id) on delete cascade,  -- permite sub-metas dentro de una meta principal
  created_at timestamptz default now()
);

-- ---------- APORTES A METAS (y retiros: mismo registro con valor negativo) ----------
create table if not exists goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  period text not null,
  value numeric not null default 0,
  transaction_id uuid references transactions(id) on delete set null,  -- si el aporte se sincronizó como transacción
  created_at timestamptz default now()
);

-- ---------- INVERSIONES (seguimiento por plataforma: Nubank, Skandia, etc.) ----------
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  date date,
  platform text default 'General',
  aporte numeric default 0,
  retiros numeric default 0,
  rendimientos numeric default 0,
  costos numeric default 0,
  transaction_id uuid references transactions(id) on delete set null,
  -- columnas heredadas de la primera versión (se mantienen por compatibilidad con el dashboard)
  reserva numeric default 0,
  renta_fija numeric default 0,
  renta_variable numeric default 0,
  created_at timestamptz default now()
);

-- ---------- PRESUPUESTO (una fila por usuario) ----------
create table if not exists budget (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provision numeric default 0,
  fijos numeric default 0,
  creditos numeric default 0,
  variables numeric default 0,
  pay_day integer not null default 1,  -- día del mes en que recibes tu ingreso principal (1 = mes calendario normal)
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY: cada usuario solo ve y edita sus propios datos
-- ============================================================
alter table categories enable row level security;
alter table transactions enable row level security;
alter table goals enable row level security;
alter table goal_contributions enable row level security;
alter table investments enable row level security;
alter table budget enable row level security;

create policy "own rows" on categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on goal_contributions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on investments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on budget for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
