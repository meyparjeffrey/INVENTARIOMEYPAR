# 📊 Explicación Detallada del Sistema de Informes

## 1. 📋 **RESUMEN EJECUTIVO - Datos Incluidos**

### ¿Qué datos incluye el informe "Resum Executiu"?

El informe **Resumen Ejecutivo** incluye datos **REALES** de tu base de datos de Supabase. **NO son inventados**. Aquí está el desglose completo:

#### **KPIs (Indicadores Clave de Rendimiento):**

1. **Valor Total del Inventario** (`totalValue`)
   - **Cálculo**: Suma de `(costPrice × stockCurrent)` de TODOS los productos
   - **Fuente**: Campo `costPrice` de la tabla `products` en Supabase
   - **Ejemplo**: Si tienes 100 productos con precio 10€ y stock 5 unidades cada uno = 5,000€

2. **Total de Productos** (`totalProducts`)
   - **Cálculo**: Cantidad total de productos activos
   - **Fuente**: Tabla `products` filtrada por `isActive = true`

3. **Productos en Alarma** (`lowStockCount`)
   - **Cálculo**: Productos donde `stockCurrent < stockMin`
   - **Fuente**: Comparación entre `stockCurrent` y `stockMin` de cada producto

4. **Movimientos del Período** (`movementsCount`)
   - **Cálculo**: Cantidad de movimientos en los últimos 30 días (o rango de fechas si aplicas filtros)
   - **Fuente**: Tabla `inventory_movements` en Supabase
   - **Por defecto**: Últimos 30 días si no especificas fechas

5. **Tasa de Rotación** (`turnoverRate`)
   - **Cálculo**: `movementsCount / totalProducts`
   - **Significado**: Cuántos movimientos promedio tiene cada producto

6. **Valor Promedio por Producto** (`avgStockValue`)
   - **Cálculo**: `totalValue / totalProducts`
   - **Significado**: Valor promedio de inventario por producto

7. **Productos Sin Movimiento** (`productsWithoutMovement`)
   - **Cálculo**: Productos que NO han tenido movimientos en los últimos 90 días
   - **Fuente**: Comparación entre `products` y `inventory_movements`

#### **Gráficos Incluidos:**

1. **Distribución por Categoría** (Gráfico de Torta)
   - Muestra cuántos productos hay en cada categoría
   - **Datos reales**: Agrupa productos por el campo `category`

2. **Top 10 Productos por Valor** (Gráfico de Barras)
   - Muestra los 10 productos con mayor valor: `costPrice × stockCurrent`
   - **Datos reales**: Ordenados de mayor a menor valor

#### **Tabla de Datos:**

La tabla muestra TODOS los productos con:
- **Código** (`code`)
- **Nombre** (`name`)
- **Categoría** (`category`)
- **Stock Actual** (`stockCurrent`)
- **Stock Mínimo** (`stockMin`)
- **Precio Coste** (`costPrice`) - **ESTE ES EL PRECIO REAL DE TU BASE DE DATOS**
- **Valor** (`costPrice × stockCurrent`)

### ⚠️ **IMPORTANTE SOBRE LOS PRECIOS:**

- **Los precios NO son inventados** - Vienen directamente del campo `costPrice` de cada producto en Supabase
- Si ves precios que no esperas, verifica en la tabla `products` de Supabase
- El cálculo del valor total usa: `costPrice × stockCurrent` de cada producto
- Si un producto tiene `costPrice = null` o `0`, ese producto no contribuye al valor total

---

## 2. 📥 **PROBLEMA DE EXPORTACIÓN - ¿Por qué no se guarda?**

### ¿Cómo funciona la exportación actualmente?

El código de exportación está implementado y **DEBERÍA** descargar los archivos automáticamente:

#### **Para Excel (XLSX):**
```typescript
// Genera el archivo y lo descarga automáticamente
XLSX.writeFile(workbook, fileName);
// Nombre: executive_summary_2026-01-13.xlsx
```

#### **Para CSV y JSON:**
```typescript
// Crea un enlace invisible, lo hace clic automáticamente y lo elimina
const link = document.createElement('a');
link.setAttribute('download', fileName);
link.click(); // Esto debería descargar el archivo
```

### 🔍 **Posibles causas del problema:**

1. **Bloqueador de descargas del navegador**
   - Algunos navegadores bloquean descargas automáticas
   - **Solución**: Permite descargas automáticas en la configuración del navegador

2. **Permisos del navegador**
   - El navegador puede estar bloqueando la descarga
   - **Solución**: Verifica la configuración de permisos

3. **Carpeta de descargas no configurada**
   - Windows puede estar guardando en una carpeta que no revisas
   - **Solución**: Revisa la carpeta "Descargas" de Windows

