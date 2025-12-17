/**
 * Migración: Crear tabla product_stock_by_warehouse y añadir warehouse a inventory_movements
 * 
 * Permite gestionar stock por almacén (MEYPAR, OLIVA_TORRAS, FURGONETA) para cada producto.
 * El stock total (stock_current) se calcula como la suma de todos los almacenes.
 * 
 * @module supabase/migrations/create_product_stock_by_warehouse
 */

-- 1. Crear tabla product_stock_by_warehouse
CREATE TABLE IF NOT EXISTS product_stock_by_warehouse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse text NOT NULL CHECK (warehouse IN ('MEYPAR', 'OLIVA_TORRAS', 'FURGONETA')),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  location_aisle text,
  location_shelf text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  
  -- Constraint: un registro único por producto y almacén (sin ubicación específica)
  -- Si se necesita ubicación específica, se puede añadir location_aisle y location_shelf al unique
  CONSTRAINT unique_product_warehouse UNIQUE (product_id, warehouse)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_product_stock_by_warehouse_product_id 
  ON product_stock_by_warehouse(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_by_warehouse_warehouse 
  ON product_stock_by_warehouse(warehouse);
CREATE INDEX IF NOT EXISTS idx_product_stock_by_warehouse_product_warehouse 
  ON product_stock_by_warehouse(product_id, warehouse);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_product_stock_by_warehouse_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_stock_by_warehouse_updated_at
  BEFORE UPDATE ON product_stock_by_warehouse
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_by_warehouse_updated_at();

-- 2. Añadir columna warehouse a inventory_movements
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS warehouse text CHECK (warehouse IN ('MEYPAR', 'OLIVA_TORRAS', 'FURGONETA'));

-- Índice para búsquedas por almacén en movimientos
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse 
  ON inventory_movements(warehouse);

-- 3. Migrar datos existentes: crear registros en product_stock_by_warehouse desde products
-- Usar el warehouse del producto y su stock_current
INSERT INTO product_stock_by_warehouse (product_id, warehouse, quantity, location_aisle, location_shelf, created_at, updated_at)
SELECT 
  id,
  COALESCE(warehouse, 'MEYPAR') as warehouse,
  COALESCE(stock_current, 0) as quantity,
  aisle as location_aisle,
  shelf as location_shelf,
  created_at,
  updated_at
FROM products
WHERE stock_current > 0 OR warehouse IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_stock_by_warehouse psbw 
    WHERE psbw.product_id = products.id 
      AND psbw.warehouse = COALESCE(products.warehouse, 'MEYPAR')
  );

-- 4. Función para actualizar stock_current en products como suma de product_stock_by_warehouse
CREATE OR REPLACE FUNCTION update_product_stock_current()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_current = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM product_stock_by_warehouse
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para mantener stock_current sincronizado
CREATE TRIGGER trigger_update_stock_current_on_insert
  AFTER INSERT ON product_stock_by_warehouse
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_current();

CREATE TRIGGER trigger_update_stock_current_on_update
  AFTER UPDATE ON product_stock_by_warehouse
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_current();

CREATE TRIGGER trigger_update_stock_current_on_delete
  AFTER DELETE ON product_stock_by_warehouse
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_current();

-- Comentarios para documentación
COMMENT ON TABLE product_stock_by_warehouse IS 'Stock de productos por almacén. Permite tener stock en múltiples almacenes simultáneamente (MEYPAR, OLIVA_TORRAS, FURGONETA).';
COMMENT ON COLUMN product_stock_by_warehouse.warehouse IS 'Almacén: MEYPAR, OLIVA_TORRAS o FURGONETA';
COMMENT ON COLUMN product_stock_by_warehouse.quantity IS 'Cantidad de stock en este almacén';
COMMENT ON COLUMN product_stock_by_warehouse.location_aisle IS 'Pasillo/estantería dentro del almacén (opcional)';
COMMENT ON COLUMN product_stock_by_warehouse.location_shelf IS 'Estante/posición dentro del almacén (opcional)';
COMMENT ON COLUMN inventory_movements.warehouse IS 'Almacén donde se realizó el movimiento (MEYPAR, OLIVA_TORRAS o FURGONETA)';
