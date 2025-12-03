# Cómo Funcionan los Movimientos de Inventario

## 📋 Resumen

Los movimientos de inventario se registran en la tabla `inventory_movements` de Supabase y aparecen en:
- **Página "Movimientos"**: Muestra TODOS los movimientos de todos los productos (con filtros)
- **Historial de Producto**: Muestra solo los movimientos de UN producto específico

## 🔄 Cuándo se Registran Movimientos

### ✅ Se Registran Automáticamente:

1. **Cuando creas un movimiento manual** desde la página "Movimientos":
   - Entrada (IN): Aumenta el stock
   - Salida (OUT): Disminuye el stock
   - Ajuste (ADJUSTMENT): Corrige el stock
   - Transferencia (TRANSFER): Mueve stock entre ubicaciones

2. **Cuando editas un producto** (AUTOMÁTICO):
   - ✅ **Cambio de stock**: Se crea automáticamente un movimiento tipo ADJUSTMENT
   - ✅ **Cambio de nombre**: Se registra en el historial
   - ✅ **Cambio de código**: Se registra en el historial
   - ✅ **Cambio de ubicación** (pasillo/estante): Se registra en el historial
   - ✅ **Cualquier cambio**: Se genera un movimiento automático

   **Datos que se registran automáticamente:**
   - ✅ Fecha y hora (`movement_date` - automático)
   - ✅ Usuario que hizo el cambio (`user_id` - automático)
   - ✅ Tipo de movimiento: ADJUSTMENT
   - ✅ Stock antes y después (si cambió el stock)
   - ✅ Motivo descriptivo del cambio
   - ✅ Comentarios con detalles de los cambios

## 📊 Estructura de la Tabla `inventory_movements`

```sql
CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES products(id),
  batch_id uuid REFERENCES product_batches(id), -- NULL si no aplica
  user_id uuid REFERENCES profiles(id),         -- Usuario que hizo el movimiento
  movement_type text CHECK (IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
  quantity integer NOT NULL,
  quantity_before integer NOT NULL,             -- Stock antes del movimiento
  quantity_after integer NOT NULL,              -- Stock después del movimiento
  movement_date timestamptz DEFAULT now(),     -- Fecha y hora automática
  request_reason text NOT NULL,                 -- Motivo obligatorio
  reason_category text,                         -- Categoría opcional
  reference_document text,                       -- Nº albarán, factura, etc.
  comments text,
  source_location text,
  destination_location text,
  created_at timestamptz DEFAULT now()
);
```

## 🎯 Flujo de Trabajo

### Para Cambiar el Stock de un Producto:

1. **Opción 1: Usar la página "Movimientos"**
   - Ve a "Movimientos" → "Nuevo Movimiento"
   - Selecciona el producto
   - Elige el tipo (IN/OUT/ADJUSTMENT)
   - Indica la cantidad y el motivo
   - ✅ Se registra automáticamente en `inventory_movements`
   - ✅ El stock se actualiza automáticamente

2. **Opción 2: Editar el producto directamente** (RECOMENDADO para ajustes rápidos)
   - Ve a "Productos" → Editar producto
   - Cambia el `stock_current` o cualquier otro campo
   - ✅ Se registra automáticamente un movimiento
   - ✅ El historial queda completo con todos los cambios

### Para Ver el Historial de un Producto:

1. Ve a "Productos"
2. Busca el producto
3. Haz clic en los tres puntos (⋮) → "Ver historial"
4. Verás todos los movimientos de ese producto con:
   - Fecha y hora
   - Usuario que hizo el movimiento
   - Tipo de movimiento
   - Cantidad
   - Stock antes y después
   - Motivo

## 🔍 Filtros Disponibles

### En la Página "Movimientos":
- Por producto (código o nombre)
- Por tipo de movimiento (IN/OUT/ADJUSTMENT/TRANSFER)
- Por fecha (desde/hasta)
- Por usuario
- Por categoría de motivo

### En el Historial de Producto:
- Solo muestra movimientos del producto seleccionado
- Ordenados por fecha (más recientes primero)
- Con paginación

## 📝 Notas Importantes

1. **Los movimientos son inmutables**: Una vez creados, no se pueden editar ni eliminar
2. **El motivo es obligatorio**: Siempre debes indicar por qué se hace el movimiento
3. **El stock se actualiza automáticamente**: Cuando creas un movimiento, el stock del producto se actualiza automáticamente
4. **Sincronización con Supabase**: Todos los movimientos se guardan en tiempo real en Supabase

## 🚀 Mejoras Futuras Sugeridas

- [ ] Registrar movimientos automáticos cuando se edita el stock directamente
- [ ] Registrar cambios de nombre/ubicación en una tabla de auditoría
- [ ] Permitir exportar el historial de un producto a Excel
- [ ] Notificaciones cuando se hacen movimientos importantes