4. **Problema con Electron (si usas la app de escritorio)**
   - En Electron, las descargas pueden ir a una carpeta específica
   - **Solución**: Verifica la carpeta de descargas configurada en Electron

### ✅ **Cómo verificar si funciona:**

1. Abre la consola del navegador (F12)
2. Haz clic en "Exportar"
3. Busca errores en la consola
4. Revisa la carpeta de descargas de tu navegador

### 🔧 **Mejora sugerida:**

Podríamos mejorar la exportación para:
- Mostrar un mensaje más claro cuando se descarga
- Indicar la ruta donde se guardó el archivo
- Permitir elegir la ubicación de guardado

---

## 3. 📅 **BOTÓN "PROGRAMAR" - ¿Cómo funciona?**

### ¿Qué hace el botón "Programar"?

El botón "Programar" permite **guardar una configuración** para generar y enviar informes automáticamente en el futuro.

### 🔧 **Cómo funciona actualmente:**

#### **Paso 1: Configuración**
Cuando haces clic en "Programar", se abre un diálogo donde puedes configurar:

- **Frecuencia**: Diaria, Semanal, Mensual
- **Hora**: A qué hora generar el informe (ej: 09:00)
- **Día de la semana**: Si es semanal, qué día (Lunes, Martes, etc.)
- **Día del mes**: Si es mensual, qué día (1-31)
- **Destinatarios**: Lista de emails que recibirán el informe
- **Formatos**: Excel, CSV, PDF, JSON
- **Filtros**: Mismos filtros que aplicas manualmente

#### **Paso 2: Guardado en Supabase**
La configuración se guarda en la tabla `report_schedules` de Supabase con:
- Tipo de informe
- Frecuencia y hora
- Emails destinatarios
- Formatos de exportación
- Filtros aplicados
- Usuario que creó la programación

### ⚠️ **LIMITACIÓN ACTUAL - MUY IMPORTANTE:**

**El sistema de programación está INCOMPLETO:**

1. ✅ **Se guarda la configuración** en Supabase
2. ❌ **NO hay sistema automático** que ejecute las programaciones
3. ❌ **NO se generan los informes automáticamente**
4. ❌ **NO se envían emails** (esto lo pediste que NO implementáramos)

### 🤔 **¿Necesitas tener la aplicación encendida?**

**Respuesta corta: NO funciona automáticamente aún.**

**Explicación detallada:**

- **Actualmente**: Solo guarda la configuración en la base de datos
- **No hay**: Cron job, servicio en segundo plano, o sistema que ejecute las programaciones
- **Para que funcione automáticamente** necesitarías:
  1. Un **cron job en Supabase** (Edge Functions con triggers)
  2. O un **servicio en la aplicación** que se ejecute en segundo plano
  3. O un **servidor externo** que consulte las programaciones y genere los informes

### 📋 **Opciones para implementar la ejecución automática:**

#### **Opción 1: Supabase Edge Functions + Cron**
```sql
-- Crear una función que se ejecute cada hora
-- Verifica qué programaciones deben ejecutarse
-- Genera los informes
-- Envía los emails (si se implementa)
```

#### **Opción 2: Servicio en la aplicación Electron**
```typescript
// Si la aplicación está abierta, verifica cada hora
// Si hay programaciones pendientes, las ejecuta
// Genera y guarda los informes localmente
```

#### **Opción 3: Servidor externo (Node.js/Python)**
```typescript
// Servidor que corre 24/7
// Consulta Supabase cada hora
// Genera informes y los envía por email
```

### 💡 **Recomendación:**

Para que funcione completamente, necesitarías implementar:
1. ✅ **Ya está**: Guardar programaciones en Supabase
2. ❌ **Falta**: Sistema que ejecute las programaciones (cron job)
3. ❌ **Falta**: Generación automática de informes
4. ❌ **Falta**: Envío de emails (si lo quieres)

---

## 📝 **RESUMEN EJECUTIVO:**

### ✅ **Lo que SÍ funciona:**
- Generación de informes con datos reales de Supabase
- Visualización de KPIs, gráficos y tablas
- Exportación a Excel, CSV, JSON, PDF (debería descargar automáticamente)
- Guardado de programaciones en Supabase

### ⚠️ **Lo que NO funciona aún:**
- Ejecución automática de programaciones
- Envío de emails automático
- Generación de informes programados sin intervención manual

### 🔧 **Mejoras sugeridas:**
1. Verificar por qué no se descargan los archivos exportados
2. Implementar sistema de ejecución automática de programaciones
3. Mejorar mensajes de confirmación de exportación

---

¿Quieres que implemente alguna de estas mejoras o que investigue más a fondo el problema de las exportaciones?
