import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Download,
  Package,
  RefreshCw,
  Search,
  BarChart3,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { useProducts } from '../../hooks/useProducts';
import { ProductTable } from '../products/ProductTable';
import { Product } from '../../../domain/entities/Product';
import { ExportDialog, ColumnOption } from '../products/ExportDialog';
import { useToast } from '../ui/Toast';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import { SupabaseInventoryMovementRepository } from '../../../infrastructure/repositories/SupabaseInventoryMovementRepository';

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'composed';
type ChartMetric = 'stock' | 'category' | 'warehouse';

export function HistoricalStockReport() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const { loading: hookLoading, getAll } = useProducts();
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('category');

  const movementRepositoryRef = React.useRef(new SupabaseInventoryMovementRepository());

  // Cargar productos actuales o históricos según el modo
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        if (isHistoricalMode && selectedDate) {
          // Cargar datos históricos por almacén
          const date = new Date(selectedDate);
          date.setHours(23, 59, 59, 999); // Fin del día seleccionado

          const historicalByWarehouse =
            await movementRepositoryRef.current.getInventoryByWarehouseAtDate(date);

          // Cargar productos actuales para obtener estructura completa (ubicaciones, etc.)
          const currentProducts = await getAll({ includeInactive: false });

          // Agrupar datos históricos por producto
          const historicalByProduct = new Map<string, Map<string, number>>();
          historicalByWarehouse?.forEach((h) => {
            if (!historicalByProduct.has(h.product_id)) {
              historicalByProduct.set(h.product_id, new Map());
            }
            historicalByProduct.get(h.product_id)!.set(h.warehouse, h.stock_current);
          });

          // Combinar datos históricos con estructura actual de productos
          const enrichedProducts = currentProducts.map((product) => {
            const productHistorical = historicalByProduct.get(product.id);

            if (productHistorical && productHistorical.size > 0) {
              // Calcular stock total histórico sumando todos los almacenes
              const totalStock = Array.from(productHistorical.values()).reduce(
                (sum, stock) => sum + stock,
                0,
              );

              // Crear ubicaciones históricas basadas en los datos históricos por almacén
              const historicalLocations = Array.from(productHistorical.entries()).map(
                ([warehouse, stock]) => {
                  // Buscar ubicación actual para este almacén o crear una nueva
                  const existingLocation = product.locations?.find(
                    (loc) => loc.warehouse === warehouse,
                  );
                  return {
                    id: existingLocation?.id || '',
                    productId: product.id,
                    warehouse: warehouse as 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
                    aisle: existingLocation?.aisle || '',
                    shelf: existingLocation?.shelf || '',
                    quantity: stock,
                    isPrimary: existingLocation?.isPrimary || false,
                  };
                },
              );

              return {
                ...product,
                stockCurrent: totalStock,
                locations:
                  historicalLocations.length > 0
                    ? historicalLocations
                    : product.locations?.map((loc) => ({
                        ...loc,
                        quantity: productHistorical.get(loc.warehouse) || 0,
                      })) || [],
              };
            }

            // Si no hay datos históricos, el producto no existía o tenía stock 0
            return {
              ...product,
              stockCurrent: 0,
              locations: product.locations?.map((loc) => ({ ...loc, quantity: 0 })) || [],
            };
          });

          setLocalProducts(enrichedProducts);
        } else {
          // Modo actual: cargar productos normales
          const productsData = await getAll({ includeInactive: false });
          if (productsData) {
            setLocalProducts(productsData);
          }
        }
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error(t('reports.error'), 'Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [getAll, t, isHistoricalMode, selectedDate, toast]);

  // Manejar cambio de fecha
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (date) {
      setIsHistoricalMode(true);
    } else {
      setIsHistoricalMode(false);
    }
  };

  // Resetear a modo actual
  const handleResetToCurrent = () => {
    setSelectedDate('');
    setIsHistoricalMode(false);
  };

  // Obtener almacenes únicos de todos los productos
  const warehouses = useMemo(() => {
    const warehouseSet = new Set<string>();
    localProducts.forEach((p) => {
      if (p.locations && Array.isArray(p.locations)) {
        p.locations.forEach((loc) => warehouseSet.add(loc.warehouse));
      } else if (p.warehouse) {
        warehouseSet.add(p.warehouse);
      }
    });
    return Array.from(warehouseSet).sort();
  }, [localProducts]);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return localProducts.filter((p) => {
      const matchesWarehouse =
        selectedWarehouse === 'ALL' ||
        (p.locations && p.locations.some((loc) => loc.warehouse === selectedWarehouse)) ||
        p.warehouse === selectedWarehouse;
      const matchesCategory =
        selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchesSearch =
        searchTerm === '' ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesWarehouse && matchesCategory && matchesSearch;
    });
  }, [localProducts, selectedWarehouse, selectedCategory, searchTerm]);

  // Función para obtener stock por almacén (MISMA LÓGICA que ProductsPage)
  const getStockByWarehouse = (product: Product, warehouse: string): number => {
    if (
      product.locations &&
      Array.isArray(product.locations) &&
      product.locations.length > 0
    ) {
      return product.locations
        .filter((loc) => loc.warehouse === warehouse)
        .reduce((sum, loc) => sum + (loc.quantity || 0), 0);
    }
    // Fallback: si el producto tiene warehouse pero no locations
    return product.warehouse === warehouse ? product.stockCurrent : 0;
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalStock = filteredProducts.reduce((sum, p) => sum + p.stockCurrent, 0);
    const totalProducts = filteredProducts.length;
    const lowStockCount = filteredProducts.filter(
      (p) => p.stockCurrent <= p.stockMin,
    ).length;
    return { totalStock, totalProducts, lowStockCount };
  }, [filteredProducts]);

  // Datos para gráficos
  const chartData = useMemo(() => {
    if (chartMetric === 'category') {
      const categoryMap = new Map<string, number>();
      filteredProducts.forEach((p) => {
        const cat =
          p.category || (language === 'ca-ES' ? 'Sense Categoria' : 'Sin Categoría');
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + p.stockCurrent);
      });

      return Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    } else if (chartMetric === 'warehouse') {
      const warehouseMap = new Map<string, number>();
      filteredProducts.forEach((p) => {
        warehouses.forEach((wh) => {
          const stock = getStockByWarehouse(p, wh);
          warehouseMap.set(wh, (warehouseMap.get(wh) || 0) + stock);
        });
      });

      return Array.from(warehouseMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    } else {
      // Stock por producto (top 10)
      return filteredProducts
        .map((p) => ({ name: p.name.substring(0, 20), value: p.stockCurrent }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }
  }, [filteredProducts, chartMetric, warehouses, language]);

  // Colores para gráficos
  const chartColors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#6366f1',
  ];

  // Columnas para la tabla (dinámicas por almacén)
  const tableColumns = useMemo(() => {
    const baseColumns = [
      { id: 'code', label: t('table.code'), visible: true, order: 1 },
      { id: 'name', label: t('table.name'), visible: true, order: 2 },
      { id: 'category', label: t('table.category'), visible: true, order: 3 },
    ];

    // Agregar columnas por almacén
    warehouses.forEach((wh, index) => {
      const warehouseLabel =
        wh === 'MEYPAR'
          ? 'MEYPAR'
          : wh === 'OLIVA_TORRAS'
            ? language === 'ca-ES'
              ? 'Oliva Torras'
              : 'Oliva Torras'
            : language === 'ca-ES'
              ? 'Furgoneta'
              : 'Furgoneta';
      baseColumns.push({
        id: `warehouse_${wh}`,
        label: `Stock ${warehouseLabel}`,
        visible: true,
        order: 4 + index,
      });
    });

    // Columna de stock total
    baseColumns.push({
      id: 'stockCurrent',
      label: language === 'ca-ES' ? 'Stock Total' : 'Stock Total',
      visible: true,
      order: 100,
    });

    return baseColumns;
  }, [warehouses, t, language]);

  // Preparar productos para la tabla con columnas de almacén
  const tableProducts = useMemo(() => {
    return filteredProducts.map((product) => {
      // Crear un producto extendido con propiedades dinámicas para cada almacén
      const extendedProduct = { ...product } as Product &
        Record<string, string | number | boolean | unknown[] | undefined>;

      warehouses.forEach((wh) => {
        extendedProduct[`warehouse_${wh}`] = getStockByWarehouse(product, wh);
      });

      return extendedProduct;
    });
  }, [filteredProducts, warehouses]);

  // Categorías únicas
  const categories = useMemo(() => {
    const cats = new Set(localProducts.map((p) => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [localProducts]);

  // Columnas para exportación
  const exportColumns: ColumnOption[] = useMemo(() => {
    const cols: ColumnOption[] = [
      { key: 'code', label: t('table.code'), defaultSelected: true },
      { key: 'name', label: t('table.name'), defaultSelected: true },
      { key: 'category', label: t('table.category'), defaultSelected: true },
    ];

    warehouses.forEach((wh) => {
      const warehouseLabel =
        wh === 'MEYPAR' ? 'MEYPAR' : wh === 'OLIVA_TORRAS' ? 'Oliva Torras' : 'Furgoneta';
      cols.push({
        key: `warehouse_${wh}`,
        label: `Stock ${warehouseLabel}`,
        defaultSelected: true,
      });
    });

    cols.push({
      key: 'stockCurrent',
      label: language === 'ca-ES' ? 'Stock Total' : 'Stock Total',
      defaultSelected: true,
    });

    return cols;
  }, [warehouses, t, language]);

  const handleExport = async (columns: string[], format: 'xlsx' | 'csv') => {
    const exportData = tableProducts.map((p) => {
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        if (col === 'code') row.code = p.code;
        else if (col === 'name') row.name = p.name;
        else if (col === 'category') row.category = p.category || '-';
        else if (col === 'stockCurrent') row.stockTotal = p.stockCurrent;
        else if (col.startsWith('warehouse_')) {
          const wh = col.replace('warehouse_', '');
          const warehouseLabel =
            wh === 'MEYPAR'
              ? 'MEYPAR'
              : wh === 'OLIVA_TORRAS'
                ? 'Oliva Torras'
                : 'Furgoneta';
          row[`Stock ${warehouseLabel}`] =
            (p as unknown as Record<string, number>)[col] || 0;
        }
      });
      return row;
    });

    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        language === 'ca-ES' ? 'Dades' : 'Datos',
      );

      const dateStr =
        isHistoricalMode && selectedDate
          ? selectedDate.replace(/-/g, '')
          : new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName = `Inventario_${isHistoricalMode ? 'Historico_' : ''}${dateStr}.${format}`;

      if (format === 'xlsx') {
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast.success(t('reports.export.success'), `Exportado a ${format.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      toast.error(t('reports.export.error'), 'Falló la exportación');
    }
  };

  // Renderizar gráfico según tipo
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis
              type="number"
              tick={{ fill: '#6b7280' }}
              tickFormatter={(val) => val.toLocaleString()}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fill: '#6b7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => [
                value.toLocaleString(),
                language === 'ca-ES' ? 'Stock' : 'Stock',
              ]}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#3b82f6">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: '#6b7280' }}
              tickFormatter={(val) => val.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => [
                value.toLocaleString(),
                language === 'ca-ES' ? 'Stock' : 'Stock',
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: '#6b7280' }}
              tickFormatter={(val) => val.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => [
                value.toLocaleString(),
                language === 'ca-ES' ? 'Stock' : 'Stock',
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorStock)"
            />
          </AreaChart>
        );

      case 'pie':
        return (
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => value.toLocaleString()}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
            />
          </RechartsPieChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis
              type="number"
              tick={{ fill: '#6b7280' }}
              tickFormatter={(val) => val.toLocaleString()}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fill: '#6b7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => [
                value.toLocaleString(),
                language === 'ca-ES' ? 'Stock' : 'Stock',
              ]}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="value"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ca-ES' ? 'ca-ES' : 'es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {language === 'ca-ES' ? "Evolució de l'Estoc" : 'Evolución del Stock'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isHistoricalMode && selectedDate
              ? language === 'ca-ES'
                ? `Consulta l'estoc del ${formatDate(selectedDate)}`
                : `Consulta el stock del ${formatDate(selectedDate)}`
              : language === 'ca-ES'
                ? "Consulta l'estoc actual de tots els productes"
                : 'Consulta el stock actual de todos los productos'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            {t('actions.export')}
          </button>
        </div>
      </div>

      {/* Selector de Fecha Premium */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50">
                {language === 'ca-ES' ? 'Seleccionar Data' : 'Seleccionar Fecha'}
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {language === 'ca-ES'
                  ? "Tria una data per veure l'estoc d'aquest dia"
                  : 'Elige una fecha para ver el stock de ese día'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative group">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                lang={language === 'ca-ES' ? 'ca-ES' : 'es-ES'}
                title={
                  language === 'ca-ES' ? 'Selecciona una data' : 'Selecciona una fecha'
                }
                className="w-full sm:w-48 rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm font-bold text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full"
                style={{
                  colorScheme: 'light dark',
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>

            {isHistoricalMode && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleResetToCurrent}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 shadow-sm"
              >
                <Clock className="h-4 w-4" />
                {language === 'ca-ES' ? 'Veure Actual' : 'Ver Actual'}
              </motion.button>
            )}
          </div>
        </div>

        {isHistoricalMode && selectedDate && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            <Clock className="h-4 w-4" />
            <span>
              {language === 'ca-ES'
                ? `Mostrant dades històriques del ${formatDate(selectedDate)}`
                : `Mostrando datos históricos del ${formatDate(selectedDate)}`}
            </span>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('table.warehouse')}
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
            >
              <option value="ALL">{t('filters.all')}</option>
              {warehouses.map((wh) => (
                <option key={wh} value={wh}>
                  {wh === 'MEYPAR'
                    ? 'MEYPAR'
                    : wh === 'OLIVA_TORRAS'
                      ? language === 'ca-ES'
                        ? 'Oliva Torras'
                        : 'Oliva Torras'
                      : language === 'ca-ES'
                        ? 'Furgoneta'
                        : 'Furgoneta'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('table.category')}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
            >
              <option value="ALL">{t('filters.all')}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {language === 'ca-ES' ? 'Cercar' : 'Buscar'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder={
                  language === 'ca-ES'
                    ? 'Cercar per codi o nom...'
                    : 'Buscar por código o nombre...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards y Gráficos - Layout de 2 columnas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Columna izquierda: KPIs */}
        <div className="flex flex-col gap-3 lg:col-span-1 h-full">
          <motion.div
            whileHover={{ scale: 1.02, translateY: -2 }}
            className="flex-1 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 shadow-sm ring-1 ring-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:ring-blue-800 flex items-center"
          >
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                >
                  <Package className="h-5 w-5" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    {language === 'ca-ES' ? 'Unitats Totals' : 'Unidades Totales'}
                  </p>
                  <p className="text-2xl font-black text-blue-900 dark:text-blue-50">
                    {kpis.totalStock.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, translateY: -2 }}
            className="flex-1 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-4 shadow-sm ring-1 ring-amber-200 dark:from-amber-900/20 dark:to-amber-800/20 dark:ring-amber-800 flex items-center"
          >
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ rotate: -15, scale: 1.1 }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                >
                  <RefreshCw className="h-5 w-5" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    {language === 'ca-ES'
                      ? 'Productes Diferents'
                      : 'Productos Diferentes'}
                  </p>
                  <p className="text-2xl font-black text-amber-900 dark:text-amber-50">
                    {kpis.totalProducts.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, translateY: -2 }}
            className="flex-1 rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-4 shadow-sm ring-1 ring-red-200 dark:from-red-900/20 dark:to-red-800/20 dark:ring-red-800 flex items-center"
          >
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white shadow-lg shadow-red-600/20"
                >
                  <Package className="h-5 w-5" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">
                    {language === 'ca-ES' ? 'Productes en Alerta' : 'Productos en Alerta'}
                  </p>
                  <p className="text-2xl font-black text-red-900 dark:text-red-50">
                    {kpis.lowStockCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Columna derecha: Gráficos Interactivos Premium */}
        <div className="lg:col-span-2 h-full">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 h-full flex flex-col">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 uppercase tracking-tight">
                {language === 'ca-ES'
                  ? 'Visualització de Dades'
                  : 'Visualización de Datos'}
              </h3>

              {/* Selector de tipo de gráfico */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900 shadow-inner">
                  <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as ChartType)}
                    className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none"
                  >
                    <option value="bar">
                      {language === 'ca-ES' ? 'Barres' : 'Barras'}
                    </option>
                    <option value="line">
                      {language === 'ca-ES' ? 'Línia' : 'Línea'}
                    </option>
                    <option value="area">{language === 'ca-ES' ? 'Àrea' : 'Área'}</option>
                    <option value="pie">
                      {language === 'ca-ES' ? 'Circular' : 'Circular'}
                    </option>
                    <option value="composed">
                      {language === 'ca-ES' ? 'Combinat' : 'Combinado'}
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900 shadow-inner">
                  <LayoutGrid className="h-3.5 w-3.5 text-gray-500" />
                  <select
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value as ChartMetric)}
                    className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none"
                  >
                    <option value="category">
                      {language === 'ca-ES' ? 'Per Categoria' : 'Por Categoría'}
                    </option>
                    <option value="warehouse">
                      {language === 'ca-ES' ? 'Per Almacén' : 'Por Almacén'}
                    </option>
                    <option value="stock">
                      {language === 'ca-ES' ? 'Top Productes' : 'Top Productos'}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <ProductTable
          products={tableProducts as Product[]}
          loading={loading || hookLoading}
          searchTerm={searchTerm}
          visibleColumns={tableColumns}
        />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 text-center">
          {filteredProducts.length}{' '}
          {language === 'ca-ES' ? 'productes mostrats' : 'productos mostrados'}
          {isHistoricalMode && selectedDate && (
            <span className="ml-2 text-blue-600 dark:text-blue-400">
              • {language === 'ca-ES' ? 'Dades del' : 'Datos del'}{' '}
              {formatDate(selectedDate)}
            </span>
          )}
        </div>
      </div>

      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        columns={exportColumns}
        onExport={(cols, format) => handleExport(cols, format)}
        fileName={`inventario_${isHistoricalMode && selectedDate ? selectedDate.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '')}`}
      />
    </div>
  );
}
