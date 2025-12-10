/**
 * Página de alarmas de stock mejorada - Diseño profesional y funcional.
 *
 * Muestra productos en diferentes niveles de alarma según su stock:
 * - Crítico: stock_current < stock_min (por debajo del mínimo)
 * - Alto: stock_min <= stock_current <= stock_min * 1.15 (hasta 15% por encima del mínimo)
 * - Medio: stock_min * 1.15 < stock_current <= stock_min * 1.50 (entre 15% y 50% por encima del mínimo)
 *
 * Características principales:
 * - Tarjetas KPI con métricas clave y acciones rápidas
 * - Vista de lista detallada con información completa
 * - Filtros avanzados (búsqueda, nivel, categoría, pasillo)
 * - Exportación a Excel con resumen
 * - Acciones rápidas: ver producto y reabastecer
 * - Diseño responsive y accesible
 *
 * @module @presentation/pages/AlarmsPage
 * @requires @domain/entities
 * @requires @presentation/hooks/useProducts
 * @requires @presentation/context/LanguageContext
 */

import {
  AlertTriangle,
  Package,
  RefreshCw,
  Download,
  TrendingDown,
  Search,
  X,
  BarChart3,
  Eye,
  MapPin,
  Tag,
  Layers,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import type { Product } from '@domain/entities';
import { Button } from '../components/ui/Button';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../hooks/useProducts';
import { cn } from '../lib/cn';

type AlarmLevel = 'critical' | 'high' | 'medium';

interface AlarmFilters {
  level: AlarmLevel | 'all';
  category: string;
  aisle: string;
}

/**
 * Calcula el nivel de alarma de un producto según los criterios establecidos.
 *
 * Criterios:
 * - Crítico: stock_current < stock_min (por debajo del mínimo)
 * - Alto: stock_min <= stock_current <= stock_min * 1.15 (hasta 15% por encima del mínimo)
 * - Medio: stock_min * 1.15 < stock_current <= stock_min * 1.50 (entre 15% y 50% por encima del mínimo)
 *
 * @param {Product} product - Producto a evaluar
 * @returns {AlarmLevel} Nivel de alarma: "critical", "high" o "medium"
 */
function getAlarmLevel(product: Product): AlarmLevel {
  const { stockCurrent, stockMin } = product;

  // Crítico: stock actual por debajo del mínimo
  if (stockCurrent < stockMin) {
    return 'critical';
  }

  // Alto: stock actual entre el mínimo y 15% por encima del mínimo
  const highThreshold = stockMin * 1.15;
  if (stockCurrent >= stockMin && stockCurrent <= highThreshold) {
    return 'high';
  }

  // Medio: stock actual entre 15% y 50% por encima del mínimo
  const mediumThreshold = stockMin * 1.5;
  if (stockCurrent > highThreshold && stockCurrent <= mediumThreshold) {
    return 'medium';
  }

  // Si está por encima del 50%, no está en alarma
  // Retornamos null implícitamente (no debería estar en la lista)
  return 'medium'; // Por compatibilidad, pero estos productos no deberían aparecer
}

/**
 * Verifica si un producto está en alarma según los criterios.
 *
 * Un producto está en alarma si:
 * - stock_current < stock_min (crítico)
 * - stock_min <= stock_current <= stock_min * 1.15 (alto)
 * - stock_min * 1.15 < stock_current <= stock_min * 1.50 (medio)
 *
 * @param {Product} product - Producto a verificar
 * @returns {boolean} true si el producto está en alarma
 */
function isProductInAlarm(product: Product): boolean {
  const { stockCurrent, stockMin } = product;
  const mediumThreshold = stockMin * 1.5;
  // Está en alarma si está por debajo o hasta 50% por encima del mínimo
  return stockCurrent <= mediumThreshold;
}

/**
 * Calcula el porcentaje de stock respecto al mínimo.
 *
 * @param {Product} product - Producto a calcular
 * @returns {number} Porcentaje (0-100+)
 */
function getStockPercentage(product: Product): number {
  if (product.stockMin === 0) return 0;
  return Math.round((product.stockCurrent / product.stockMin) * 100);
}

/**
 * Calcula el déficit de stock necesario.
 *
 * @param {Product} product - Producto a calcular
 * @returns {number} Cantidad necesaria para llegar al mínimo
 */
function getStockDeficit(product: Product): number {
  return Math.max(0, product.stockMin - product.stockCurrent);
}

export function AlarmsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { products, loading: loadingProducts, pagination, list, getAll } = useProducts();

  const [filters, setFilters] = React.useState<AlarmFilters>({
    level: 'all',
    category: '',
    aisle: '',
  });

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(50); // Paginación más grande para alarmas
  const [exporting, setExporting] = React.useState(false);
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<'excel' | 'csv'>('excel');
  const [exportLevel, setExportLevel] = React.useState<'all' | AlarmLevel>('all');

  // Estadísticas totales (cargadas una sola vez, diferidas)
  const [totalStats, setTotalStats] = React.useState({
    critical: 0,
    high: 0,
    medium: 0,
    total: 0,
  });
  const [statsLoading, setStatsLoading] = React.useState(true);

  // Productos cargados cuando hay filtro de nivel (para paginación en cliente)
  const [allFilteredProducts, setAllFilteredProducts] = React.useState<Product[]>([]);
  const [loadingFilteredProducts, setLoadingFilteredProducts] = React.useState(false);

  // Cargar estadísticas totales solo una vez al montar (en background)
  React.useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        // Cargar todos los productos activos para calcular estadísticas correctamente
        // No usar lowStock porque necesitamos incluir productos "Medio" que tienen stock > stock_min * 1.15
        const allProds = await getAll({
          includeInactive: false,
          // No usar lowStock aquí porque excluiría productos "Medio"
        });

        if (cancelled) return;

        // Calcular estadísticas rápidamente usando la función getAlarmLevel
        let critical = 0;
        let high = 0;
        let medium = 0;

        for (const p of allProds) {
          if (!p.isActive) continue;
          const level = getAlarmLevel(p);
          // Solo contar productos que están realmente en alarma (hasta 50% por encima del mínimo)
          if (isProductInAlarm(p)) {
            if (level === 'critical') critical++;
            else if (level === 'high') high++;
            else if (level === 'medium') medium++;
          }
        }

        setTotalStats({
          critical,
          high,
          medium,
          total: critical + high + medium,
        });
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [getAll]); // Solo una vez al montar

  // Cargar todos los productos cuando hay un filtro de nivel activo (para paginación en cliente)
  React.useEffect(() => {
    if (filters.level === 'all') {
      setAllFilteredProducts([]);
      return;
    }

    let cancelled = false;
    setLoadingFilteredProducts(true);

    const loadFilteredProducts = async () => {
      try {
        // No usar lowStock porque excluiría productos "Medio" que tienen stock > stock_min * 1.15
        const allProds = await getAll({
          includeInactive: false,
          // No usar lowStock aquí para incluir todos los niveles de alarma
          category: filters.category || undefined,
          aisle: filters.aisle || undefined,
        });

        if (cancelled) return;

        // Filtrar por nivel y solo productos en alarma
        const filtered = allProds.filter((p) => {
          if (!p.isActive) return false;
          // Solo incluir productos que están realmente en alarma
          if (!isProductInAlarm(p)) return false;
          const level = getAlarmLevel(p);
          return level === filters.level;
        });

        setAllFilteredProducts(filtered);
      } catch (error) {
        console.error('Error al cargar productos filtrados:', error);
      } finally {
        if (!cancelled) {
          setLoadingFilteredProducts(false);
        }
      }
    };

    loadFilteredProducts();

    return () => {
      cancelled = true;
    };
  }, [filters.level, filters.category, filters.aisle, getAll]);

  // Cargar productos con paginación del servidor cuando NO hay filtro de nivel
  React.useEffect(() => {
    if (filters.level !== 'all') {
      // Cuando hay filtro de nivel, usamos allFilteredProducts (cargado arriba)
      return;
    }

    const loadProducts = async () => {
      try {
        await list(
          {
            includeInactive: false,
            lowStock: true, // Solo productos en alarma
            category: filters.category || undefined,
            aisle: filters.aisle || undefined,
          },
          { page: currentPage, pageSize },
        );
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };

    loadProducts();
  }, [filters.category, filters.aisle, filters.level, currentPage, pageSize, list]);

  // Filtrar productos por nivel de alarma
  // Si hay filtro de nivel, usar allFilteredProducts (ya filtrados); si no, usar products del servidor
  const filteredProducts = React.useMemo(() => {
    if (filters.level === 'all') {
      return products;
    }

    // Cuando hay filtro de nivel, usar allFilteredProducts (ya están filtrados por nivel)
    return allFilteredProducts;
  }, [products, filters.level, allFilteredProducts]);

  // Ordenar productos por criticidad (más crítico primero)
  const sortedProducts = React.useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const levelA = getAlarmLevel(a);
      const levelB = getAlarmLevel(b);

      // Ordenar por nivel primero
      const levelOrder: Record<AlarmLevel, number> = {
        critical: 0,
        high: 1,
        medium: 2,
      };

      if (levelOrder[levelA] !== levelOrder[levelB]) {
        return levelOrder[levelA] - levelOrder[levelB];
      }

      // Si mismo nivel, ordenar por ratio stock/stockMin (más bajo primero)
      const ratioA = a.stockMin > 0 ? a.stockCurrent / a.stockMin : 0;
      const ratioB = b.stockMin > 0 ? b.stockCurrent / b.stockMin : 0;
      return ratioA - ratioB;
    });
  }, [filteredProducts]);

  // Paginar en el cliente cuando hay filtro de nivel activo
  const paginatedProducts = React.useMemo(() => {
    if (filters.level === 'all') {
      // Sin filtro de nivel: usar productos del servidor (ya paginados)
      return sortedProducts;
    }

    // Con filtro de nivel: paginar en el cliente
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedProducts.slice(startIndex, endIndex);
  }, [sortedProducts, filters.level, currentPage, pageSize]);

  const criticalityConfig = React.useMemo<
    Record<
      AlarmLevel,
      {
        bg: string;
        border: string;
        text: string;
        badge: string;
        progressBg: string;
        progressFill: string;
        label: string;
        icon: React.ReactNode;
      }
    >
  >(
    () => ({
      critical: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        progressBg: 'bg-red-100 dark:bg-red-900/30',
        progressFill: 'bg-red-500 dark:bg-red-600',
        label: t('alarms.critical'),
        icon: <AlertTriangle className="h-5 w-5" />,
      },
      high: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-300 dark:border-orange-700',
        text: 'text-orange-700 dark:text-orange-400',
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        progressBg: 'bg-orange-100 dark:bg-orange-900/30',
        progressFill: 'bg-orange-500 dark:bg-orange-600',
        label: t('alarms.high'),
        icon: <TrendingDown className="h-5 w-5" />,
      },
      medium: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-700 dark:text-yellow-400',
        badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        progressBg: 'bg-yellow-100 dark:bg-yellow-900/30',
        progressFill: 'bg-yellow-500 dark:bg-yellow-600',
        label: t('alarms.medium'),
        icon: <BarChart3 className="h-5 w-5" />,
      },
    }),
    [t],
  );

  const handleViewProduct = (product: Product) => {
    // Pasar estado para que ProductDetailPage sepa que viene de alarmas
    navigate(`/products/${product.id}`, { state: { from: 'alarms' } });
  };

  const handleClearFilters = () => {
    React.startTransition(() => {
      setFilters({
        level: 'all',
        category: '',
        aisle: '',
      });
      setCurrentPage(1);
    });
  };

  const handleFilterChange = React.useCallback((newFilters: Partial<AlarmFilters>) => {
    React.startTransition(() => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setCurrentPage(1);
    });
  }, []);

  const handleExport = React.useCallback(async () => {
    setExporting(true);
    try {
      // Cargar todos los productos activos (no usar lowStock porque excluiría productos "Medio")
      const allProds = await getAll({
        includeInactive: false,
        // No usar lowStock aquí para incluir todos los niveles de alarma (crítico, alto, medio)
      });

      // Determinar qué productos exportar según el nivel seleccionado
      let productsToExport: Product[] = [];

      if (exportLevel === 'all') {
        // Exportar todos los productos en alarma (crítico, alto y medio)
        productsToExport = allProds.filter((p) => {
          if (!p.isActive) return false;
          return isProductInAlarm(p);
        });
      } else {
        // Exportar solo productos del nivel seleccionado
        productsToExport = allProds.filter((p) => {
          if (!p.isActive) return false;
          if (!isProductInAlarm(p)) return false;
          const level = getAlarmLevel(p);
          return level === exportLevel;
        });
      }

      if (productsToExport.length === 0) {
        alert(t('alarms.export.noData') || 'No hay datos para exportar');
        setExporting(false);
        return;
      }
      const lang = t('common.language') || 'es-ES';
      const isCatalan = lang.includes('ca');

      // Preparar datos para exportar
      const exportData = productsToExport.map((product) => {
        const level = getAlarmLevel(product);
        const levelLabel = criticalityConfig[level].label;
        const percentage = getStockPercentage(product);
        const deficit = getStockDeficit(product);

        return {
          [isCatalan ? 'Codi' : 'Código']: product.code,
          [isCatalan ? 'Nom' : 'Nombre']: product.name,
          [isCatalan ? 'Categoria' : 'Categoría']: product.category || '',
          [isCatalan ? 'Ubicació' : 'Ubicación']:
            `${product.aisle || ''} / ${product.shelf || ''}`,
          [isCatalan ? "Nivell d'Alarma" : 'Nivel de Alarma']: levelLabel,
          [isCatalan ? 'Estoc Actual' : 'Stock Actual']: product.stockCurrent,
          [isCatalan ? 'Estoc Mínim' : 'Stock Mínimo']: product.stockMin,
          [isCatalan ? 'Estoc Màxim' : 'Stock Máximo']: product.stockMax || '',
          [isCatalan ? 'Percentatge' : 'Porcentaje']: `${percentage}%`,
          [isCatalan ? 'Dèficit' : 'Déficit']: deficit > 0 ? `+${deficit}` : '0',
          [isCatalan ? 'Unitats' : 'Unidades']: product.unitOfMeasure || '',
          [isCatalan ? 'Codi de Barres' : 'Código de Barras']: product.barcode || '',
          [isCatalan ? 'Preu Cost' : 'Precio Coste']: product.costPrice || '',
          [isCatalan ? 'Preu Venda' : 'Precio Venta']: product.salePrice || '',
        };
      });

      if (exportFormat === 'excel') {
        // Crear worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();

        // Ajustar anchos de columna
        const colWidths = [
          { wch: 15 }, // Código
          { wch: 40 }, // Nombre
          { wch: 20 }, // Categoría
          { wch: 20 }, // Ubicación
          { wch: 15 }, // Nivel
          { wch: 12 }, // Stock Actual
          { wch: 12 }, // Stock Mínimo
          { wch: 12 }, // Stock Máximo
          { wch: 12 }, // Porcentaje
          { wch: 12 }, // Déficit
          { wch: 12 }, // Unidades
          { wch: 15 }, // Código de Barras
          { wch: 12 }, // Precio Coste
          { wch: 12 }, // Precio Venta
        ];
        worksheet['!cols'] = colWidths;

        // Añadir hoja de resumen
        const summaryData = [
          {
            [isCatalan ? 'Nivell' : 'Nivel']: criticalityConfig.critical.label,
            [isCatalan ? 'Quantitat' : 'Cantidad']: totalStats.critical,
          },
          {
            [isCatalan ? 'Nivell' : 'Nivel']: criticalityConfig.high.label,
            [isCatalan ? 'Quantitat' : 'Cantidad']: totalStats.high,
          },
          {
            [isCatalan ? 'Nivell' : 'Nivel']: criticalityConfig.medium.label,
            [isCatalan ? 'Quantitat' : 'Cantidad']: totalStats.medium,
          },
          {
            [isCatalan ? 'Nivell' : 'Nivel']: isCatalan ? 'Total' : 'Total',
            [isCatalan ? 'Quantitat' : 'Cantidad']: totalStats.total,
          },
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        summarySheet['!cols'] = [{ wch: 20 }, { wch: 12 }];

        XLSX.utils.book_append_sheet(
          workbook,
          summarySheet,
          isCatalan ? 'Resum' : 'Resumen',
        );
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          isCatalan ? 'Alarmes' : 'Alarmas',
        );

        // Generar archivo Excel
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const levelLabel =
          exportLevel === 'all'
            ? isCatalan
              ? 'tots'
              : 'todos'
            : criticalityConfig[exportLevel].label.toLowerCase();
        link.download = `alarmas_stock_${levelLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Generar CSV
        const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportData));
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const levelLabel =
          exportLevel === 'all'
            ? isCatalan
              ? 'tots'
              : 'todos'
            : criticalityConfig[exportLevel].label.toLowerCase();
        link.download = `alarmas_stock_${levelLabel}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setShowExportDialog(false);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert(t('alarms.export.error') || 'Error al exportar los datos');
    } finally {
      setExporting(false);
    }
  }, [getAll, exportLevel, exportFormat, t, totalStats, criticalityConfig]);

  // Función para refrescar los datos
  const handleRefresh = React.useCallback(async () => {
    try {
      await list(
        {
          includeInactive: false,
          lowStock: true,
          category: filters.category || undefined,
          aisle: filters.aisle || undefined,
        },
        { page: currentPage, pageSize },
      );

      // Recargar estadísticas también
      const allProds = await getAll({
        includeInactive: false,
      });

      let critical = 0;
      let high = 0;
      let medium = 0;

      for (const p of allProds) {
        if (!p.isActive) continue;
        if (!isProductInAlarm(p)) continue;
        const level = getAlarmLevel(p);
        if (level === 'critical') critical++;
        else if (level === 'high') high++;
        else if (level === 'medium') medium++;
      }

      setTotalStats({
        critical,
        high,
        medium,
        total: critical + high + medium,
      });
    } catch (error) {
      console.error('Error al refrescar productos:', error);
    }
  }, [list, getAll, filters, currentPage, pageSize]);

  const hasActiveFilters = filters.level !== 'all' || filters.category || filters.aisle;

  // Calcular el total de productos filtrados
  // Si hay un filtro de nivel activo, usar totalStats; si no, usar pagination.total
  const filteredTotal = React.useMemo(() => {
    if (filters.level !== 'all' && totalStats) {
      return totalStats[filters.level] || 0;
    }
    return pagination?.total || 0;
  }, [filters.level, totalStats, pagination?.total]);

  const totalPages = Math.ceil(filteredTotal / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            {t('alarms.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {statsLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-r-transparent" />
            ) : (
              <>
                {totalStats.total} {t('alarms.productsInAlarm')}
                {hasActiveFilters && (
                  <span className="ml-2 text-primary-600 dark:text-primary-400">
                    ({t('alarms.filtered') || 'filtrados'})
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportDialog(true)}
            disabled={totalStats.total === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('alarms.export') || 'Exportar'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI mejoradas */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(['critical', 'high', 'medium'] as const).map((level) => {
          // Usar totalStats para mostrar números reales siempre
          const totalCount = totalStats[level];
          const config = criticalityConfig[level];
          const totalPercentage =
            totalStats.total > 0 ? Math.round((totalCount / totalStats.total) * 100) : 0;
          const isActive = filters.level === level;

          return (
            <div
              key={level}
              className={cn(
                'group relative overflow-hidden rounded-xl border-2 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:bg-gray-800',
                config.border,
                isActive && 'ring-2 ring-offset-2',
                isActive && config.progressFill.replace('bg-', 'ring-'),
                'hover:scale-[1.02]',
              )}
            >
              {/* Borde decorativo superior */}
              <div className={cn('absolute inset-x-0 top-0 h-1', config.progressFill)} />

              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl',
                      config.badge,
                    )}
                  >
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {config.label}
                    </p>
                    <p className={cn('text-3xl font-bold', config.text)}>{totalCount}</p>
                  </div>
                </div>

                {/* Badge de porcentaje */}
                {totalCount > 0 && (
                  <div
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold',
                      config.badge,
                    )}
                  >
                    {totalPercentage}%
                  </div>
                )}
              </div>

              {/* Barra de progreso mejorada */}
              {totalCount > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>{t('alarms.ofTotal') || 'Del total'}</span>
                    <span className="font-medium">
                      {totalCount} / {totalStats.total}
                    </span>
                  </div>
                  <div className={cn('h-2 w-full rounded-full', config.progressBg)}>
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-500 ease-out',
                        config.progressFill,
                      )}
                      style={{ width: `${totalPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Acción rápida */}
              {totalCount > 0 && (
                <button
                  onClick={() =>
                    handleFilterChange({ level: filters.level === level ? 'all' : level })
                  }
                  className={cn(
                    'mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
                    isActive ? config.progressFill : config.badge,
                    isActive ? 'text-white' : '',
                    'hover:opacity-80',
                  )}
                >
                  {isActive ? (
                    <>
                      <X className="h-4 w-4" />
                      {t('alarms.clearFilter') || 'Quitar filtro'}
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      {t('alarms.filterBy') || 'Filtrar por'} {config.label}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Lista de productos mejorada */}
      {sortedProducts.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
            <Package className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {hasActiveFilters
              ? t('alarms.noResults') || 'No hay resultados con los filtros aplicados'
              : t('alarms.noAlarms') || 'Sin alarmas'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters
              ? t('alarms.tryOtherFilters') || 'Prueba con otros filtros'
              : t('alarms.allStockOk') || 'Todos los productos tienen stock suficiente'}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="mt-4 gap-2"
            >
              <X className="h-4 w-4" />
              {t('alarms.clearFilters') || 'Limpiar filtros'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(loadingFilteredProducts || loadingProducts) && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            </div>
          )}
          {!loadingFilteredProducts &&
            !loadingProducts &&
            paginatedProducts.map((product) => {
              const level = getAlarmLevel(product);
              const config = criticalityConfig[level];
              const deficit = getStockDeficit(product);
              const percentage = getStockPercentage(product);
              const progressPercentage = Math.min(100, Math.max(0, percentage));

              return (
                <div
                  key={product.id}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border-2 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-gray-800',
                    config.border,
                    'hover:scale-[1.01]',
                  )}
                >
                  {/* Borde lateral decorativo */}
                  <div
                    className={cn('absolute inset-y-0 left-0 w-1', config.progressFill)}
                  />

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Información del producto */}
                    <div className="flex flex-1 items-start gap-4">
                      {/* Icono de nivel */}
                      <div
                        className={cn(
                          'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-sm',
                          config.badge,
                        )}
                      >
                        {config.icon}
                      </div>

                      {/* Detalles del producto */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Nombre y badge */}
                        <div className="flex items-start gap-2">
                          <h3 className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-50 truncate">
                            {product.name}
                          </h3>
                          <span
                            className={cn(
                              'shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                              config.badge,
                            )}
                          >
                            {config.label}
                          </span>
                        </div>

                        {/* Metadatos */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" />
                            <span className="font-mono font-medium">{product.code}</span>
                          </div>
                          {product.category && (
                            <div className="flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5" />
                              <span>{product.category}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>
                              {product.aisle} / {product.shelf}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Panel de stock y acciones */}
                    <div className="flex flex-col gap-3 lg:w-80 lg:items-end">
                      {/* Indicadores de stock */}
                      <div className="w-full space-y-2">
                        {/* Valores numéricos */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {t('alarms.current')}:
                            </span>
                            <span className={cn('text-lg font-bold', config.text)}>
                              {product.stockCurrent}
                            </span>
                            <span className="text-xs text-gray-400">
                              / {product.stockMin}{' '}
                              {t('alarms.minimum')?.toLowerCase() || 'mín'}
                            </span>
                          </div>
                          <div
                            className={cn(
                              'rounded-lg px-2 py-1 text-xs font-semibold',
                              config.badge,
                            )}
                          >
                            {percentage}%
                          </div>
                        </div>

                        {/* Barra de progreso mejorada */}
                        <div className="relative">
                          <div
                            className={cn('h-3 w-full rounded-full', config.progressBg)}
                          >
                            <div
                              className={cn(
                                'h-3 rounded-full transition-all duration-300',
                                config.progressFill,
                              )}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          {/* Indicador de mínimo */}
                          <div className="absolute left-0 top-0 h-3 w-0.5 bg-gray-400 dark:bg-gray-600" />
                        </div>

                        {/* Mensaje de déficit */}
                        {deficit > 0 && (
                          <div
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium',
                              config.bg,
                            )}
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <span className={config.text}>
                              {t('alarms.need')}{' '}
                              <span className="font-bold">+{deficit}</span>{' '}
                              {t('alarms.units') || 'unidades'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción mejorados */}
                      <div className="flex w-full gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProduct(product)}
                          className="w-full gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          {t('common.view')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('pagination.showing') || 'Mostrando'}{' '}
                {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, filteredTotal)}{' '}
                {t('pagination.of') || 'de'} {filteredTotal} {t('alarms.productsInAlarm')}
                {filters.level !== 'all' && (
                  <span className="ml-2 text-primary-600 dark:text-primary-400">
                    ({t('alarms.filtered') || 'filtrados'})
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    currentPage === 1 || loadingProducts || loadingFilteredProducts
                  }
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  {t('pagination.previous') || 'Anterior'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    currentPage >= totalPages ||
                    loadingProducts ||
                    loadingFilteredProducts
                  }
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  {t('pagination.next') || 'Siguiente'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de exportación */}
      <Dialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        size="md"
      >
        <DialogHeader>
          <DialogTitle>{t('alarms.export') || 'Exportar Alarmas'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Selección de formato */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('alarms.export.format') || 'Formato'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat('excel')}
                className={cn(
                  'flex items-center gap-3 rounded-lg border-2 p-4 transition-all',
                  exportFormat === 'excel'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
                )}
              >
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">Excel</p>
                  <p className="text-xs text-gray-500">.xlsx</p>
                </div>
              </button>
              <button
                onClick={() => setExportFormat('csv')}
                className={cn(
                  'flex items-center gap-3 rounded-lg border-2 p-4 transition-all',
                  exportFormat === 'csv'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
                )}
              >
                <FileText className="h-6 w-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">CSV</p>
                  <p className="text-xs text-gray-500">.csv</p>
                </div>
              </button>
            </div>
          </div>

          {/* Selección de nivel */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('alarms.export.level') || 'Nivel de Alarma'}
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setExportLevel('all')}
                className={cn(
                  'w-full rounded-lg border-2 p-3 text-left transition-all',
                  exportLevel === 'all'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
                )}
              >
                <p className="font-medium">
                  {t('alarms.allLevels') || 'Todos los niveles'}
                </p>
                <p className="text-xs text-gray-500">
                  {totalStats.total} {t('alarms.productsInAlarm')}
                </p>
              </button>
              {(['critical', 'high', 'medium'] as const).map((level) => {
                const config = criticalityConfig[level];
                const count = totalStats[level];
                return (
                  <button
                    key={level}
                    onClick={() => setExportLevel(level)}
                    className={cn(
                      'w-full rounded-lg border-2 p-3 text-left transition-all',
                      exportLevel === level
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium',
                          config.badge,
                        )}
                      >
                        {config.label}
                      </div>
                      <p className="text-xs text-gray-500">
                        {count} {t('alarms.productsInAlarm')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(false)}
            disabled={exporting}
          >
            {t('common.cancel') || 'Cancelar'}
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={exporting || totalStats.total === 0}
            className="gap-2"
          >
            {exporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t('alarms.export.exporting') || 'Exportando...'}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t('alarms.export.export') || 'Exportar'}
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
