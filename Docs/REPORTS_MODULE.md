# Módulo de Informes

## Descripción

El módulo de informes proporciona un sistema completo para generar, visualizar y exportar diferentes tipos de informes sobre el inventario, movimientos, lotes, análisis financiero y predicciones de IA.

## Características

- **7 categorías de informes** organizadas por tipo
- **14+ tipos de informes** diferentes
- **Visualizaciones interactivas** con gráficos (Recharts)
- **Exportación** a Excel, PDF y CSV
- **Integración con IA** mediante tools MCP
- **Filtros avanzados** para personalizar informes
- **Traducciones** en español y catalán
- **Sistema de permisos** granular

## Tipos de Informes Disponibles

### Categoría: Inventario

1. **Inventario Actual**
   - Lista completa de productos con stock, valores y ubicaciones
   - Métricas: total productos, valor a coste/venta, unidades, productos en alarma

2. **Stock Bajo**
   - Productos con stock bajo o en alarma
   - Días estimados hasta agotarse
   - Clasificación por urgencia

3. **Análisis ABC**
   - Clasificación de productos por valor (principio de Pareto 80/20)
   - Gráfico de Pareto
   - Categorías A, B, C

4. **Rotación de Stock**
   - Velocidad de consumo por producto
   - Días de rotación
   - Clasificación: rápido, medio, lento

### Categoría: Movimientos

1. **Movimientos**
   - Análisis de movimientos por período
   - Gráfico temporal de entradas/salidas/ajustes
   - Filtros por tipo, producto, usuario, fecha

2. **Tendencias de Consumo**
   - Tendencias de consumo temporal
   - Top productos consumidos
   - Comparativa de períodos

### Categoría: Lotes

1. **Estado de Lotes**
   - Estado de todos los lotes
   - Filtros por producto, proveedor, estado

2. **Lotes Próximos a Caducar**
   - Lotes que caducan en los próximos días
   - Alertas de urgencia
   - Ordenados por fecha de caducidad

3. **Análisis de Defectos**
   - Lotes defectuosos
   - Análisis por proveedor
   - Tasa de defectos

### Categoría: Financiero

1. **Informe Financiero**
   - Valor del inventario a coste y venta
   - Márgenes potenciales
   - Análisis por categoría y almacén
   - Gráficos de distribución

### Categoría: Proveedores

1. **Calidad de Proveedores**
   - Rating de calidad por proveedor
   - Tasa de defectos
   - Análisis de rendimiento

### Categoría: Análisis

1. **Análisis ABC** (ver Inventario)
2. **Rotación de Stock** (ver Inventario)
3. **Tendencias de Consumo** (ver Movimientos)

### Categoría: IA

1. **Predicciones de Reposición**
   - Productos que necesitarán reposición
   - Días estimados hasta mínimo
   - Cantidad sugerida de reposición
   - Confianza de la predicción

2. **Anomalías de Lotes**
   - Detección de lotes con comportamiento anormal
   - Alta tasa de defectos
   - Lotes bloqueados por mucho tiempo
   - Lotes próximos a caducar

3. **Optimización de Stock**
   - Sugerencias de niveles óptimos de stock
   - Basado en consumo histórico
   - Cálculo EOQ (Economic Order Quantity)

## Uso

### Generar un Informe

1. Navegar a la página de Informes (`/reports`)
2. Seleccionar una categoría de informes
3. Elegir el tipo de informe deseado
4. Hacer clic en "Generar"
5. El informe se generará y mostrará en pantalla

### Exportar un Informe

1. Una vez generado el informe, hacer clic en el botón de exportación
2. Seleccionar formato: Excel, PDF o CSV
3. El archivo se descargará automáticamente

### Filtros

Algunos informes permiten aplicar filtros:

- Fechas (desde/hasta)
- Categoría de producto
- Producto específico
- Estado (para lotes)
- Usuario (para movimientos)

## Estructura de Archivos

```
src/
├── domain/
│   └── entities/
│       └── Report.ts                    # Entidades y tipos de informes
├── application/
│   └── services/
│       ├── ReportService.ts             # Servicio de generación
│       └── ExportService.ts             # Servicio de exportación (extendido)
├── presentation/
│   ├── pages/
│   │   └── ReportsPage.tsx              # Página principal
│   ├── hooks/
│   │   └── useReports.ts                # Hook para gestión de estado
│   └── components/
│       └── reports/
│           ├── ReportCategoryCard.tsx   # Card de categoría
│           ├── ReportTypeCard.tsx       # Card de tipo de informe
│           ├── ReportFilters.tsx        # Filtros
│           ├── ReportPreview.tsx       # Vista previa
│           ├── InventoryReportView.tsx  # Vista inventario
│           ├── MovementsReportView.tsx  # Vista movimientos
│           ├── LowStockReportView.tsx   # Vista stock bajo
│           ├── ABCReportView.tsx        # Vista ABC
│           ├── FinancialReportView.tsx  # Vista financiero
│           └── BatchesReportView.tsx    # Vista lotes
└── mcp-server/
    └── tools/
        ├── predictReorderNeeds.ts      # Predicción de reposición
        ├── detectBatchAnomalies.ts     # Detección de anomalías
        ├── suggestOptimalStockLevels.ts # Optimización de stock
        ├── topConsumedProducts.ts       # Top productos consumidos
        └── getExpiringBatches.ts        # Lotes próximos a caducar
```

## Permisos Requeridos

- `reports.view` - Ver página de informes (requerido)
- `reports.export_excel` - Exportar a Excel
- `reports.export_pdf` - Exportar a PDF

## Ejemplos de Uso

### Generar Informe de Inventario

```typescript
const { generateInventoryReport } = useReports();

const report = await generateInventoryReport({
  lowStockOnly: true,
  category: 'Electrónica',
});
```

### Exportar Informe

```typescript
import { ExportService } from '@application/services/ExportService';

ExportService.exportInventoryReport(report, {
  fileName: 'inventario_2025',
  format: 'xlsx',
  language: 'es-ES',
});
```

### Usar Tools MCP

Las tools MCP están disponibles en el servidor MCP y pueden ser llamadas desde el backend o desde servicios de IA. Por ejemplo:

```typescript
// En el servidor MCP
import { predictReorderNeeds } from './tools/predictReorderNeeds';

const predictions = await predictReorderNeeds(7);
```

## Notas Técnicas

- Los informes se generan en tiempo real desde la base de datos
- Los datos se calculan dinámicamente (no se cachean por defecto)
- Las exportaciones respetan el idioma activo del usuario
- Los gráficos usan Recharts para visualización interactiva
- Los informes de IA usan tools MCP cuando están disponibles

## Mejoras Futuras

- Cache de informes generados
- Programación de informes automáticos
- Envío de informes por email
- Historial de exportaciones
- Compartir informes con otros usuarios
- Filtros más avanzados
- Gráficos personalizables
