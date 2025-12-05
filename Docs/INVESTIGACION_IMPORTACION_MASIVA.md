# Investigación: Proceso de Importación Masiva desde Excel

## 📋 Resumen Ejecutivo

Este documento investiga y documenta el proceso de importación masiva de productos desde un archivo Excel (`navision.xlsx`), incluyendo la estructura del Excel, el proceso de borrado masivo, la generación de valores aleatorios, y propuestas de mejora.

---

## 1. Estructura del Excel (`Docs/navision.xlsx`)

### 1.1 Columnas Esperadas

Según el script `scripts/import-products-from-excel.ts`, el Excel debe contener las siguientes columnas:

| Columna | Tipo | Obligatorio | Descripción |
|---------|------|-------------|-------------|
| `CODIGO` | string | ✅ Sí | Código único del producto |
| `NOMBRE` | string | ✅ Sí | Nombre del producto |
| `COD. PRODUCTO PROVEEDOR` o `Cód. producto proveedor` | string | ❌ No | Código del producto según el proveedor (se mapea a `barcode`) |

### 1.2 Formato y Validación

- **Primera fila**: Encabezados (se ignoran en el procesamiento)
- **Filas siguientes**: Datos de productos
- **Validación**: 
  - Si `CODIGO` o `NOMBRE` están vacíos, la fila se omite
  - Los valores se trimean (se eliminan espacios al inicio y final)
  - El código del proveedor es opcional

### 1.3 Ejemplo de Estructura

```
| CODIGO | NOMBRE                    | COD. PRODUCTO PROVEEDOR |
|--------|---------------------------|------------------------|
| PROD01 | Producto Ejemplo 1       | SUP-001                |
| PROD02 | Producto Ejemplo 2       | SUP-002                |
| PROD03 | Producto Ejemplo 3       |                         |
```

---

## 2. Proceso de Borrado Masivo

### 2.1 Opción Actual: Baja Lógica (Implementada)

**Método**: `UPDATE products SET is_active = false`

**Ventajas**:
- ✅ **Seguridad**: No elimina datos físicamente, permite recuperación
- ✅ **Auditoría**: Mantiene el historial completo de productos
- ✅ **Integridad referencial**: No rompe relaciones con otras tablas (movimientos, lotes, etc.)
- ✅ **Reversible**: Se puede reactivar productos si es necesario

**Desventajas**:
- ⚠️ La tabla `products` puede crecer indefinidamente
- ⚠️ Requiere limpieza periódica si se desea mantener la base de datos optimizada

**Código actual**:
```typescript
async function deactivateAllProducts(): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("is_active", true);
}
```

### 2.2 Opción Alternativa: Borrado Físico (NO RECOMENDADA)

**Método**: `DELETE FROM products`

**Ventajas**:
- ✅ Reduce el tamaño de la tabla
- ✅ Limpia completamente los datos antiguos

**Desventajas**:
- ❌ **Peligroso**: Eliminación permanente, sin posibilidad de recuperación
- ❌ **Rompe integridad**: Requiere desactivar constraints o eliminar en cascada
- ❌ **Pérdida de historial**: Se pierden movimientos, lotes y auditorías asociadas
- ❌ **Irreversible**: No hay forma de recuperar datos eliminados

**Consideraciones**:
- Si se implementa, requeriría:
  1. Desactivar temporalmente foreign keys
  2. Eliminar en cascada: `inventory_movements`, `product_batches`, `audit_logs`
  3. Backup completo antes de ejecutar
  4. Confirmación explícita del usuario

**Recomendación**: ⚠️ **NO IMPLEMENTAR** a menos que sea absolutamente necesario y con medidas de seguridad extremas.

---

## 3. Generación de Valores Aleatorios

### 3.1 Valores Actuales (Hardcodeados)

El script actual asigna valores fijos a todos los productos importados:

