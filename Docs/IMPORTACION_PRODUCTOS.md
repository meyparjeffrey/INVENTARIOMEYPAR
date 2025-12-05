# Importación Masiva de Productos desde Excel

## Descripción

Sistema de importación masiva que permite cargar productos desde un archivo Excel a la tabla `products` de Supabase.

## Tabla Afectada

**ÚNICAMENTE la tabla `products`** de Supabase.

- ✅ **Se modifica**: Tabla `products`
- ❌ **NO se modifica**: 
  - `product_batches` (lotes)
  - `inventory_movements` (movimientos)
  - `audit_logs` (auditoría)
  - `product_suppliers` (proveedores)
  - Cualquier otra tabla

## Operaciones Realizadas

### En la Tabla `products`:

1. **SELECT**: Verifica si un producto existe por `code`
2. **UPDATE**: Actualiza productos existentes (solo si se elige "Sobrescribir todos")
3. **INSERT**: Crea nuevos productos que no existen

### Campos Modificados/Creados:

**Al crear un producto nuevo:**
- `code` (del Excel)
- `name` (del Excel, columna "descripcion" o "nombre")
- `notes` (del Excel, columna "codigo producto proveedor" → se guarda como "Código proveedor: XXX")
- `stock_current`: 0 (siempre)
- `stock_min`: Valor aleatorio (5-20)
- `stock_max`: Valor aleatorio (50-200)
- `aisle`: Valor aleatorio (A1, A2, B1, B2, C1, C2, D1, D2, E1, E2)
- `shelf`: Valor aleatorio (E1, E2, E3, E4, E5)
- `cost_price`: 0
- `is_active`: true
- `is_batch_tracked`: false
- Otros campos: null o valores por defecto

**Al actualizar un producto existente** (solo si se elige "Sobrescribir todos"):
- `name`: Se actualiza con el valor del Excel
- `notes`: Se actualiza con el código del proveedor del Excel (formato "Código proveedor: XXX")
- `is_active`: Se reactiva si estaba desactivado
- `updated_at`: Se actualiza la fecha
- **IMPORTANTE**: Se MANTIENEN todos estos campos sin modificar:
  - `stock_current` (stock actual)
  - `stock_min`, `stock_max` (stocks mínimo y máximo)
  - `aisle`, `shelf` (ubicación)
  - `barcode` (código de barras)
  - Cualquier otro campo del producto

## Opciones de Importación

### 1. Solo Añadir Nuevos (Por Defecto)

- ✅ Crea productos que NO existen en la tabla
- ⏭️ Omite productos que YA existen (mantiene todo su stock y datos)
- 🛡️ **Protege el stock existente**

### 2. Sobrescribir Todos

- ✅ Crea productos nuevos
- 🔄 Actualiza productos existentes (nombre, notes)
- 🗑️ **ELIMINA productos que NO están en el Excel** (borrado físico)
- ⚠️ **NO modifica `stock_current`** de productos existentes (el stock se mantiene)
- ⚠️ **IMPORTANTE**: La base de datos quedará exactamente como el Excel (solo productos del Excel)

## Formato del Excel

### Columnas Requeridas:

| Columna Excel | Campo Supabase | Obligatorio | Notas |
|---------------|----------------|-------------|-------|
| `codigo` o `CODIGO` | `code` | ✅ Sí | Código único del producto |
| `descripcion` o `DESCRIPCION` o `NOMBRE` | `name` | ✅ Sí | Nombre/descripción del producto |
| `codigo producto proveedor` o `COD. PRODUCTO PROVEEDOR` | `notes` | ❌ No | Código del proveedor (se guarda en `notes` con formato "Código proveedor: XXX") |

### Validaciones:

- ✅ Código no puede estar vacío
- ✅ Nombre debe tener al menos 3 caracteres
- ✅ Código no puede estar duplicado en el Excel
- ✅ Código debe tener entre 1 y 50 caracteres
- ✅ Código solo permite letras, números, guiones y guiones bajos
- ✅ Si un código ya existe en Supabase, se omite (modo "Solo nuevos") o se actualiza (modo "Sobrescribir")

## Proceso de Importación

1. **Validación del Excel**: Verifica formato y datos
2. **Backup Automático**: Crea backup de productos activos antes de importar
3. **Detección de Existentes**: Verifica qué productos ya existen por `code`
4. **Procesamiento**:
   - Si "Solo nuevos": Crea solo productos que no existen
   - Si "Sobrescribir": Crea nuevos y actualiza existentes
5. **Resultado**: Muestra resumen (creados, actualizados/omitidos, errores)

## Seguridad

- ✅ Solo usuarios con rol `ADMIN` pueden importar
- ✅ Backup automático antes de cada importación
- ✅ Validación estricta de datos
- ✅ No modifica `stock_current` de productos existentes
- ✅ No afecta otras tablas (lotes, movimientos, etc.)

## Notas Importantes

1. **El stock (`stock_current`) NUNCA se modifica** durante la importación, ni siquiera en modo "Sobrescribir todos"
2. **Solo se importan 3 campos del Excel**: código, nombre/descripción, y código de proveedor (que va a `notes`)
3. **Los demás campos** (stock, ubicación, precios, etc.) se generan automáticamente o se mantienen
4. **No se crean movimientos** automáticamente durante la importación
5. **No se crean lotes** automáticamente durante la importación
6. **Modo "Sobrescribir todos"**: Elimina físicamente los productos que NO están en el Excel. La base de datos quedará exactamente como el Excel.

---

**Última actualización**: 2025-01-27

