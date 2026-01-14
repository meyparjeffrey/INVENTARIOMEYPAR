/**
 * Migración: Sincronizar stock_current desde product_locations
 * 
 * Corrige el stock_current de todos los productos para que coincida
 * con la suma de las cantidades en product_locations.
 * 
 * Esto resuelve el problema donde stock_current está desactualizado.
 */

-- Función para sincronizar stock_current de un producto específico
CREATE OR REPLACE FUNCTION sync_product_stock_current(product_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock_current = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM product_locations
    WHERE product_id = product_uuid
  )
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- Función para sincronizar stock_current de todos los productos
CREATE OR REPLACE FUNCTION sync_all_products_stock_current()
RETURNS void AS $$
BEGIN
  UPDATE products p
  SET stock_current = (
    SELECT COALESCE(SUM(pl.quantity), 0)
    FROM product_locations pl
    WHERE pl.product_id = p.id
  );
END;
$$ LANGUAGE plpgsql;

-- Sincronizar todos los productos ahora
SELECT sync_all_products_stock_current();

-- Comentarios
COMMENT ON FUNCTION sync_product_stock_current IS 'Sincroniza el stock_current de un producto específico desde product_locations';
COMMENT ON FUNCTION sync_all_products_stock_current IS 'Sincroniza el stock_current de todos los productos desde product_locations';
