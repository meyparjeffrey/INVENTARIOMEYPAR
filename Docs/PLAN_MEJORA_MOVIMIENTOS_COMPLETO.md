# Plan Detallado: Mejora Completa Página de Movimientos

## Objetivo
Mejorar la página de movimientos de inventario siguiendo mejores prácticas de desarrollo senior, diseño UI/UX profesional, lógica frontend/backend sólida, DevOps y QA exhaustivo.

---

## FASE 1: Análisis y Corrección de Problemas Identificados

### 1.1 Problemas Críticos a Resolver
- [ ] **Columna "Tipus" solo muestra "Ajust"** - Necesita mostrar todos los tipos correctamente
- [ ] **Cursor pointer no funciona** - La mano no se desplaza en la tabla
- [ ] **Falta paginación completa** - Añadir como en ProductsPage
- [ ] **No se muestran cambios de producto** - Código de barras, nombre, activo en movimientos
- [ ] **Exportar limitado** - Añadir opciones: todo, solo entradas, solo salidas, cambios

### 1.2 Investigación y Benchmarking
- [x] Investigar mejores prácticas UI/UX de páginas de movimientos
- [ ] Analizar ejemplos de sistemas de inventario profesionales
- [ ] Revisar documentación de etiquetado de tipos de movimiento
- [ ] Estudiar patrones de diseño para tablas de datos complejas

---

## FASE 2: Correcciones Técnicas Inmediatas

### 2.1 Arreglar Columna "Tipus"
**Problema**: Solo muestra "Ajust" para todos los movimientos
**Solución**:
- Verificar mapeo de tipos en `MovementTable.tsx`
- Asegurar que `movementTypeConfig` cubre todos los tipos
- Verificar traducciones de tipos
- Añadir tooltips explicativos para cada tipo

**Archivos a modificar**:
- `src/presentation/components/movements/MovementTable.tsx`
- `src/presentation/context/LanguageContext.tsx`

### 2.2 Arreglar Cursor Pointer
**Problema**: La mano no se desplaza en la tabla
**Solución**:
- Verificar que `cursor-pointer` esté aplicado correctamente
- Asegurar que `onClick` en `<tr>` funcione
- Verificar que no haya elementos que bloqueen el evento
- Probar con diferentes navegadores

**Archivos a modificar**:
- `src/presentation/components/movements/MovementTable.tsx`

### 2.3 Añadir Paginación Completa
**Problema**: Falta paginación como en ProductsPage
**Solución**:
- Copiar lógica de paginación de `ProductsPage.tsx`
- Añadir controles: Primera, Anterior, Número de página, Siguiente, Última
- Añadir selector de items por página
- Mostrar información "Mostrando X-Y de Z"

**Archivos a modificar**:
- `src/presentation/pages/MovementsPage.tsx`
- Revisar `src/presentation/hooks/useMovements.ts`

---

## FASE 3: Mejoras de Funcionalidad

### 3.1 Mostrar Cambios de Producto en Movimientos
**Objetivo**: Mostrar cuando un movimiento incluye cambios en producto (código, nombre, activo)

**Implementación**:
- Analizar campo `comments` de movimientos ADJUSTMENT
- Extraer información de cambios (código, nombre, ubicación, activo)
- Mostrar badges o indicadores visuales en la tabla
- Añadir columna opcional "Cambios" o expandir columna "Motivo"

**Archivos a modificar**:
- `src/presentation/components/movements/MovementTable.tsx`
- Crear utilidad para parsear cambios de producto

### 3.2 Mejorar Exportar con Opciones
**Objetivo**: Permitir exportar con filtros específicos

**Opciones a añadir**:
- Exportar todo
- Exportar solo entradas (IN)
- Exportar solo salidas (OUT)
- Exportar solo ajustes (ADJUSTMENT)
- Exportar solo transferencias (TRANSFER)
- Exportar cambios de nombre/ubicación