```typescript
{
  stock_current: 0,
  stock_min: 0,
  stock_max: null,
  aisle: "A1",        // Valor fijo
  shelf: "E1",        // Valor fijo
  cost_price: 0,
  // ...
}
```

### 3.2 Propuesta: Generación Aleatoria

#### 3.2.1 Stock Mínimo y Máximo

```typescript
function generateRandomStockValues() {
  const stockMin = Math.floor(Math.random() * (20 - 5 + 1)) + 5;  // 5-20
  const stockMax = Math.floor(Math.random() * (200 - 50 + 1)) + 50; // 50-200
  return { stockMin, stockMax };
}
```

**Rango**:
- `stock_min`: 5-20 (aleatorio)
- `stock_max`: 50-200 (aleatorio)

#### 3.2.2 Ubicación (Aisle y Shelf)

```typescript
function generateRandomLocation() {
  const aisles = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E1", "E2"];
  const shelves = ["E1", "E2", "E3", "E4", "E5"];
  
  const aisle = aisles[Math.floor(Math.random() * aisles.length)];
  const shelf = shelves[Math.floor(Math.random() * shelves.length)];
  
  return { aisle, shelf };
}
```

**Valores posibles**:
- `aisle`: A1, A2, B1, B2, C1, C2, D1, D2, E1, E2 (10 opciones)
- `shelf`: E1, E2, E3, E4, E5 (5 opciones)

---

## 4. Proceso de Importación Actual

### 4.1 Flujo Completo

1. **Leer Excel** (`readExcelFile`)
   - Valida existencia del archivo
   - Lee primera hoja del workbook
   - Convierte a JSON
   - Filtra filas inválidas (sin código o nombre)

2. **Obtener Usuario ADMIN** (`getAdminUserId`)
   - Busca el primer usuario con rol `ADMIN`
   - Usa su ID como `created_by` para todos los productos

3. **Desactivar Productos Existentes** (`deactivateAllProducts`)
   - Marca todos los productos activos como `is_active = false`
   - Actualiza `updated_at`

4. **Importar Productos** (`importProducts`)
   - Mapea cada fila del Excel a un objeto `Product`
   - Inserta en lotes de 100 productos
   - Muestra progreso en consola

### 4.2 Mapeo de Datos

| Campo Excel | Campo Base de Datos | Valor por Defecto |
|-------------|---------------------|-------------------|
| `CODIGO` | `code` | - |
| `NOMBRE` | `name` | - |
| `COD. PRODUCTO PROVEEDOR` | `barcode` | `null` |
| - | `stock_current` | `0` |
| - | `stock_min` | `0` |
| - | `stock_max` | `null` |
| - | `aisle` | `"A1"` |
| - | `shelf` | `"E1"` |
| - | `cost_price` | `0` |
| - | `is_active` | `true` |
| - | `is_batch_tracked` | `false` |

---

## 5. Propuestas de Mejora

### 5.1 Generación de Valores Aleatorios

**Implementar funciones**:
- `generateRandomStockValues()`: Para `stock_min` y `stock_max`
- `generateRandomLocation()`: Para `aisle` y `shelf`

**Beneficios**:
- ✅ Distribución más realista de productos en el almacén
- ✅ Valores de stock más variados para testing
- ✅ Simula mejor un inventario real

### 5.2 Validación de Datos Mejorada

**Añadir validaciones**:
- Verificar que `CODIGO` no esté duplicado en el Excel
- Validar formato de códigos (longitud, caracteres permitidos)
- Validar que `NOMBRE` tenga al menos 3 caracteres
- Detectar y reportar filas con problemas antes de importar

### 5.3 Proceso de Actualización vs. Creación

**Mejorar lógica**:
- En lugar de desactivar todos y crear nuevos, verificar si el producto existe por `code`
- Si existe: Actualizar (reactivar si estaba desactivado)
- Si no existe: Crear nuevo
- **Ventaja**: Mantiene historial de productos existentes

