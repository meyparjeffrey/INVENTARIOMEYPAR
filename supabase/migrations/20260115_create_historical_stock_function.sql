-- Function to get inventory stock at a specific date in the past
CREATE OR REPLACE FUNCTION get_inventory_at_date(query_date timestamptz)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  category text,
  warehouse text,
  stock_current integer, -- This represents the HISTORICAL stock at that date
  cost_price numeric,
  sale_price numeric,
  supplier_code text,
  total_value numeric -- Calculated field: stock * cost_price
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.code,
    p.name,
    p.category,
    p.warehouse,
    -- We take the quantity_after from the last movement before or on the query_date
    -- If no movement exists (product didn't exist or no history), we assume 0
    COALESCE(last_mv.quantity_after, 0)::integer as stock_current,
    p.cost_price,
    p.sale_price,
    p.supplier_code,
    (COALESCE(last_mv.quantity_after, 0) * COALESCE(p.cost_price, 0))::numeric as total_value
  FROM products p
  LEFT JOIN LATERAL (
    SELECT quantity_after
    FROM inventory_movements m
    WHERE m.product_id = p.id
    AND m.movement_date <= query_date
    ORDER BY m.movement_date DESC
    LIMIT 1
  ) last_mv ON true
  ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql;
