# 📊 Análisis de Datos Exportados en Cada Informe

## Resumen Ejecutivo (`executive_summary`)

### Datos Exportados:
1. **Hoja KPIs:**
   - `totalValue`: Valor total del inventario (suma de costPrice × stockCurrent)
   - `totalProducts`: Total de productos activos
   - `lowStockCount`: Productos con stock < stockMin
   - `movementsCount`: Movimientos en el período (últimos 30 días por defecto)
   - `turnoverRate`: Tasa de rotación (movimientos / productos)
   - `avgStockValue`: Valor promedio por producto
   - `productsWithoutMovement`: Productos sin movimiento en últimos 90 días

2. **Hoja Datos (Tabla):**
   - **Columnas:** Código, Nombre, Categoría, Stock Actual, Stock Mínimo, Precio Coste, Valor
   - **Filas:** TODOS los productos activos con sus datos reales de Supabase
   - **Totales:** Suma de stock actual y valor total
   - **Fuente de datos:** Tabla `products` de Supabase

3. **Hoja Filtros:**
   - Filtros aplicados (almacén, categoría, fechas, etc.)

---

## Análisis de Stock (`stock_analysis`)

### Datos Exportados:
1. **Hoja KPIs:**
   - `criticalCount`: Productos críticos (stock < stockMin)
   - `highAlertCount`: Alta alerta (stockMin <= stock <= stockMin * 1.15)
   - `mediumAlertCount`: Alerta media
   - `avgDaysUntilDepletion`: Días promedio hasta agotarse

2. **Hoja Datos (Tabla):**
   - **Columnas:** Código, Nombre, Stock Actual, Stock Mínimo, Días Hasta Agotar, Reposición Sugerida
   - **Filas:** SOLO productos críticos (stock < stockMin)
   - **Fuente de datos:** Tabla `products` de Supabase (filtrados por stock crítico)

---

## Análisis de Movimientos (`movements_analysis`)

### Datos Exportados:
1. **Hoja KPIs:**
   - `totalEntries`: Total de entradas (IN)
   - `totalExits`: Total de salidas (OUT)
   - `totalAdjustments`: Total de ajustes
   - `totalTransfers`: Total de transferencias
   - `movementsByWarehouse`: Movimientos por almacén
   - `movementsByReason`: Movimientos por motivo

2. **Hoja Datos (Tabla):**
   - **Columnas:** Fecha, Tipo, Producto, Cantidad, Motivo, Almacén, Usuario
   - **Filas:** Últimos 100 movimientos del período (limitado para rendimiento)
   - **Fuente de datos:** Tabla `inventory_movements` de Supabase con join a `profiles`

---

## Control de Lotes (`batches_control`)

### Datos Exportados:
1. **Hoja KPIs:**
   - `totalBatches`: Total de lotes
   - `okBatches`: Lotes en estado OK
   - `defectiveBatches`: Lotes defectuosos
   - `blockedBatches`: Lotes bloqueados
   - `expiredBatches`: Lotes caducados
   - `expiringSoon30`: Lotes que caducan en 30 días
   - `expiringSoon60`: Lotes que caducan en 60 días

2. **Hoja Datos (Tabla):**
   - **Columnas:** Código Lote, Producto, Fecha Caducidad, Días Hasta Caducidad, Cantidad Disponible
   - **Filas:** Top 50 lotes próximos a caducar (en los próximos 60 días)
   - **Fuente de datos:** Tabla `product_batches` de Supabase con join a `products`

---

## Análisis de Proveedores (`suppliers_analysis`)

### Datos Exportados:
1. **Hoja KPIs:**
   - `activeSuppliers`: Proveedores activos
   - `inactiveSuppliers`: Proveedores inactivos
   - `totalBatchesSupplied`: Total de lotes suministrados
   - `totalDefectiveBatches`: Total de lotes defectuosos
   - `avgQualityRating`: Calidad promedio
   - `avgLeadTime`: Tiempo de entrega promedio

2. **Hoja Datos (Tabla):**
   - **Columnas:** Nombre, Lotes Suministrados, Tasa Defectos (%), Calidad, Tiempo Entrega (días), Valor Total
   - **Filas:** TODOS los proveedores con métricas calculadas
   - **Fuente de datos:** Tabla `suppliers` y `product_batches` de Supabase

---

## Auditoría (`audit`)

### Datos Exportados:
1. **Hoja KPIs:**
   - `totalActions`: Total de acciones
   - `creates`: Creaciones
   - `updates`: Actualizaciones
   - `deletes`: Eliminaciones
   - `views`: Visualizaciones
   - `exports`: Exportaciones
   - `logins`: Inicios de sesión
   - `mostActiveUser`: Usuario más activo

2. **Hoja Datos (Tabla):**
   - **Columnas:** Fecha, Usuario, Acción, Entidad, Campo, Valor Antiguo, Valor Nuevo
   - **Filas:** Últimos 100 logs de auditoría del período
   - **Fuente de datos:** Tabla `audit_logs` de Supabase con join a `profiles`

---

## Análisis de Ubicaciones (`locations`)

### Datos Exportados:
1. **Hoja KPIs:**
   - `totalLocations`: Total de ubicaciones
   - `locationsByWarehouse`: Ubicaciones por almacén
   - `productsWithoutLocation`: Productos sin ubicación
   - `avgProductsPerLocation`: Promedio de productos por ubicación

2. **Hoja Datos (Tabla):**
   - **Columnas:** Almacén, Pasillo, Estante, Productos, Stock Total
   - **Filas:** Top 20 ubicaciones con mayor stock
   - **Fuente de datos:** Tabla `product_locations` de Supabase

---

## Sugerencias de IA (`ai_suggestions`)

### Datos Exportados:
1. **Hoja KPIs:**
   - `totalSuggestions`: Total de sugerencias
   - `pendingSuggestions`: Sugerencias pendientes
   - `acceptedSuggestions`: Sugerencias aceptadas
   - `rejectedSuggestions`: Sugerencias rechazadas
   - `suggestionsByType`: Sugerencias por tipo

2. **Hoja Datos (Tabla):**
   - **Columnas:** Tipo, Prioridad, Descripción, Estado, Fecha Creación
   - **Filas:** TODAS las sugerencias activas
   - **Fuente de datos:** Tabla `ai_suggestions` de Supabase

---

## ⚠️ Problemas Identificados:

1. **Algunos informes limitan las filas:**
   - Movimientos: Solo últimos 100
   - Auditoría: Solo últimos 100
   - Lotes: Solo top 50 próximos a caducar
   - Ubicaciones: Solo top 20

2. **Tablas pueden estar vacías:**
   - Si no hay datos que cumplan los criterios, la tabla puede estar vacía
   - El exportador verifica `headers.length > 0` pero no verifica si hay filas

3. **Datos calculados vs. datos reales:**
   - Todos los datos son REALES de Supabase
   - Algunos cálculos (como días hasta agotar) son estimaciones basadas en datos reales

---

## ✅ Mejoras Necesarias:

1. **Siempre incluir encabezados** incluso si no hay filas
2. **Añadir mensaje** cuando la tabla está vacía
3. **Mejorar límites** o permitir exportar todos los datos
4. **Verificar que todos los datos sean reales** (ya están verificados)
