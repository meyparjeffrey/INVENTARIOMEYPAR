/**
 * Migración: Crear tabla product_locations para múltiples ubicaciones por producto
 * 
 * Permite que un producto tenga múltiples ubicaciones (ej: A1, A2, B3).
 * Mantiene compatibilidad con la estructura existente usando aisle y shelf.
 * 
 * @module supabase/migrations/create_product_locations
 */

-- Crear tabla product_locations
CREATE TABLE IF NOT EXISTS product_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse text NOT NULL CHECK (warehouse IN ('MEYPAR', 'OLIVA_TORRAS', 'FURGONETA')),
  aisle text NOT NULL,
  shelf text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  
  -- Constraint: una ubicación única por producto, almacén y ubicación
  CONSTRAINT unique_product_warehouse_location UNIQUE (product_id, warehouse, aisle, shelf)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_product_locations_product_id ON product_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_locations_primary ON product_locations(product_id, is_primary) WHERE is_primary = true;

-- Índice único parcial: solo una ubicación primaria por producto
-- Este índice reemplaza el constraint UNIQUE (product_id, is_primary) que era incorrecto
-- porque no permitía tener múltiples ubicaciones con is_primary = false
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_location_per_product 
  ON product_locations (product_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_product_locations_warehouse ON product_locations(warehouse);
CREATE INDEX IF NOT EXISTS idx_product_locations_aisle_shelf ON product_locations(aisle, shelf);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_product_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_locations_updated_at
  BEFORE UPDATE ON product_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_product_locations_updated_at();

-- Migrar datos existentes: crear ubicaciones desde products.aisle, products.shelf y products.warehouse
INSERT INTO product_locations (product_id, warehouse, aisle, shelf, is_primary, created_at, updated_at)
SELECT 
  id,
  COALESCE(warehouse, 'MEYPAR'), -- Si no tiene warehouse, asumir MEYPAR
  COALESCE(aisle, ''), -- Si no tiene aisle, usar vacío
  COALESCE(shelf, ''), -- Si no tiene shelf, usar vacío
  true, -- Marcar como primaria
  created_at,
  updated_at
FROM products
WHERE (aisle IS NOT NULL AND shelf IS NOT NULL) OR warehouse IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_locations pl WHERE pl.product_id = products.id
  );

-- Comentarios para documentación
COMMENT ON TABLE product_locations IS 'Ubicaciones múltiples por producto en diferentes almacenes. Un producto puede estar en MEYPAR, OLIVA_TORRAS y FURGONETA simultáneamente.';
COMMENT ON COLUMN product_locations.warehouse IS 'Almacén donde se encuentra la ubicación: MEYPAR, OLIVA_TORRAS o FURGONETA';
COMMENT ON COLUMN product_locations.is_primary IS 'Indica si esta es la ubicación primaria del producto. Solo puede haber una por producto.';
COMMENT ON COLUMN product_locations.aisle IS 'Pasillo o estantería (ej: "1", "A"). Para FURGONETA puede ser "FURGONETA".';
COMMENT ON COLUMN product_locations.shelf IS 'Estante o posición (ej: "A", "1"). Para FURGONETA contiene el nombre del técnico.';

