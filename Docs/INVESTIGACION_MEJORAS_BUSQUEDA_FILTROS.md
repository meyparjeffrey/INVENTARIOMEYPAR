# Investigación de Mejoras para Búsqueda y Filtros

**Fecha:** 9 de diciembre de 2025  
**Autor:** Sistema de Investigación Automatizado  
**Estado:** Propuestas de mejora - Pendiente de revisión

---

## Resumen Ejecutivo

Esta investigación analiza el sistema actual de búsqueda y filtros de productos, identificando oportunidades de mejora en funcionalidad, rendimiento y experiencia de usuario. Se han probado los filtros en el navegador y se ha verificado su implementación en el código.

---

## Estado Actual del Sistema

### Filtros Implementados

✅ **Filtros Básicos:**

- Búsqueda por texto (código, nombre, barcode)
- Categoría
- Incluir inactivos
- Solo con lotes
- Solo en alarma
- Productos al 15% del stock mínimo

✅ **Filtros de Rango:**

- Stock (mínimo y máximo)
- Precio (mínimo y máximo)
- Código de proveedor

✅ **Filtros de Fecha:**

- Última modificación (7 días, 30 días, 90 días, 1 año)
- Rango personalizado de fechas
- Tipo de modificación (entradas, salidas, ambas)

### Funcionalidad Verificada

- ✅ Botón de filtros funciona correctamente
- ✅ Panel de filtros se abre y cierra correctamente
- ✅ Botones rápidos de fecha funcionan
- ✅ Filtros se aplican correctamente en el repositorio
- ✅ Los filtros están implementados tanto en `list()` como en `getAll()`

---

## Propuestas de Mejora

### 1. Búsqueda Avanzada

#### 1.1. Búsqueda por Múltiples Campos Simultáneos

**Problema:** Actualmente la búsqueda busca en código, nombre y barcode, pero no permite especificar en qué campo buscar.

**Propuesta:**

- Añadir opciones de búsqueda específica:
  - "Buscar solo por código"
  - "Buscar solo por nombre"
  - "Buscar solo por barcode"
  - "Buscar en todos los campos" (actual)

**Beneficio:** Mayor precisión en búsquedas específicas.

**Complejidad:** Media  
**Prioridad:** Media

#### 1.2. Búsqueda con Operadores Lógicos

**Problema:** No se pueden hacer búsquedas complejas con múltiples términos.

**Propuesta:**

- Permitir operadores lógicos:
  - `AND`: "código1 AND código2" (debe contener ambos)
  - `OR`: "código1 OR código2" (debe contener alguno)
  - `NOT`: "código1 NOT código2" (debe contener el primero pero no el segundo)
  - Comillas para búsqueda exacta: `"código exacto"`
  - `*` (wildcard): "xxx\*" (todo lo que contenga esa palabra seguida de cualquier cosa, estilo SharePoint)

**Beneficio:** Búsquedas más potentes y precisas.

**Complejidad:** Alta  
**Prioridad:** Media

#### 1.3. Búsqueda por Ubicación

**Problema:** No se puede buscar por ubicación (pasillo, estante).

**Propuesta:**

- Añadir campo de búsqueda por ubicación:
  - Búsqueda por pasillo (aisle)
  - Búsqueda por estante (shelf)
  - Búsqueda por ubicación completa (aisle + shelf)

**Beneficio:** Útil para operaciones de almacén físicas.

**Complejidad:** Baja  
**Prioridad:** Alta

#### 1.4. Búsqueda con Autocompletado

**Problema:** El usuario debe escribir el término completo.

**Propuesta:**

- Implementar autocompletado con sugerencias:
  - Mostrar sugerencias mientras se escribe
  - Incluir código, nombre y barcode en sugerencias
  - Limitar a 10 sugerencias más relevantes

**Beneficio:** Mejor UX, menos errores de escritura.

**Complejidad:** Media  
**Prioridad:** Media

---

### 2. Filtros Avanzados

#### 2.1. Filtro por Rango de Stock Mínimo

**Problema:** Solo se puede filtrar por stock actual, no por stock mínimo.

**Propuesta:**

- Añadir filtros para stock mínimo:
  - Stock mínimo (mínimo y máximo)
  - Útil para encontrar productos con rangos de stock mínimo similares

**Beneficio:** Mejor gestión de inventario.

**Complejidad:** Baja  
**Prioridad:** Media

#### 2.3. Filtro por Fecha de Creación y Modificación con Slider

**Problema:** Solo se filtra por fecha de modificación con botones, no hay filtro por fecha de creación.

**Propuesta:**

- Añadir filtros para fecha de creación y modificación con slider (barra deslizante):
  - Slider de izquierda a derecha con opciones: 1 semana, 15 días, 1 mes, 3 meses, 6 meses, 1 año, más de 1 año
  - Aplicable tanto para fecha de modificación como fecha de creación
  - Útil para auditorías y seguimiento de nuevos productos

**Beneficio:** Mejor trazabilidad de productos y UX más intuitiva.

**Complejidad:** Media  
**Prioridad:** Alta

#### 2.4. Filtro por Estado de Lote

**Problema:** No se puede filtrar productos que tengan lotes con estados específicos.

**Propuesta:**

- Añadir filtro por estado de lote:
  - Productos con lotes OK
  - Productos con lotes DEFECTIVE
  - Productos con lotes BLOCKED
  - Productos con lotes próximos a vencer

**Beneficio:** Mejor gestión de calidad.

**Complejidad:** Media  
**Prioridad:** Alta

---

### 3. Mejoras de UX

#### 3.1. Guardar Filtros Favoritos

**Problema:** Los usuarios deben configurar los mismos filtros repetidamente.