**Implementación**:
- Crear componente `ExportMovementsDialog.tsx` similar a `ExportDialog.tsx` de productos
- Añadir checkboxes para seleccionar tipos
- Filtrar datos antes de exportar
- Mantener formato Excel existente

**Archivos a crear/modificar**:
- `src/presentation/components/movements/ExportMovementsDialog.tsx` (NUEVO)
- `src/presentation/pages/MovementsPage.tsx`

---

## FASE 4: Mejoras UI/UX Profesionales

### 4.1 Botón de Ayuda/Información
**Objetivo**: Explicar funcionalidades, especialmente "Ajust"

**Implementación**:
- Crear componente `HelpTooltip.tsx` o `InfoButton.tsx`
- Añadir icono de información (Info, HelpCircle) junto a botones
- Tooltips explicativos con:
  - **Ajust**: "Corrige discrepancias de inventario. Usa para errores de conteo, daños, pérdidas o auditorías"
  - **Entrada**: "Aumenta el stock del producto"
  - **Salida**: "Disminuye el stock del producto"
- Modal de ayuda completo con sección FAQ

**Archivos a crear**:
- `src/presentation/components/ui/HelpTooltip.tsx` (NUEVO)
- `src/presentation/components/movements/MovementsHelpModal.tsx` (NUEVO)

### 4.2 Mejoras Visuales
- [ ] Mejorar espaciado y padding en tabla
- [ ] Añadir animaciones sutiles en hover
- [ ] Mejorar contraste y legibilidad
- [ ] Añadir estados de carga más claros
- [ ] Mejorar feedback visual en acciones

### 4.3 Responsive Design
- [ ] Verificar en móvil (< 768px)
- [ ] Verificar en tablet (768px - 1024px)
- [ ] Verificar en desktop (> 1024px)
- [ ] Ajustar tabla para scroll horizontal en móvil
- [ ] Colapsar columnas menos importantes en móvil

---

## FASE 5: Testing Exhaustivo con Browser

### 5.1 Pruebas Funcionales
- [ ] **Crear productos nuevos**: Añadir 3-5 productos diferentes
- [ ] **Crear movimientos de entrada**: 5 entradas con diferentes productos
- [ ] **Crear movimientos de salida**: 5 salidas verificando stock
- [ ] **Crear ajustes**: 2-3 ajustes de diferentes tipos
- [ ] **Modificar productos**: Cambiar nombre, código de barras, activo
- [ ] **Verificar que cambios aparecen en movimientos**

### 5.2 Pruebas de Filtros y Búsqueda
- [ ] **Filtro Solo Entradas**: Verificar que solo muestra IN
- [ ] **Filtro Solo Salidas**: Verificar que solo muestra OUT
- [ ] **Filtro por fecha**: Probar rangos de fechas
- [ ] **Búsqueda por código**: Buscar código de producto
- [ ] **Búsqueda por nombre**: Buscar nombre de producto
- [ ] **Búsqueda por motivo**: Buscar en motivo/comentarios
- [ ] **Combinar filtros**: Múltiples filtros simultáneos

### 5.3 Pruebas de Exportar
- [ ] **Exportar todo**: Verificar que exporta todos los movimientos
- [ ] **Exportar solo entradas**: Verificar filtro IN
- [ ] **Exportar solo salidas**: Verificar filtro OUT
- [ ] **Exportar ajustes**: Verificar filtro ADJUSTMENT
- [ ] **Verificar formato Excel**: Abrir y verificar columnas

### 5.4 Pruebas de Paginación
- [ ] **Navegar páginas**: Primera, anterior, siguiente, última
- [ ] **Cambiar items por página**: 10, 20, 50, 100
- [ ] **Verificar contador**: "Mostrando X-Y de Z"
- [ ] **Paginación con filtros**: Verificar que funciona con filtros activos

