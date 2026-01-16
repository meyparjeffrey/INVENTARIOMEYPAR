import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Download,
  Package,
  RefreshCw,
  Search,
  BarChart3,
  LayoutGrid,
  TrendingUp,
  PieChart,
  AreaChart as AreaChartIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Warehouse,
  Tag,
  Filter,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { useProducts } from '../../hooks/useProducts';
import { ProductTable } from '../products/ProductTable';
import { Product } from '../../../domain/entities/Product';
import { ExportDialog, ColumnOption } from '../products/ExportDialog';
import { useToast } from '../ui/Toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
  LabelList,
} from 'recharts';
import { SupabaseInventoryMovementRepository } from '../../../infrastructure/repositories/SupabaseInventoryMovementRepository';

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'composed';
type ChartMetric = 'stock' | 'category' | 'warehouse';

export function HistoricalStockReport() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const { loading: hookLoading, getAll } = useProducts();
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true); // Inicialmente cargando
  const [isUpdating, setIsUpdating] = useState(false); // Para actualizaciones posteriores
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('warehouse');
  const calendarRef = useRef<HTMLDivElement>(null);
  const warehouseDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const movementRepositoryRef = React.useRef(new SupabaseInventoryMovementRepository());

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (calendarRef.current && !calendarRef.current.contains(target)) {
        setShowCalendar(false);
      }
      if (
        warehouseDropdownRef.current &&
        !warehouseDropdownRef.current.contains(target)
      ) {
        setShowWarehouseDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Datos para el calendario personalizado
  const calendarData = useMemo(() => {
    const monthNames =
      language === 'ca-ES'
        ? [
            'Gener',
            'Febrer',
            'Març',
            'Abril',
            'Maig',
            'Juny',
            'Juliol',
            'Agost',
            'Setembre',
            'Octubre',
            'Novembre',
            'Desembre',
          ]
        : [
            'Enero',
            'Febrero',
            'Marzo',
            'Abril',
            'Mayo',
            'Junio',
            'Julio',
            'Agosto',
            'Septiembre',
            'Octubre',
            'Noviembre',
            'Diciembre',
          ];

    const dayNames =
      language === 'ca-ES'
        ? ['dl', 'dt', 'dm', 'dj', 'dv', 'ds', 'dg']
        : ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

    return { monthNames, dayNames };
  }, [language]);

  const [viewDate, setViewDate] = useState(new Date());

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    // Ajustar para que la semana empiece en lunes (0: lunes, ..., 6: domingo)
    const startingDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Días vacíos al principio
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [viewDate]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    if (nextMonth <= new Date()) {
      setViewDate(nextMonth);
    }
  };

  // Cargar productos actuales o históricos según el modo
  useEffect(() => {
    const loadProducts = async () => {
      // Si ya tenemos productos, usamos isUpdating para no mostrar el esqueleto completo
      if (localProducts.length > 0) {
        setIsUpdating(true);
      } else {
        setLoading(true);
      }

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
        setIsUpdating(false);
      }
    };

    loadProducts();
  }, [getAll, t, isHistoricalMode, selectedDate, toast, localProducts.length]);

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
    const totalStock = filteredProducts.reduce((sum, p) => {
      const stockToUse =
        selectedWarehouse === 'ALL'
          ? p.stockCurrent
          : getStockByWarehouse(p, selectedWarehouse);
      return sum + stockToUse;
    }, 0);

    const totalProducts = filteredProducts.length;

    const lowStockCount = filteredProducts.filter((p) => {
      const stockToUse =
        selectedWarehouse === 'ALL'
          ? p.stockCurrent
          : getStockByWarehouse(p, selectedWarehouse);
      return stockToUse <= p.stockMin;
    }).length;

    return { totalStock, totalProducts, lowStockCount };
  }, [filteredProducts, selectedWarehouse]);

  // Datos para gráficos
  const chartData = useMemo(() => {
    if (chartMetric === 'category') {
      const categoryMap = new Map<string, number>();
      filteredProducts.forEach((p) => {
        const cat =
          p.category || (language === 'ca-ES' ? 'Sense Categoria' : 'Sin Categoría');
        const stockToUse =
          selectedWarehouse === 'ALL'
            ? p.stockCurrent
            : getStockByWarehouse(p, selectedWarehouse);
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + stockToUse);
      });

      return Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    } else if (chartMetric === 'warehouse') {
      const warehouseMap = new Map<string, number>();
      filteredProducts.forEach((p) => {
        // Si hay un almacén seleccionado, solo mostramos ese en el gráfico "por almacén"
        if (selectedWarehouse !== 'ALL') {
          const stock = getStockByWarehouse(p, selectedWarehouse);
          warehouseMap.set(
            selectedWarehouse,
            (warehouseMap.get(selectedWarehouse) || 0) + stock,
          );
        } else {
          // Si no hay filtro, mostramos todos los almacenes
          warehouses.forEach((wh) => {
            const stock = getStockByWarehouse(p, wh);
            warehouseMap.set(wh, (warehouseMap.get(wh) || 0) + stock);
          });
        }
      });

      return Array.from(warehouseMap.entries())
        .map(([name, value]) => ({ name, value }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
    } else {
      // Stock por producto (top 10)
      return filteredProducts
        .map((p) => {
          const stockToUse =
            selectedWarehouse === 'ALL'
              ? p.stockCurrent
              : getStockByWarehouse(p, selectedWarehouse);
          return { name: p.name.substring(0, 20), value: stockToUse };
        })
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }
  }, [filteredProducts, chartMetric, warehouses, language, selectedWarehouse]);

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
      // Mejora Premium: Solo mostrar la columna si el almacén está seleccionado o si se muestran todos
      const isVisible = selectedWarehouse === 'ALL' || selectedWarehouse === wh;

      if (isVisible) {
        const warehouseLabel =
          wh === 'MEYPAR'
            ? 'MEYPAR'
            : wh === 'OLIVA_TORRAS'
              ? 'Oliva Torras'
              : 'Furgoneta';
        baseColumns.push({
          id: `warehouse_${wh}`,
          label: `Stock ${warehouseLabel}`,
          visible: true,
          order: 4 + index,
        });
      }
    });

    // Columna de stock total
    baseColumns.push({
      id: 'stockCurrent',
      label: language === 'ca-ES' ? 'Stock Total' : 'Stock Total',
      visible: true,
      order: 100,
    });

    return baseColumns;
  }, [warehouses, t, language, selectedWarehouse]);

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
      // Mejora Premium: Solo incluir en exportación si el almacén está seleccionado o si se muestran todos
      const isVisible = selectedWarehouse === 'ALL' || selectedWarehouse === wh;

      if (isVisible) {
        const warehouseLabel =
          wh === 'MEYPAR'
            ? 'MEYPAR'
            : wh === 'OLIVA_TORRAS'
              ? 'Oliva Torras'
              : 'Furgoneta';
        cols.push({
          key: `warehouse_${wh}`,
          label: `Stock ${warehouseLabel}`,
          defaultSelected: true,
        });
      }
    });

    cols.push({
      key: 'stockCurrent',
      label: language === 'ca-ES' ? 'Stock Total' : 'Stock Total',
      defaultSelected: true,
    });

    return cols;
  }, [warehouses, t, language, selectedWarehouse]);

  const handleExport = async (columns: string[], format: 'xlsx' | 'csv') => {
    // 1. Preparar datos base (sin totales aún)
    const rawData = tableProducts.map((p) => {
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        if (col === 'code') {
          const label = language === 'ca-ES' ? 'Codi' : 'Código';
          row[label] = p.code;
        } else if (col === 'name') {
          const label = language === 'ca-ES' ? 'Nom' : 'Nombre';
          row[label] = p.name;
        } else if (col === 'category') {
          const label = language === 'ca-ES' ? 'Categoria' : 'Categoría';
          row[label] = p.category || '-';
        } else if (col === 'stockCurrent') {
          const label = language === 'ca-ES' ? 'Stock Total' : 'Stock Total';
          row[label] = p.stockCurrent;
        } else if (col.startsWith('warehouse_')) {
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

    // 2. Crear fila de totales dinámicos
    const summaryRow: Record<string, string | number> = {};
    if (rawData.length > 0) {
      const firstRow = rawData[0];
      const keys = Object.keys(firstRow);

      keys.forEach((key) => {
        const isCodi = key === (language === 'ca-ES' ? 'Codi' : 'Código');
        const isNom = key === (language === 'ca-ES' ? 'Nom' : 'Nombre');

        if (isCodi) {
          summaryRow[key] = 'TOTAL';
        } else if (isNom) {
          const itemLabel = language === 'ca-ES' ? 'articles' : 'artículos';
          summaryRow[key] = `${rawData.length} ${itemLabel}`;
        } else {
          const isNumeric = typeof firstRow[key] === 'number';
          if (isNumeric) {
            const total = rawData.reduce(
              (sum, row) => sum + ((row[key] as number) || 0),
              0,
            );
            summaryRow[key] = total;
          } else {
            summaryRow[key] = '';
          }
        }
      });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Meypar Inventario';
      workbook.created = new Date();

      // --- INTENTAR AÑADIR LOGO (PREMIUM) ---
      let logoImageId: number | null = null;
      try {
        const response = await fetch('/logochat.svg');
        const svgText = await response.text();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        const logoBase64 = await new Promise<string>((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 200;
            canvas.height = img.height || 200;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
            }
            resolve(canvas.toDataURL('image/png').split(',')[1]);
            URL.revokeObjectURL(url);
          };
          img.onerror = () => resolve('');
          img.src = url;
        });

        if (logoBase64) {
          logoImageId = workbook.addImage({
            base64: logoBase64,
            extension: 'png',
          });
        }
      } catch (err) {
        console.warn('No se pudo cargar el logo para el Excel:', err);
      }

      // --- HOJA 1: RESUMEN (PREMIUM) ---
      const summarySheet = workbook.addWorksheet(
        language === 'ca-ES' ? 'Resum' : 'Resumen',
        {
          views: [{ showGridLines: false }],
        },
      );

      // Añadir Logo si existe
      if (logoImageId !== null) {
        summarySheet.addImage(logoImageId, {
          tl: { col: 0.1, row: 0.1 },
          ext: { width: 50, height: 50 },
        });
      }

      // Título Principal con Estilo Corporativo (#e62144)
      const titleCell = summarySheet.getCell('A1');
      titleCell.value =
        language === 'ca-ES'
          ? "      INFORME D'INVENTARI MEYPAR"
          : '      INFORME DE INVENTARIO MEYPAR';
      titleCell.font = { name: 'Arial Black', size: 16, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE62144' },
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      summarySheet.mergeCells('A1:C1');
      summarySheet.getRow(1).height = 50;

      // Subtítulo
      const subtitleCell = summarySheet.getCell('A2');
      subtitleCell.value =
        language === 'ca-ES' ? "RESUM DE L'EXPORTACIÓ" : 'RESUMEN DE LA EXPORTACIÓN';
      subtitleCell.font = { bold: true, size: 12, color: { argb: 'FF334155' } };
      subtitleCell.alignment = { horizontal: 'center' };
      summarySheet.mergeCells('A2:C2');
      summarySheet.getRow(2).height = 25;

      const addSummaryRow = (label: string, value: string | number, isHeader = false) => {
        const row = summarySheet.addRow([label, value]);
        row.height = 20;
        if (isHeader) {
          row.getCell(1).font = { bold: true, color: { argb: 'FFE62144' } };
          row.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' },
          };
          summarySheet.mergeCells(`A${row.number}:C${row.number}`);
        } else {
          row.getCell(1).font = { bold: true, color: { argb: 'FF475569' } };
          row.getCell(2).font = { bold: true, color: { argb: 'FF1E293B' } };
          row.getCell(2).alignment = { horizontal: 'right' };
          summarySheet.mergeCells(`B${row.number}:C${row.number}`);
        }
        return row;
      };

      summarySheet.addRow([]); // Espacio

      addSummaryRow(
        language === 'ca-ES' ? 'DATA DEL REPORT:' : 'FECHA DEL REPORTE:',
        selectedDate
          ? formatDate(selectedDate)
          : formatDate(new Date().toISOString().split('T')[0]),
      );
      addSummaryRow(
        language === 'ca-ES' ? 'ESTAT DEL DADES:' : 'ESTADO DE LOS DATOS:',
        selectedDate
          ? language === 'ca-ES'
            ? 'Històric (Snapshot)'
            : 'Histórico (Snapshot)'
          : language === 'ca-ES'
            ? 'Temps Real (En Directe)'
            : 'Tiempo Real (En Vivo)',
      );

      summarySheet.addRow([]);
      addSummaryRow(
        language === 'ca-ES' ? 'CONFIGURACIÓ DE FILTRES' : 'CONFIGURACIÓN DE FILTROS',
        '',
        true,
      );
      addSummaryRow(
        `   - ${language === 'ca-ES' ? 'Magatzem:' : 'Almacén:'}`,
        selectedWarehouse === 'ALL'
          ? language === 'ca-ES'
            ? 'Tots els almacens'
            : 'Todos los almacenes'
          : selectedWarehouse,
      );
      addSummaryRow(
        `   - ${language === 'ca-ES' ? 'Categoria:' : 'Categoría:'}`,
        selectedCategory === 'ALL'
          ? language === 'ca-ES'
            ? 'Totes les categories'
            : 'Todas las categorías'
          : selectedCategory,
      );
      addSummaryRow(
        `   - ${language === 'ca-ES' ? 'Cerca rápida:' : 'Búsqueda rápida:'}`,
        searchTerm || (language === 'ca-ES' ? 'Cap filtre' : 'Sin filtro'),
      );

      summarySheet.addRow([]);
      addSummaryRow(
        language === 'ca-ES' ? "DESGLOSSAMENT D'ESTOCS" : 'DESGLOSE DE STOCKS',
        '',
        true,
      );
      warehouses.forEach((wh) => {
        const warehouseLabel =
          wh === 'MEYPAR'
            ? 'MEYPAR'
            : wh === 'OLIVA_TORRAS'
              ? 'Oliva Torras'
              : 'Furgoneta';
        const key = `Stock ${warehouseLabel}`;
        const totalWh = rawData.reduce((sum, p) => sum + ((p[key] as number) || 0), 0);
        addSummaryRow(
          `   • ${language === 'ca-ES' ? 'Estoc' : 'Stock'} ${warehouseLabel}:`,
          totalWh.toLocaleString(),
        );
      });

      summarySheet.addRow([]);
      const totalStock = rawData.reduce((sum, p) => {
        const totalKey = language === 'ca-ES' ? 'Stock Total' : 'Stock Total';
        return sum + ((p[totalKey] as number) || 0);
      }, 0);

      const itemsRow = addSummaryRow(
        language === 'ca-ES'
          ? 'TOTAL ARTICLES EXPORTATS:'
          : 'TOTAL ARTÍCULOS EXPORTADOS:',
        rawData.length.toLocaleString(),
      );
      itemsRow.getCell(1).font = { bold: true, size: 11 };
      itemsRow.getCell(2).font = { bold: true, size: 11 };

      const grandTotalRow = addSummaryRow(
        language === 'ca-ES' ? 'STOCK TOTAL GLOBAL:' : 'STOCK TOTAL GLOBAL:',
        totalStock.toLocaleString(),
      );
      grandTotalRow.getCell(1).font = {
        bold: true,
        size: 12,
        color: { argb: 'FFE62144' },
      };
      grandTotalRow.getCell(2).font = {
        bold: true,
        size: 12,
        color: { argb: 'FFE62144' },
      };

      summarySheet.addRow([]);
      summarySheet.addRow([]);
      const footerRow = summarySheet.addRow([
        language === 'ca-ES' ? 'Generat el:' : 'Generado el:',
        new Date().toLocaleString(language === 'ca-ES' ? 'ca-ES' : 'es-ES'),
      ]);
      footerRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
      footerRow.getCell(2).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
      summarySheet.mergeCells(`B${footerRow.number}:C${footerRow.number}`);

      summarySheet.getColumn(1).width = 40;
      summarySheet.getColumn(2).width = 20;
      summarySheet.getColumn(3).width = 20;

      // --- HOJA 2: DETALLES ---
      const detailSheet = workbook.addWorksheet(language === 'ca-ES' ? 'Dades' : 'Datos');

      // Título y filtros en la parte superior
      const detailTitle =
        language === 'ca-ES'
          ? `DETALL D'INVENTARI - ${selectedDate ? formatDate(selectedDate) : formatDate(new Date().toISOString().split('T')[0])}`
          : `DETALLE DE INVENTARIO - ${selectedDate ? formatDate(selectedDate) : formatDate(new Date().toISOString().split('T')[0])}`;

      const detailFilters = `${language === 'ca-ES' ? 'Filtres aplicats:' : 'Filtros aplicados:'} ${selectedWarehouse} / ${selectedCategory}${searchTerm ? ` / "${searchTerm}"` : ''}`;

      const titleRowDetail = detailSheet.addRow([detailTitle]);
      titleRowDetail.getCell(1).font = {
        bold: true,
        size: 14,
        color: { argb: 'FFE62144' },
      };
      detailSheet.mergeCells(1, 1, 1, columns.length);

      const filterRowDetail = detailSheet.addRow([detailFilters]);
      filterRowDetail.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };
      detailSheet.mergeCells(2, 1, 2, columns.length);

      detailSheet.addRow([]); // Espacio

      // Cabeceras de la tabla
      const headerKeys = Object.keys(rawData[0] || {});
      const tableHeaderRow = detailSheet.addRow(headerKeys);
      tableHeaderRow.height = 30;
      tableHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE62144' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Datos
      rawData.forEach((dataRow) => {
        const row = detailSheet.addRow(Object.values(dataRow));
        row.eachCell((cell) => {
          if (typeof cell.value === 'number') {
            cell.alignment = { horizontal: 'right' };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });
      });

      // Fila de Totales Dinámica en la tabla
      const finalTotalRow = detailSheet.addRow(Object.values(summaryRow));
      finalTotalRow.height = 25;
      finalTotalRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFE62144' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FFE62144' } },
          left: { style: 'thin' },
          bottom: { style: 'medium', color: { argb: 'FFE62144' } },
          right: { style: 'thin' },
        };
      });

      // Auto-ajuste de columnas
      detailSheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(12, maxLength + 5), 60);
      });

      // Añadir Autofiltros a la tabla de datos
      detailSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + rawData.length, column: headerKeys.length },
      };

      // --- GENERACIÓN Y DESCARGA ---
      const dateStr =
        isHistoricalMode && selectedDate
          ? selectedDate.replace(/-/g, '')
          : new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName = `Inventari_${isHistoricalMode ? 'Historic_' : ''}${dateStr}`;

      if (format === 'xlsx') {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, `${fileName}.xlsx`);
      } else {
        const buffer = await workbook.csv.writeBuffer();
        const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `${fileName}.csv`);
      }

      toast.success(t('reports.export.success'), `Exportado a ${format.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      toast.error(t('reports.error'), 'Falló la exportación Premium');
    }
  };

  // Renderizar gráfico según tipo
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    const tooltipStyle = {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow:
        '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      padding: '16px',
    };

    const CustomTooltip = ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ value: number; fill?: string; stroke?: string }>;
      label?: string;
    }) => {
      if (active && payload && payload.length) {
        return (
          <div style={tooltipStyle} className="border-none shadow-2xl">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full shadow-sm"
                style={{ backgroundColor: payload[0].fill || payload[0].stroke }}
              />
              <p className="text-xl font-black text-slate-900 dark:text-slate-800">
                {payload[0].value.toLocaleString()}
                <span className="ml-1 text-[10px] font-bold text-slate-400">UDS</span>
              </p>
            </div>
          </div>
        );
      }
      return null;
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps} layout="vertical">
            <defs>
              {chartColors.map((color, i) => (
                <linearGradient
                  key={`grad-${i}`}
                  id={`barGrad-${i}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={color} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="rgba(0,0,0,0.03)"
            />
            <XAxis
              type="number"
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(val) => val.toLocaleString()}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 10 }}
            />
            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#barGrad-${index % chartColors.length})`}
                  className="transition-all duration-500 hover:opacity-80"
                />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                fill="#64748b"
                fontSize={10}
                fontWeight={800}
                formatter={(val: number) => val.toLocaleString()}
                offset={10}
              />
            </Bar>
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.03)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              angle={-25}
              textAnchor="end"
              height={60}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(val) => val.toLocaleString()}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={5}
              dot={{ fill: '#3b82f6', r: 5, strokeWidth: 3, stroke: '#fff' }}
              activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6' }}
              animationDuration={1500}
            >
              <LabelList
                dataKey="value"
                position="top"
                offset={15}
                fill="#3b82f6"
                fontSize={10}
                fontWeight={800}
                formatter={(val: number) => val.toLocaleString()}
              />
            </Line>
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.03)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              angle={-25}
              textAnchor="end"
              height={60}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(val) => val.toLocaleString()}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={4}
              fill="url(#colorStock)"
              animationDuration={1500}
            >
              <LabelList
                dataKey="value"
                position="top"
                offset={15}
                fill="#3b82f6"
                fontSize={10}
                fontWeight={800}
                formatter={(val: number) => val.toLocaleString()}
              />
            </Area>
          </AreaChart>
        );

      case 'pie':
        return (
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={8}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
              label={{
                fill: '#64748b',
                fontSize: 10,
                fontWeight: 800,
                formatter: (val: number) => val.toLocaleString(),
              }}
              labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chartColors[index % chartColors.length]}
                  className="transition-all duration-500 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {value}
                </span>
              )}
            />
          </RechartsPieChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.03)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(val) => val.toLocaleString()}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chartColors[index % chartColors.length]}
                  fillOpacity={0.4}
                />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                offset={10}
                fill="#3b82f6"
                fontSize={10}
                fontWeight={800}
                formatter={(val: number) => val.toLocaleString()}
              />
            </Bar>
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={4}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
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

  // Solo mostrar el esqueleto en la carga inicial cuando no hay productos
  if (loading && localProducts.length === 0) {
    return (
      <div className="space-y-8 p-4 md:p-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-4 w-48 bg-slate-100 dark:bg-slate-900 rounded-lg" />
          </div>
          <div className="h-12 w-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
          <div className="lg:col-span-7 h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-4">
            <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
            <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
            <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
          </div>
          <div className="lg:col-span-8 h-full bg-slate-100 dark:bg-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 bg-slate-50/50 p-4 md:p-8 rounded-3xl dark:bg-slate-900/50"
    >
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {language === 'ca-ES' ? "Evolució de l'Estoc" : 'Evolución del Stock'}
            </h1>
            {isUpdating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <RefreshCw className="h-3 w-3 animate-spin" />
                {language === 'ca-ES' ? 'Actualitzant...' : 'Actualizando...'}
              </motion.div>
            )}
          </div>
          <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium">
            {isHistoricalMode && selectedDate
              ? language === 'ca-ES'
                ? `Mostrant dades històriques del ${formatDate(selectedDate)}`
                : `Mostrando datos históricos del ${formatDate(selectedDate)}`
              : language === 'ca-ES'
                ? "Resum en temps real de l'estoc actual"
                : 'Resumen en tiempo real del stock actual'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:shadow-white/10"
          >
            <Download className="h-4 w-4" />
            {t('actions.export')}
          </motion.button>
        </div>
      </div>

      {/* Main Controls Section */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 relative ${showCalendar ? 'z-40' : 'z-20'}`}
      >
        {/* Selector de Fecha Premium */}
        <div
          className={`lg:col-span-5 rounded-3xl border border-white bg-white/60 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-800/60 dark:shadow-none transition-all ${showCalendar ? 'z-50 relative' : 'z-10'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 shadow-inner">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">
                {language === 'ca-ES' ? 'Històric' : 'Histórico'}
              </span>
            </div>
            {isHistoricalMode && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleResetToCurrent}
                className="text-[10px] font-black uppercase tracking-tighter bg-blue-100 text-blue-700 px-2 py-1 rounded-lg dark:bg-blue-900/30 dark:text-blue-300"
              >
                {language === 'ca-ES' ? 'Tornar al present' : 'Volver al presente'}
              </motion.button>
            )}
          </div>

          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black shadow-inner transition-all hover:bg-slate-200 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-black ${selectedDate ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'}`}
                >
                  {selectedDate
                    ? formatDate(selectedDate)
                    : language === 'ca-ES'
                      ? 'Selecciona una data...'
                      : 'Selecciona una fecha...'}
                </span>
              </div>
              <CalendarIcon className="h-5 w-5 text-blue-600/50" />
            </button>

            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute left-0 right-0 mt-3 z-50 rounded-3xl border border-white bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                      {calendarData.monthNames[viewDate.getMonth()]}{' '}
                      {viewDate.getFullYear()}
                    </div>
                    <button
                      onClick={handleNextMonth}
                      disabled={
                        viewDate.getMonth() === new Date().getMonth() &&
                        viewDate.getFullYear() === new Date().getFullYear()
                      }
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {calendarData.dayNames.map((day) => (
                      <div
                        key={day}
                        className="text-[10px] font-black uppercase text-slate-400 text-center py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} />;

                      const isSelected = selectedDate === day.toISOString().split('T')[0];
                      const isToday =
                        day.toISOString().split('T')[0] ===
                        new Date().toISOString().split('T')[0];
                      const isFuture = day > new Date();

                      return (
                        <button
                          key={day.toISOString()}
                          disabled={isFuture}
                          onClick={() => {
                            handleDateChange(day.toISOString().split('T')[0]);
                            setShowCalendar(false);
                          }}
                          className={`
                            h-9 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center
                            ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110 z-10'
                                : isToday
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }
                            ${isFuture ? 'opacity-20 cursor-not-allowed' : ''}
                          `}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetToCurrent();
                        setShowCalendar(false);
                      }}
                      className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                    >
                      {language === 'ca-ES' ? 'Actual' : 'Hoy'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCalendar(false);
                      }}
                      className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition-all"
                    >
                      {language === 'ca-ES' ? 'Tancar' : 'Cerrar'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Filters Bar */}
        <div
          className={`lg:col-span-7 rounded-3xl border border-white bg-white/60 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-800/60 dark:shadow-none ${showCalendar || showWarehouseDropdown || showCategoryDropdown ? 'z-40 relative' : 'z-10'}`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 shadow-inner">
              <Filter className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">
              {language === 'ca-ES' ? 'Filtres Avançats' : 'Filtros Avanzados'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Warehouse Custom Dropdown */}
            <div className="space-y-1.5 relative" ref={warehouseDropdownRef}>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter ml-1">
                {t('table.warehouse')}
              </label>
              <button
                onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
                className="w-full flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 shadow-inner transition-all hover:bg-slate-200 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900 dark:text-slate-200"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Warehouse className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {selectedWarehouse === 'ALL'
                      ? t('filters.all')
                      : selectedWarehouse === 'MEYPAR'
                        ? 'MEYPAR'
                        : selectedWarehouse === 'OLIVA_TORRAS'
                          ? 'Oliva Torras'
                          : 'Furgoneta'}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${showWarehouseDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {showWarehouseDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 right-0 mt-2 z-[60] max-h-60 overflow-y-auto rounded-2xl border border-white bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
                  >
                    <button
                      onClick={() => {
                        setSelectedWarehouse('ALL');
                        setShowWarehouseDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${selectedWarehouse === 'ALL' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'}`}
                    >
                      <span>{t('filters.all')}</span>
                      {selectedWarehouse === 'ALL' && <Check className="h-3.5 w-3.5" />}
                    </button>
                    {warehouses.map((wh) => {
                      const label =
                        wh === 'MEYPAR'
                          ? 'MEYPAR'
                          : wh === 'OLIVA_TORRAS'
                            ? 'Oliva Torras'
                            : 'Furgoneta';
                      return (
                        <button
                          key={wh}
                          onClick={() => {
                            setSelectedWarehouse(wh);
                            setShowWarehouseDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${selectedWarehouse === wh ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'}`}
                        >
                          <span>{label}</span>
                          {selectedWarehouse === wh && <Check className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category Custom Dropdown */}
            <div className="space-y-1.5 relative" ref={categoryDropdownRef}>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter ml-1">
                {t('table.category')}
              </label>
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="w-full flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 shadow-inner transition-all hover:bg-slate-200 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900 dark:text-slate-200"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Tag className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {selectedCategory === 'ALL' ? t('filters.all') : selectedCategory}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${showCategoryDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {showCategoryDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 right-0 mt-2 z-[60] max-h-60 overflow-y-auto rounded-2xl border border-white bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
                  >
                    <button
                      onClick={() => {
                        setSelectedCategory('ALL');
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${selectedCategory === 'ALL' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'}`}
                    >
                      <span>{t('filters.all')}</span>
                      {selectedCategory === 'ALL' && <Check className="h-3.5 w-3.5" />}
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'}`}
                      >
                        <span>{cat}</span>
                        {selectedCategory === cat && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter ml-1">
                {language === 'ca-ES' ? 'Cerca Ràpida' : 'Búsqueda Rápida'}
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder={
                    language === 'ca-ES' ? 'Codi o nom...' : 'Código o nombre...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border-none bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 shadow-inner transition-all focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900 dark:text-slate-200 pl-10 group-hover:bg-slate-200 dark:group-hover:bg-slate-800"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards y Gráficos - Layout de 2 columnas */}
      <div
        className={`grid grid-cols-1 gap-8 lg:grid-cols-12 relative z-0 transition-all duration-500 ${isUpdating ? 'opacity-60 blur-[2px]' : 'opacity-100 blur-0'}`}
      >
        {isUpdating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full bg-white/80 px-6 py-3 shadow-2xl backdrop-blur-md dark:bg-slate-800/80"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  {language === 'ca-ES' ? 'Actualitzant...' : 'Actualizando...'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
        {/* Columna izquierda: KPIs */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {[
            {
              label: language === 'ca-ES' ? 'Unitats Totals' : 'Unidades Totales',
              value: kpis.totalStock,
              icon: Package,
              color: 'blue',
              desc: language === 'ca-ES' ? 'Estoc acumulat' : 'Stock acumulado',
            },
            {
              label:
                language === 'ca-ES' ? 'Productes Diferents' : 'Productos Diferentes',
              value: kpis.totalProducts,
              icon: RefreshCw,
              color: 'amber',
              desc: language === 'ca-ES' ? 'Varietat de SKUs' : 'Variedad de SKUs',
            },
            {
              label: language === 'ca-ES' ? 'Productes en Alerta' : 'Productos en Alerta',
              value: kpis.lowStockCount,
              icon: Package,
              color: 'red',
              desc: language === 'ca-ES' ? 'Sota estoc mínim' : 'Bajo stock mínimo',
            },
          ].map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ scale: 1.02, translateY: -4 }}
              className={`relative overflow-hidden flex-1 rounded-3xl p-6 shadow-xl transition-all border border-white dark:border-slate-800 backdrop-blur-md ${
                kpi.color === 'blue'
                  ? 'bg-gradient-to-br from-blue-500/10 to-indigo-500/5 shadow-blue-500/5'
                  : kpi.color === 'amber'
                    ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 shadow-amber-500/5'
                    : 'bg-gradient-to-br from-red-500/10 to-rose-500/5 shadow-red-500/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  animate={{
                    y: [0, -4, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: idx * 0.5,
                  }}
                  className={`p-3 rounded-2xl ${
                    kpi.color === 'blue'
                      ? 'bg-blue-500 text-white'
                      : kpi.color === 'amber'
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-500 text-white'
                  } shadow-lg shadow-current/20`}
                >
                  <kpi.icon className="h-5 w-5" />
                </motion.div>
                <div
                  className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                    kpi.color === 'blue'
                      ? 'bg-blue-100 text-blue-700'
                      : kpi.color === 'amber'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {language === 'ca-ES' ? 'En Directe' : 'En Vivo'}
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                {kpi.label}
              </p>
              <motion.p
                key={kpi.value}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-black text-slate-900 dark:text-white mb-1"
              >
                {kpi.value.toLocaleString()}
              </motion.p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 italic">
                {kpi.desc}
              </p>
              {/* Decoración de fondo */}
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12">
                <kpi.icon className="h-24 w-24" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Columna derecha: Gráficos Interactivos Premium */}
        <div className="lg:col-span-8">
          <div className="h-full rounded-3xl border border-white bg-white/60 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-800/60 dark:shadow-none flex flex-col relative overflow-hidden group">
            {/* Fondo decorativo sutil para impacto premium */}
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl transition-all duration-1000 group-hover:bg-blue-500/10" />

            <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    {language === 'ca-ES'
                      ? 'Visualització de Dades'
                      : 'Visualización de Datos'}
                  </h3>
                  <div className="mt-1 h-1.5 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />
                </div>

                {/* Resumen rápido de datos en el gráfico */}
                <div className="hidden sm:flex items-center gap-4 border-l border-slate-100 dark:border-slate-700 pl-6">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                      Total
                    </p>
                    <p className="text-lg font-black text-blue-600 leading-tight">
                      {chartData
                        .reduce((sum, item) => sum + item.value, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                      Items
                    </p>
                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      {chartData.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900 shadow-inner">
                  {[
                    {
                      value: 'bar',
                      icon: BarChart3,
                      label: language === 'ca-ES' ? 'Barras' : 'Barras',
                    },
                    {
                      value: 'line',
                      icon: TrendingUp,
                      label: language === 'ca-ES' ? 'Línea' : 'Línea',
                    },
                    {
                      value: 'area',
                      icon: AreaChartIcon,
                      label: language === 'ca-ES' ? 'Área' : 'Área',
                    },
                    {
                      value: 'pie',
                      icon: PieChart,
                      label: language === 'ca-ES' ? 'Circular' : 'Circular',
                    },
                  ].map((btn) => (
                    <button
                      key={btn.value}
                      onClick={() => setChartType(btn.value as ChartType)}
                      title={btn.label}
                      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                        chartType === btn.value
                          ? 'bg-white text-blue-600 shadow-lg dark:bg-slate-800'
                          : 'text-slate-400 hover:bg-white/50 hover:text-slate-600 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <btn.icon
                        className={`h-5 w-5 transition-transform duration-300 ${chartType === btn.value ? 'scale-110' : 'group-hover:scale-110'}`}
                      />
                      {chartType === btn.value && (
                        <motion.div
                          layoutId="activeChart"
                          className="absolute -bottom-1 h-1 w-4 rounded-full bg-blue-600"
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="relative flex items-center gap-2 rounded-2xl bg-white px-4 py-2 dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800">
                  <LayoutGrid className="h-4 w-4 text-blue-600" />
                  <select
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value as ChartMetric)}
                    className="bg-transparent text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer pr-2"
                  >
                    <option value="warehouse">
                      {language === 'ca-ES' ? 'Per Almacén' : 'Por Almacén'}
                    </option>
                    <option value="category">
                      {language === 'ca-ES' ? 'Per Categoria' : 'Por Categoría'}
                    </option>
                    <option value="stock">
                      {language === 'ca-ES' ? 'Top Productes' : 'Top Productos'}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <div
                  key={`${chartType}-${chartMetric}-${isUpdating}`}
                  className="w-full h-full"
                >
                  {renderChart()}
                </div>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`rounded-3xl border border-white bg-white/60 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-800/60 dark:shadow-none overflow-hidden transition-all duration-500 ${isUpdating ? 'opacity-60 blur-[1px]' : 'opacity-100 blur-0'}`}
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest">
            {language === 'ca-ES' ? 'Detall de Productes' : 'Detalle de Productos'}
          </h3>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg dark:bg-blue-900/30">
            {filteredProducts.length} TOTAL
          </span>
        </div>
        <ProductTable
          products={tableProducts as Product[]}
          loading={(loading || hookLoading) && localProducts.length === 0}
          searchTerm={searchTerm}
          visibleColumns={tableColumns}
        />
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-400 text-center uppercase tracking-[0.2em]">
          {language === 'ca-ES' ? 'Fin de la llista' : 'Fin de la lista'}
          {isHistoricalMode && selectedDate && (
            <span className="ml-2 text-blue-600">
              • SNAPSHOT: {formatDate(selectedDate)}
            </span>
          )}
        </div>
      </motion.div>

      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        columns={exportColumns}
        onExport={(cols, format) => handleExport(cols, format)}
        fileName={`inventario_${isHistoricalMode && selectedDate ? selectedDate.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '')}`}
      />
    </motion.div>
  );
}
