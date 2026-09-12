-- ==============================================================================
-- MIGRACIÓN V4: Refactor de Tipos de Gasto y Categorización Estricta
-- ==============================================================================

-- 1. Actualizar tabla BUDGET (Renombrar columnas de forma segura)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budget' AND column_name='fijos') THEN
        ALTER TABLE budget RENAME COLUMN fijos TO gastos_esenciales;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budget' AND column_name='variables') THEN
        ALTER TABLE budget RENAME COLUMN variables TO gastos_no_esenciales;
    END IF;
END $$;

-- 2. Actualizar tabla CATEGORIES (Añadir columna 'type')
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='type') THEN
        ALTER TABLE categories ADD COLUMN type text;
    END IF;
END $$;

-- 3. Actualizar tabla TRANSACTIONS (Limpiar datos y aplicar nueva restricción)
-- Eliminar restricción antigua
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Migrar datos históricos a la nueva nomenclatura
UPDATE transactions SET type = 'gastos_esenciales' WHERE type = 'fijo';
UPDATE transactions SET type = 'gastos_no_esenciales' WHERE type = 'variable';

-- Añadir la nueva restricción estricta
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('ingreso', 'gastos_esenciales', 'gastos_no_esenciales', 'credito', 'provision'));

-- 4. Notificar a PostgREST para que recargue la caché del esquema de la API
NOTIFY pgrst, 'reload schema';