### 5.5 Pruebas de Interacción
- [ ] **Click en fila**: Verificar que abre modal de detalle
- [ ] **Click en producto**: Verificar que navega a detalle de producto
- [ ] **Hover en filas**: Verificar cambio visual
- [ ] **Botones de acción**: Verificar que todos funcionan

### 5.6 Pruebas DevTools
- [ ] **Console**: Sin errores en rojo
- [ ] **Network**: Verificar queries a Supabase correctas
- [ ] **Performance**: Tiempos de carga aceptables
- [ ] **Memory**: Sin memory leaks
- [ ] **Accessibility**: Verificar ARIA labels

---

## FASE 6: QA Completo de Diseño y Lógica

### 6.1 QA de Diseño UI
- [ ] **Consistencia visual**: Colores, tipografía, espaciado
- [ ] **Jerarquía visual**: Elementos importantes destacados
- [ ] **Estados visuales**: Hover, active, disabled, loading
- [ ] **Iconografía**: Iconos consistentes y claros
- [ ] **Dark mode**: Verificar en modo oscuro

### 6.2 QA de Lógica
- [ ] **Validaciones**: Stock insuficiente, campos requeridos
- [ ] **Cálculos**: Estadísticas correctas
- [ ] **Actualización de stock**: Verificar que se actualiza correctamente
- [ ] **Filtros**: Lógica de filtrado correcta
- [ ] **Búsqueda**: Algoritmo de búsqueda eficiente
- [ ] **Paginación**: Cálculos de páginas correctos

### 6.3 QA de UX
- [ ] **Flujo de usuario**: Flujo intuitivo y claro
- [ ] **Feedback**: Mensajes de éxito/error claros
- [ ] **Carga**: Estados de carga visibles
- [ ] **Navegación**: Fácil navegación entre elementos
- [ ] **Accesibilidad**: Navegación por teclado

---

## FASE 7: Documentación y Finalización

### 7.1 Documentación
- [ ] Actualizar README con nuevas funcionalidades
- [ ] Documentar componentes nuevos
- [ ] Añadir comentarios JSDoc en español
- [ ] Crear guía de usuario para movimientos

### 7.2 Git y Deployment
- [ ] Commit de cambios
- [ ] Push a remoto
- [ ] Verificar que no hay conflictos
- [ ] Preparar para merge

---

## Checklist Final

### Funcionalidad
- [ ] Todos los tipos de movimiento se muestran correctamente
- [ ] Cursor pointer funciona en toda la tabla
- [ ] Paginación completa implementada
- [ ] Cambios de producto visibles en movimientos
- [ ] Exportar con opciones funciona
- [ ] Botón de ayuda implementado

### Testing
- [ ] Pruebas funcionales completadas
- [ ] Pruebas de filtros y búsqueda completadas
- [ ] Pruebas de exportar completadas
- [ ] Pruebas de paginación completadas
- [ ] DevTools verificado sin errores

### UI/UX
- [ ] Diseño profesional y consistente
- [ ] Responsive funcionando
- [ ] Dark mode funcionando
- [ ] Accesibilidad verificada

### Código
- [ ] Sin errores de linting
- [ ] Tipos TypeScript correctos
- [ ] Documentación JSDoc completa
- [ ] Código optimizado y refactorizado

---

## Tiempo Estimado
- **Fase 1-2**: 2-3 horas (Correcciones críticas)
- **Fase 3**: 3-4 horas (Mejoras funcionales)
- **Fase 4**: 2-3 horas (UI/UX)
- **Fase 5**: 3-4 horas (Testing exhaustivo)
- **Fase 6**: 2 horas (QA)
- **Fase 7**: 1 hora (Documentación)

**Total**: 13-17 horas

---

## Prioridades
1. **CRÍTICO**: Arreglar columna Tipus, cursor pointer, paginación
2. **ALTO**: Mostrar cambios de producto, mejorar exportar
3. **MEDIO**: Botón de ayuda, mejoras UI/UX
4. **BAJO**: Documentación, optimizaciones menores