**Código propuesto**:
```typescript
async function importOrUpdateProducts(products: ProductToImport[], adminUserId: string) {
  for (const product of products) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("code", product.code)
      .single();
    
    if (existing) {
      // Actualizar producto existente
      await supabase
        .from("products")
        .update({
          name: product.name,
          barcode: product.supplierCode || null,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      // Crear nuevo producto
      await supabase.from("products").insert({
        code: product.code,
        name: product.name,
        // ... resto de campos
      });
    }
  }
}
```

### 5.4 Log Detallado de Importación

**Añadir**:
- Log de productos no importados (con razón)
- Resumen de productos actualizados vs. creados
- Tiempo total de importación
- Estadísticas (productos por categoría, etc.)

### 5.5 Opción de Borrado Físico (Comentada)

**Si se requiere en el futuro**:
- Implementar como opción con confirmación explícita
- Requerir backup automático antes de ejecutar
- Documentar claramente los riesgos
- Añadir flag `--dangerous-delete` para habilitar

---

## 6. Consideraciones de Seguridad

### 6.1 Backup Antes de Importación

**Recomendación**: Crear backup automático de la tabla `products` antes de ejecutar la importación.

```typescript
async function backupProducts() {
  const { data } = await supabase
    .from("products")
    .select("*");
  
  // Guardar en archivo JSON o tabla de backup
  fs.writeFileSync(
    `backup-products-${Date.now()}.json`,
    JSON.stringify(data, null, 2)
  );
}
```

### 6.2 Validación de Permisos

- Verificar que el usuario que ejecuta el script tenga permisos de ADMIN
- Validar que `SUPABASE_SERVICE_KEY` tenga permisos suficientes

### 6.3 Manejo de Errores

- Si falla la importación a mitad de proceso, tener un rollback o estado de recuperación
- Log detallado de errores por producto
- Continuar con productos válidos aunque algunos fallen

---

## 7. Tiempo Estimado de Importación

### 7.1 Cálculo

- **Productos**: ~9,000 (estimado)
- **Lotes**: 9,000 / 100 = 90 lotes
- **Tiempo por lote**: ~0.5-1 segundo (depende de la red)
- **Tiempo total**: ~45-90 segundos

### 7.2 Optimizaciones Posibles

- Aumentar tamaño de lote a 500 (si Supabase lo permite)
- Usar transacciones para mejor rendimiento
- Paralelizar inserciones (con cuidado de no saturar la base de datos)

---

## 8. Checklist de Implementación

Si se decide implementar las mejoras propuestas:

- [x] Implementar `generateRandomStockValues()`
- [x] Implementar `generateRandomLocation()`
- [x] Modificar `importProducts()` para usar valores aleatorios
- [x] Añadir validación de datos mejorada
- [x] Implementar lógica de actualización vs. creación
- [x] Añadir log detallado
- [x] Crear función de backup automático
- [x] Crear Edge Function de Supabase para ejecución desde la nube
- [x] Crear componente UI para importación
- [x] Integrar en página de Admin
- [x] Añadir traducciones (español y catalán)
- [ ] Probar con archivo de prueba pequeño
- [x] Documentar cambios en el script
- [x] Actualizar este documento con los cambios implementados

---

## 9. Conclusión

El proceso actual de importación masiva es **funcional y seguro** gracias al uso de baja lógica en lugar de borrado físico. Las mejoras propuestas (valores aleatorios, validación mejorada, actualización vs. creación) harían el proceso más robusto y realista, pero **no son críticas** para el funcionamiento básico.

**Recomendación final**: 
- ✅ Mantener baja lógica (no implementar borrado físico)
- ✅ Implementar generación de valores aleatorios para mejor testing
- ✅ Mejorar validación de datos
- ⚠️ Considerar lógica de actualización vs. creación si se requiere mantener historial

---

