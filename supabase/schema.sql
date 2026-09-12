-- ==============================================================================
-- ESQUEMA MAESTRO: MI LIBRO DE CUENTAS (MVP SaaS)
-- ==============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 1. TABLA: Presupuesto (Budget)
-- --------------------------------------------------------
CREATE TABLE budget (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pay_day integer DEFAULT 1,
  emergency_fund_platforms text, -- Ej: "Skandia, Colfondos"
  gastos_esenciales numeric DEFAULT 0,
  gastos_no_esenciales numeric DEFAULT 0,
  creditos numeric DEFAULT 0,
  provision numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- --------------------------------------------------------
-- 2. TABLA: Categorías (Categories)
-- --------------------------------------------------------
CREATE TABLE categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text, -- 'gastos_esenciales', 'gastos_no_esenciales', etc.
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --------------------------------------------------------
-- 3. TABLA: Transacciones (Transactions)
-- --------------------------------------------------------
CREATE TABLE transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period text NOT NULL, -- Formato: 'YYYY-MM'
  date date,
  name text NOT NULL,
  type text NOT NULL,
  category text,
  payment_method text,
  value numeric NOT NULL,
  paid boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT transactions_type_check CHECK (type IN ('ingreso', 'gastos_esenciales', 'gastos_no_esenciales', 'credito', 'provision'))
);

-- --------------------------------------------------------
-- 4. TABLA: Metas (Goals)
-- --------------------------------------------------------
CREATE TABLE goals (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_goal_id uuid REFERENCES goals(id) ON DELETE CASCADE, -- Para sub-metas
  name text NOT NULL,
  target_total numeric NOT NULL,
  target_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --------------------------------------------------------
-- 5. TABLA: Aportes a Metas (Goal Contributions)
-- --------------------------------------------------------
CREATE TABLE goal_contributions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE, -- Vínculo automático
  period text NOT NULL,
  value numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --------------------------------------------------------
-- 6. TABLA: Inversiones (Investments)
-- --------------------------------------------------------
CREATE TABLE investments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE, -- Vínculo automático
  period text NOT NULL,
  date date,
  platform text,
  aporte numeric DEFAULT 0,
  retiros numeric DEFAULT 0,
  rendimientos numeric DEFAULT 0,
  costos numeric DEFAULT 0,
  reserva numeric DEFAULT 0,
  renta_fija numeric DEFAULT 0,
  renta_variable numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD RLS (Row Level Security)
-- Garantiza que en la versión comercial un usuario jamás vea los datos de otro.
-- ==============================================================================

ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Crear política estándar para todas las tablas: "Solo el dueño puede ver y editar sus filas"
CREATE POLICY "Users can manage their own budget" ON budget FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own goal contributions" ON goal_contributions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own investments" ON investments FOR ALL USING (auth.uid() = user_id);