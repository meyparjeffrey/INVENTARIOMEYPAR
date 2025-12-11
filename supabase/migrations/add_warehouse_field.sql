/**
 * Migración: Añadir campo warehouse a tabla products
 * 
 * Añade el campo warehouse para distinguir entre:
 * - MEYPAR: Almacén principal con estanterías 1-30 y estantes A-G
 * - OLIVA_TORRAS: Almacén secundario sin estanterías/estantes
 * - FURGONETA: Furgonetas de técnicos
 * 
 * @module supabase/migrations/add_warehouse_field
 */

-- Añadir columna warehouse con constraint CHECK
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS warehouse text CHECK (warehouse IN ('MEYPAR', 'OLIVA_TORRAS', 'FURGONETA'));

-- Actualizar productos existentes: establecer warehouse = 'MEYPAR' por defecto
UPDATE products 
SET warehouse = 'MEYPAR' 
WHERE warehouse IS NULL;

-- Añadir índice para búsquedas rápidas por almacén
CREATE INDEX IF NOT EXISTS idx_products_warehouse ON products(warehouse);

-- Comentario en la columna para documentación
COMMENT ON COLUMN products.warehouse IS 'Almacén donde se encuentra el producto: MEYPAR (principal con estanterías), OLIVA_TORRAS (secundario), FURGONETA (furgoneta de técnico)';

