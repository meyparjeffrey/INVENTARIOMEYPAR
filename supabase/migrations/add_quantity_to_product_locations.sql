/**
 * Migración: Añadir columna quantity a product_locations e integrar stock con ubicaciones
 * 
 * Permite gestionar stock directamente en cada ubicación.
 * - MEYPAR: todas las ubicaciones suman su stock (no se diferencia entre ubicaciones)
 * - OLIVA_TORRAS y FURGONETA: cada ubicación tiene su stock individual
 * 
 * @module supabase/migrations/add_quantity_to_product_locations
 */

-- 1. Añadir columna quantity a product_locations
ALTER TABLE product_locations 
ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0);

-- Índice para búsquedas por cantidad
CREATE INDEX IF NOT EXISTS idx_product_locations_quantity 
  ON product_locations(quantity) WHERE quantity > 0;

-- 2. Migrar datos de product_stock_by_warehouse a product_locations
-- Matching por product_id, warehouse, location_aisle/aisle, location_shelf/shelf
UPDATE product_locations pl
SET quantity = COALESCE(
  (
    SELECT psbw.quantity
    FROM product_stock_by_warehouse psbw
    WHERE psbw.product_id = pl.product_id
      AND psbw.warehouse = pl.warehouse
      AND (
        (psbw.location_aisle IS NULL OR psbw.location_aisle = '') AND (pl.aisle = '' OR pl.aisle IS NULL)
        OR psbw.location_aisle = pl.aisle
      )
      AND (
        (psbw.location_shelf IS NULL OR psbw.location_shelf = '') AND (pl.shelf = '' OR pl.shelf IS NULL)
        OR psbw.location_shelf = pl.shelf
      )
    LIMIT 1
  ),
  0
)
WHERE EXISTS (
  SELECT 1
  FROM product_stock_by_warehouse psbw
  WHERE psbw.product_id = pl.product_id
    AND psbw.warehouse = pl.warehouse
);

-- 3. Para productos que tienen stock_by_warehouse pero no ubicación, crear ubicaciones
INSERT INTO product_locations (product_id, warehouse, aisle, shelf, is_primary, quantity, created_at, updated_at)
SELECT 
  psbw.product_id,
  psbw.warehouse,
  COALESCE(psbw.location_aisle, '') as aisle,
  COALESCE(psbw.location_shelf, '') as shelf,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM product_locations pl2 
      WHERE pl2.product_id = psbw.product_id AND pl2.is_primary = true
    ) THEN true
    ELSE false
  END as is_primary,
  psbw.quantity,
  psbw.created_at,
  psbw.updated_at
FROM product_stock_by_warehouse psbw
WHERE psbw.quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM product_locations pl
    WHERE pl.product_id = psbw.product_id
      AND pl.warehouse = psbw.warehouse
      AND (
        (psbw.location_aisle IS NULL OR psbw.location_aisle = '') AND (pl.aisle = '' OR pl.aisle IS NULL)
        OR psbw.location_aisle = pl.aisle
      )
      AND (
        (psbw.location_shelf IS NULL OR psbw.location_shelf = '') AND (pl.shelf = '' OR pl.shelf IS NULL)
        OR psbw.location_shelf = pl.shelf
      )
  )
ON CONFLICT (product_id, warehouse, aisle, shelf) DO NOTHING;

-- 4. Actualizar función para calcular stock_current desde product_locations.quantity
CREATE OR REPLACE FUNCTION update_product_stock_current()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_current = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM product_locations
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Eliminar triggers antiguos de product_stock_by_warehouse (opcional, mantener para compatibilidad)
-- DROP TRIGGER IF EXISTS trigger_update_stock_current_on_insert ON product_stock_by_warehouse;
-- DROP TRIGGER IF EXISTS trigger_update_stock_current_on_update ON product_stock_by_warehouse;
-- DROP TRIGGER IF EXISTS trigger_update_stock_current_on_delete ON product_stock_by_warehouse;

-- 6. Crear triggers en product_locations para mantener stock_current sincronizado
DROP TRIGGER IF EXISTS trigger_update_stock_current_on_location_insert ON product_locations;
DROP TRIGGER IF EXISTS trigger_update_stock_current_on_location_update ON product_locations;
DROP TRIGGER IF EXISTS trigger_update_stock_current_on_location_delete ON product_locations;

CREATE TRIGGER trigger_update_stock_current_on_location_insert
  AFTER INSERT ON product_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_current();

CREATE TRIGGER trigger_update_stock_current_on_location_update
  AFTER UPDATE ON product_locations
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
  EXECUTE FUNCTION update_product_stock_current();

CREATE TRIGGER trigger_update_stock_current_on_location_delete
  AFTER DELETE ON product_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_current();

-- 7. Actualizar stock_current de todos los productos basado en product_locations
UPDATE products p
SET stock_current = (
  SELECT COALESCE(SUM(pl.quantity), 0)
  FROM product_locations pl
  WHERE pl.product_id = p.id
);

-- Comentarios para documentación
COMMENT ON COLUMN product_locations.quantity IS 'Cantidad de stock en esta ubicación específica. Para MEYPAR, todas las ubicaciones suman al total. Para OLIVA_TORRAS y FURGONETA, cada ubicación tiene su stock individual.';