**Fecha de investigación**: 2025-01-27  
**Investigado por**: AI Assistant  
**Estado**: ✅ Completado

---

## 10. Cambios Implementados

### 10.1 Script Local Mejorado (`scripts/import-products-from-excel.ts`)

**Implementado**:
- ✅ `generateRandomStockValues()`: Genera valores aleatorios para `stock_min` (5-20) y `stock_max` (50-200)
- ✅ `generateRandomLocation()`: Genera ubicación aleatoria para `aisle` y `shelf`
- ✅ Validación mejorada en `readExcelFile()`:
  - Detección de códigos duplicados en el Excel
  - Validación de formato de códigos (longitud, caracteres permitidos)
  - Validación de longitud mínima de nombre (3 caracteres)
  - Retorna lista de errores de validación
- ✅ `importOrUpdateProducts()`: Reemplaza `deactivateAllProducts()` e `importProducts()`
  - Verifica si cada producto existe por `code`
  - Si existe: Actualiza (reactiva si estaba desactivado, actualiza nombre y barcode)
  - Si no existe: Crea nuevo con valores aleatorios
  - Mantiene historial de productos existentes
- ✅ `backupProducts()`: Crea backup automático antes de importar
  - Exporta todos los productos activos a JSON
  - Guarda en `backups/backup-products-{timestamp}.json`
- ✅ Logging mejorado:
  - Log detallado de productos no importados (con razón)
  - Resumen de productos actualizados vs. creados
  - Tiempo total de importación
  - Estadísticas y tasa de éxito

### 10.2 Edge Function de Supabase (`supabase/functions/import-products-from-excel/index.ts`)

**Implementado**:
- ✅ Edge Function completa para ejecutar importación desde la nube
- ✅ Validación de permisos (solo usuarios ADMIN)
- ✅ Recepción de archivo Excel mediante FormData
- ✅ Validación de archivo (extensión, tamaño máximo 10MB)
- ✅ Procesamiento con todas las mejoras del script local
- ✅ Respuesta JSON estructurada con resultados detallados
- ✅ Manejo de errores robusto

### 10.3 Componente UI (`src/presentation/components/admin/ImportProductsDialog.tsx`)

**Implementado**:
- ✅ Dialog para subir archivo Excel
- ✅ Validación de archivo (extensión .xlsx/.xls, tamaño máximo)
- ✅ Barra de progreso durante importación
- ✅ Mostrar resumen de resultados (productos creados, actualizados, errores)
- ✅ Botón para descargar log de errores
- ✅ Integración con Edge Function de Supabase
- ✅ Manejo de errores con mensajes claros

### 10.4 Integración en AdminPage (`src/presentation/pages/AdminPage.tsx`)

**Implementado**:
- ✅ Nueva pestaña "Importar" en la página de administración
- ✅ Sección de importación masiva con instrucciones
- ✅ Botón para abrir diálogo de importación
- ✅ Validación de permisos (solo ADMIN puede acceder)

### 10.5 Traducciones (`src/presentation/context/LanguageContext.tsx`)

**Implementado**:
- ✅ Traducciones completas en español y catalán para:
  - Títulos y descripciones de importación
  - Mensajes de éxito y error
  - Instrucciones de uso
  - Etiquetas de resultados

### 10.6 Archivos Creados/Modificados

**Nuevos archivos**:
- `supabase/functions/import-products-from-excel/index.ts`
- `src/presentation/components/admin/ImportProductsDialog.tsx`

**Archivos modificados**:
- `scripts/import-products-from-excel.ts` (mejoras completas)
- `src/presentation/pages/AdminPage.tsx` (integración de importación)
- `src/presentation/context/LanguageContext.tsx` (traducciones)
- `Docs/INVESTIGACION_IMPORTACION_MASIVA.md` (este documento)

---

**Fecha de implementación**: 2025-01-27  
**Implementado por**: AI Assistant  
**Estado**: ✅ Implementación Completa