**Propuesta:**

- Permitir guardar combinaciones de filtros:
  - Botón "Guardar filtros"
  - Nombre personalizado para cada conjunto de filtros
  - Lista de filtros guardados
  - Aplicar filtros guardados con un clic

**Beneficio:** Ahorro de tiempo para usuarios frecuentes.

**Complejidad:** Media  
**Prioridad:** Alta

#### 3.3. Indicador Visual de Filtros Activos

**Problema:** Aunque hay chips de filtros activos, podrían ser más visibles.

**Propuesta:**

- Mejorar visualización de filtros activos:
  - Badge más visible en el botón de filtros
  - Lista expandible de filtros activos
  - Contador de resultados filtrados vs. total

**Beneficio:** Mejor feedback visual.

**Complejidad:** Baja  
**Prioridad:** Baja

#### 3.4. Aplicación Automática de Filtros

**Problema:** Los filtros solo se aplican al hacer clic en "Aplicar".

**Propuesta:**

- Opción para aplicar filtros automáticamente:
  - Checkbox "Aplicar automáticamente"
  - Los filtros se aplican al cambiar cualquier valor
  - Útil para usuarios avanzados

**Beneficio:** Flujo más rápido para usuarios experimentados.

**Complejidad:** Baja  
**Prioridad:** Media

---

### 4. Mejoras de Rendimiento

#### 4.1. Indexación de Búsqueda

**Problema:** Las búsquedas pueden ser lentas con muchos productos.

**Propuesta:**

- Optimizar índices en Supabase:
  - Índice en `code`
  - Índice en `name`
  - Índice en `barcode`
  - Índice compuesto para búsquedas combinadas

**Beneficio:** Búsquedas más rápidas.

**Complejidad:** Baja (requiere migración de BD)  
**Prioridad:** Alta

#### 4.2. Caché de Resultados

**Problema:** Cada búsqueda consulta la base de datos.

**Propuesta:**

- Implementar caché de resultados:
  - Cachear resultados de búsquedas frecuentes
  - Invalidar caché cuando se modifiquen productos
  - TTL de 5 minutos para resultados

**Beneficio:** Menor carga en la base de datos.

**Complejidad:** Media  
**Prioridad:** Media

#### 4.3. Paginación Inteligente

**Problema:** La paginación actual carga todos los resultados filtrados.

**Propuesta:**

- Mejorar paginación:
  - Cursor-based pagination para grandes conjuntos
  - Lazy loading de resultados
  - Virtual scrolling para listas grandes

**Beneficio:** Mejor rendimiento con muchos productos.

**Complejidad:** Alta  
**Prioridad:** Baja

---

### 5. Mejoras de Funcionalidad

#### 5.1. Exportar con Filtros

**Problema:** La exportación actual puede no respetar todos los filtros.

**Propuesta:**

- Verificar que la exportación respete todos los filtros:
  - Incluir filtros en el nombre del archivo exportado
  - Mostrar resumen de filtros aplicados en el archivo

**Beneficio:** Exportaciones más precisas.

**Complejidad:** Baja  
**Prioridad:** Media

#### 5.2. Historial de Búsquedas

**Problema:** No se guarda el historial de búsquedas.

**Propuesta:**

- Implementar historial de búsquedas:
  - Guardar últimas 10 búsquedas en localStorage
  - Mostrar sugerencias de búsquedas anteriores
  - Limpiar historial opcional

**Beneficio:** Reutilización de búsquedas frecuentes.

**Complejidad:** Baja  
**Prioridad:** Baja

---

## Priorización Recomendada

### Alta Prioridad (Implementar Pronto)

1. ✅ **Filtro por Ubicación** - Muy útil para operaciones de almacén
2. ✅ **Filtro por Estado de Lote** - Crítico para gestión de calidad
3. ✅ **Guardar Filtros Favoritos** - Ahorra mucho tiempo
4. ✅ **Indexación de Búsqueda** - Mejora rendimiento significativamente

### Media Prioridad (Considerar en Próxima Iteración)

1. **Búsqueda por Ubicación** - Mejora UX
2. **Filtro por Rango de Stock Mínimo** - Útil para inventario
3. **Filtro por Precio de Venta** - Análisis financiero
4. **Filtros en URL** - Mejora colaboración
5. **Aplicación Automática de Filtros** - Mejora flujo

### Baja Prioridad (Considerar en Futuro)

1. **Búsqueda con Operadores Lógicos** - Complejidad alta, uso limitado
2. **Búsqueda por Voz** - Nice to have
3. **Historial de Búsquedas** - Valor limitado
4. **Filtro por Fecha de Creación** - Uso específico

---

## Conclusiones

El sistema actual de búsqueda y filtros es funcional y completo, pero hay oportunidades significativas de mejora en:

1. **Funcionalidad:** Añadir más filtros específicos (ubicación, estado de lote, precio de venta)
2. **UX:** Guardar filtros favoritos y sincronización con URL
3. **Rendimiento:** Optimización de índices y caché

Las mejoras de alta prioridad deberían implementarse primero, ya que proporcionan el mayor valor con esfuerzo razonable.

---

## Notas Técnicas

- Todos los filtros actuales están correctamente implementados en `SupabaseProductRepository`
- Los filtros funcionan tanto en `list()` como en `getAll()`
- El componente `ProductFilters` está bien estructurado y es fácil de extender
- La búsqueda actual usa `ILIKE` de Supabase, que es eficiente pero podría mejorarse con índices

---

**Próximos Pasos:**

1. Revisar esta investigación con el equipo
2. Priorizar mejoras según necesidades del negocio
3. Crear issues/tareas para cada mejora priorizada
4. Implementar mejoras de alta prioridad primero
