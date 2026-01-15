-- Function to get inventory stock by warehouse at a specific date in the past
-- This function returns stock per warehouse for each product based on historical movements
CREATE OR REPLACE FUNCTION get_inventory_by_warehouse_at_date(query_date timestamptz)
RETURNS TABLE (
  product_id uuid,
  code text,
  name text,
  category text,
  warehouse text,
  stock_current integer,
  cost_price numeric,
  sale_price numeric,
  supplier_code text
) AS $$
BEGIN
  RETURN QUERY
  WITH product_warehouses AS (
    -- Obtener todos los productos activos y sus posibles almacenes
    SELECT DISTINCT
      p.id as product_id,
      p.code,
      p.name,
      p.category,
      p.cost_price,
      p.sale_price,
      p.supplier_code,
      COALESCE(pl.warehouse, p.warehouse, 'MEYPAR') as warehouse
    FROM products p
    LEFT JOIN product_locations pl ON pl.product_id = p.id
    WHERE p.is_active = true
  ),
  historical_stock AS (
    -- Calcular stock histórico por producto y almacén
    SELECT
      pw.product_id,
      pw.warehouse,
      COALESCE(
        (SELECT quantity_after
         FROM inventory_movements m
         WHERE m.product_id = pw.product_id
           AND (m.warehouse = pw.warehouse OR m.warehouse IS NULL)
           AND m.movement_date <= query_date
         ORDER BY m.movement_date DESC
         LIMIT 1),
        0
      )::integer as stock_current
    FROM product_warehouses pw
  )
  SELECT
    pw.product_id,
    pw.code,
    pw.name,
    pw.category,
    pw.warehouse,
    hs.stock_current,
    pw.cost_price,
    pw.sale_price,
    pw.supplier_code
  FROM product_warehouses pw
  LEFT JOIN historical_stock hs ON hs.product_id = pw.product_id AND hs.warehouse = pw.warehouse
  WHERE hs.stock_current > 0 OR pw.warehouse IS NOT NULL
  ORDER BY pw.name ASC, pw.warehouse ASC;
END;
$$ LANGUAGE plpgsql;
