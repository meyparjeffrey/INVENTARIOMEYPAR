import { Plus, Download, X, LayoutGrid, Table2, Settings } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import type { Product } from '@domain/entities';
import type { ProductFilters as DomainProductFilters } from '@domain/repositories/ProductRepository';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../hooks/useProducts';
import { ProductTable } from '../components/products/ProductTable';
import { ProductGridView } from '../components/products/ProductGridView';
import { BulkActionsBar } from '../components/products/BulkActionsBar';
import {
  ProductFilters,
  type ProductFiltersState,
} from '../components/products/ProductFilters';
import {
  DATE_RANGE_OPTIONS,
  getSliderValueFromDate,
} from '../components/ui/DateRangeSlider';
import { ExportDialog, type ColumnOption } from '../components/products/ExportDialog';
import { ColumnConfigDialog } from '../components/products/ColumnConfigDialog';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchInput } from '../components/ui/SearchInput';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { calculateColumnWidth, createTotalsRow } from '../utils/excelUtils';
import { useTableColumns, type TableColumn } from '../hooks/useTableColumns';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  normalizePageSize,
} from '../constants/pageSizeOptions';
import { SupabaseUserRepository } from '@infrastructure/repositories/SupabaseUserRepository';
import { SupabaseProductRepository } from '@infrastructure/repositories/SupabaseProductRepository';
import { debugProductStock } from '../../utils/debugProductStock';

/**
 * Página principal de gestión de productos.
 */
export function ProductsPage() {
  const navigate = useNavigate();
  const { authContext, refreshContext } = useAuth();
  const { t } = useLanguage();
  const { products, loading, error, pagination, list, remove, update, getAll } =
    useProducts();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showInactive, setShowInactive] = React.useState(false);
  const [showLowStock, setShowLowStock] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const userRepository = React.useMemo(() => new SupabaseUserRepository(), []);

  // Cargar pageSize desde la configuración del usuario, normalizando si es necesario
  const defaultPageSize = authContext?.settings?.itemsPerPage
    ? normalizePageSize(authContext.settings.itemsPerPage)
    : DEFAULT_PAGE_SIZE;
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  // Actualizar pageSize cuando cambie la configuración del usuario
  React.useEffect(() => {
    if (authContext?.settings?.itemsPerPage) {
      const normalized = normalizePageSize(authContext.settings.itemsPerPage);
      setPageSize(normalized);
    }
  }, [authContext?.settings?.itemsPerPage]);
  const [advancedFilters, setAdvancedFilters] = React.useState<ProductFiltersState>({});
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table');
  const [showColumnConfig, setShowColumnConfig] = React.useState(false);
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);

  // Exponer función de depuración globalmente para uso desde la consola
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).debugProductStock = debugProductStock;
    // eslint-disable-next-line no-console
    console.log(
      '💡 Función de depuración disponible: debugProductStock("AAAA QRTEST-USB-1")',
    );
  }, []);

  // Configuración de columnas personalizables
  const defaultColumns: TableColumn[] = React.useMemo(
    () => [
      { id: 'code', label: t('table.code'), visible: true, order: 0 },
      { id: 'name', label: t('table.name'), visible: true, order: 1 },
      { id: 'category', label: t('table.category'), visible: true, order: 2 },
      { id: 'stockCurrent', label: t('table.stock'), visible: true, order: 3 },
      { id: 'stockMin', label: t('table.min'), visible: true, order: 4 },
      {
        id: 'warehouse',
        label: t('table.warehouse') || 'Almacén',
        visible: true,
        order: 5,
      },
      { id: 'aisle', label: t('table.location'), visible: true, order: 6 },
      { id: 'supplierCode', label: t('table.supplierCode'), visible: true, order: 7 },
      { id: 'costPrice', label: t('products.price.cost'), visible: false, order: 8 },
      { id: 'salePrice', label: t('products.price.sale'), visible: false, order: 8 },
      {
        id: 'createdAt',
        label: t('products.createdAt') || 'Fecha de creación',
        visible: true,
        order: 10,
      },
      {
        id: 'updatedAt',
        label: t('products.lastUpdate') || 'Última modificación',
        visible: true,
        order: 11,
      },
      { id: 'user', label: t('table.user') || 'Usuario', visible: true, order: 12 },
      { id: 'status', label: t('table.status'), visible: true, order: 13 },
      { id: 'actions', label: t('table.actions'), visible: true, order: 14 },
    ],
    [t],
  );

  const {
    columns: tableColumns,
    resetColumns,
    saveColumns,
  } = useTableColumns({
    tableId: 'products',
    defaultColumns,
  });

  // Cargar productos cuando cambian los filtros (con debounce para búsqueda)
  React.useEffect(() => {
    const timeoutId = setTimeout(
      async () => {
        try {
          // Búsqueda mejorada: permite código completo, 3+ caracteres parciales, o nombre
          const trimmedSearch = searchTerm.trim();
          const searchValue =
            trimmedSearch.length >= 3 || trimmedSearch.length === 0
              ? trimmedSearch || undefined
              : undefined; // Solo buscar si tiene 3+ caracteres o está vacío

          await list(
            {
              search: searchValue,
              includeInactive: showInactive,
              lowStock: showLowStock || advancedFilters.lowStock || undefined,
              stockNearMinimum: advancedFilters.stockNearMinimum,
              category: advancedFilters.category,
              isBatchTracked: advancedFilters.isBatchTracked,
              lastModifiedFrom: advancedFilters.dateFrom || undefined,
              lastModifiedTo: advancedFilters.dateTo || undefined,
              lastModifiedType: advancedFilters.lastModifiedType || 'both',
              stockMin: advancedFilters.stockMin,
              stockMax: advancedFilters.stockMax,
              stockMinMin: advancedFilters.stockMinMin,
              stockMinMax: advancedFilters.stockMinMax,
              priceMin: advancedFilters.priceMin,
              priceMax: advancedFilters.priceMax,
              supplierCode: advancedFilters.supplierCode,
              warehouse: advancedFilters.warehouse,
              aisle: advancedFilters.aisle,
              shelf: advancedFilters.shelf,
              batchStatus: advancedFilters.batchStatus,
              createdAtFrom: advancedFilters.createdAtFrom,
              createdAtTo: advancedFilters.createdAtTo,
            },
            { page: currentPage, pageSize },
          );
        } catch {
          // Error ya está manejado en el hook
        }
      },
      searchTerm.trim() ? 300 : 0,
    ); // Debounce de 300ms para mejor rendimiento

    return () => clearTimeout(timeoutId);
  }, [
    searchTerm,
    showInactive,
    showLowStock,
    currentPage,
    pageSize,
    advancedFilters,
    list,
  ]);

  /**
   * Maneja la visualización de un producto.
   * Valida que el producto exista antes de navegar.
   */
  const handleView = (product: Product) => {
    if (!product || !product.id) {
      // eslint-disable-next-line no-console
      console.error('Producto inválido para visualizar');
      return;
    }
    navigate(`/products/${product.id}`);
  };

  /**
   * Maneja la edición de un producto.
   * Valida que el producto exista y que el usuario tenga permisos.
   */
  const handleEdit = (product: Product) => {
    if (!product || !product.id) {
      // eslint-disable-next-line no-console
      console.error('Producto inválido para editar');
      return;
    }
    if (!canEdit) {
      // eslint-disable-next-line no-console
      console.warn('No tienes permisos para editar productos');
      return;
    }
    navigate(`/products/${product.id}/edit`);
  };

  /**
   * Maneja la creación de un movimiento para un producto.
   * Valida que el producto exista y que el usuario tenga permisos.
   */
  const handleMovement = (product: Product) => {
    if (!product || !product.id) {
      // eslint-disable-next-line no-console
      console.error('Producto inválido para crear movimiento');
      return;
    }
    if (!canCreateMovement) {
      // eslint-disable-next-line no-console
      console.warn('No tienes permisos para crear movimientos');
      return;
    }
    navigate(`/movements?product=${product.id}`);
  };

  /**
   * Maneja la eliminación de un producto.
   * Incluye confirmación del usuario y validaciones.
   */
  const handleDelete = async (product: Product) => {
    if (!product || !product.id) {
      // eslint-disable-next-line no-console
      console.error('Producto inválido para eliminar');
      return;
    }

    // La confirmación ya se hace en ProductTable, pero añadimos validación adicional
    try {
      await remove(product.id);
      // Recargar lista manteniendo filtros y paginación actuales
      await list(
        {
          search: searchTerm || undefined,
          includeInactive: showInactive,
          lowStock: showLowStock || advancedFilters.lowStock || undefined,
          category: advancedFilters.category,
          isBatchTracked: advancedFilters.isBatchTracked,
          lastModifiedFrom: advancedFilters.dateFrom,
          lastModifiedTo: advancedFilters.dateTo,
          lastModifiedType: advancedFilters.lastModifiedType || 'both',
          stockMin: advancedFilters.stockMin,
          stockMax: advancedFilters.stockMax,
          stockMinMin: advancedFilters.stockMinMin,
          stockMinMax: advancedFilters.stockMinMax,
          priceMin: advancedFilters.priceMin,
          priceMax: advancedFilters.priceMax,
          supplierCode: advancedFilters.supplierCode,
          warehouse: advancedFilters.warehouse,
          aisle: advancedFilters.aisle,
          shelf: advancedFilters.shelf,
          batchStatus: advancedFilters.batchStatus,
          createdAtFrom: advancedFilters.createdAtFrom,
          createdAtTo: advancedFilters.createdAtTo,
        },
        { page: currentPage, pageSize },
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error al eliminar producto:', error);
      // El error ya está manejado en el hook, pero mostramos un mensaje adicional si es necesario
    }
  };

  /**
   * Maneja la duplicación de un producto.
   * Valida que el producto exista y que el usuario tenga permisos.
   */
  const handleDuplicate = (product: Product) => {
    if (!product || !product.id) {
      // eslint-disable-next-line no-console
      console.error('Producto inválido para duplicar');
      return;
    }
    if (!canCreate) {
      // eslint-disable-next-line no-console
      console.warn('No tienes permisos para crear productos');
      return;
    }
    navigate(`/products/duplicate/${product.id}`);
  };

  /**
   * Maneja la visualización del historial de un producto.
   * Valida que el producto exista.
   */
  const handleHistory = (product: Product) => {
    if (!product || !product.id) {
      // eslint-disable-next-line no-console
      console.error('Producto inválido para ver historial');
      return;
    }
    navigate(`/products/${product.id}/history`);
  };

  /**
   * Maneja la exportación de un producto individual a Excel.
   * Valida que el producto tenga datos válidos y exporta todos los campos relevantes.
   */
  const handleExportProduct = async (product: Product) => {
    if (!product || !product.id) {
      // eslint-disable-next-line no-console
      console.error('Producto inválido para exportar');
      return;
    }

    try {
      // Exportar producto individual a Excel con todos los campos relevantes
      // Asegurar que todos los valores sean primitivos válidos (sin null/undefined)
      const excelData = [
        {
          Código: String(product.code || ''),
          Nombre: String(product.name || ''),
          Descripción: String(product.description || ''),
          Categoría: String(product.category || ''),
          'Stock Actual': Number(product.stockCurrent ?? 0),
          'Stock Mínimo': Number(product.stockMin ?? 0),
          'Stock Máximo': product.stockMax != null ? Number(product.stockMax) : '',
          'Precio Coste (€)':
            typeof product.costPrice === 'number'
              ? Number(product.costPrice)
              : Number(parseFloat(String(product.costPrice || '0')) || 0),
          'Precio Venta (€)':
            product.salePrice != null
              ? typeof product.salePrice === 'number'
                ? Number(product.salePrice)
                : Number(parseFloat(String(product.salePrice)) || 0)
              : '',
          'Cód.Provedor': String(product.supplierCode || ''),
          Almacén: (() => {
            // Obtener todos los almacenes únicos de las ubicaciones
            if (
              product.locations &&
              Array.isArray(product.locations) &&
              product.locations.length > 0
            ) {
              const warehouses = new Set<string>();
              product.locations.forEach((loc) => {
                if (loc.warehouse === 'MEYPAR') warehouses.add('MEYPAR');
                else if (loc.warehouse === 'OLIVA_TORRAS') warehouses.add('Oliva Torras');
                else if (loc.warehouse === 'FURGONETA') warehouses.add('Furgoneta');
              });
              return Array.from(warehouses).join(', ') || '-';
            }
            // Fallback para productos antiguos
            return product.warehouse === 'MEYPAR'
              ? 'MEYPAR'
              : product.warehouse === 'OLIVA_TORRAS'
                ? 'Oliva Torras'
                : product.warehouse === 'FURGONETA'
                  ? 'Furgoneta'
                  : '-';
          })(),
          Ubicación: (() => {
            // Obtener todas las ubicaciones formateadas
            if (
              product.locations &&
              Array.isArray(product.locations) &&
              product.locations.length > 0
            ) {
              const locationStrings: string[] = [];
              product.locations.forEach((loc) => {
                if (loc.warehouse === 'MEYPAR') {
                  locationStrings.push(`${loc.aisle}${loc.shelf.toUpperCase()}`);
                } else if (loc.warehouse === 'FURGONETA') {
                  locationStrings.push(loc.shelf); // shelf contiene el nombre del técnico
                } else if (loc.warehouse === 'OLIVA_TORRAS') {
                  locationStrings.push('Oliva Torras');
                }
              });
              return locationStrings.join(', ') || '-';
            }
            // Fallback para productos antiguos
            return product.warehouse === 'MEYPAR'
              ? `${product.aisle}${product.shelf}`
              : product.warehouse === 'OLIVA_TORRAS'
                ? 'Oliva Torras'
                : product.warehouse === 'FURGONETA' && product.locationExtra
                  ? product.locationExtra
                  : product.aisle && product.shelf
                    ? `${product.aisle}${product.shelf}`
                    : '-';
          })(),
          'Control por Lotes': product.isBatchTracked ? 'Sí' : 'No',
          'Unidad de Medida': String(product.unitOfMeasure || ''),
          'Peso (kg)': product.weightKg != null ? Number(product.weightKg) : '',
          'Dimensiones (cm)': product.dimensionsCm
            ? `${product.dimensionsCm.length || ''} x ${product.dimensionsCm.width || ''} x ${product.dimensionsCm.height || ''}`
            : '',
          'URL de Compra': String(product.purchaseUrl || ''),
          'URL de Imagen': String(product.imageUrl || ''),
          Notas: String(product.notes || ''),
          Estado: product.isActive ? 'Activo' : 'Inactivo',
          'Fecha de Creación': product.createdAt
            ? new Date(product.createdAt).toLocaleDateString('es-ES')
            : '',
          'Fecha de Modificación': product.updatedAt
            ? new Date(product.updatedAt).toLocaleDateString('es-ES')
            : '',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();

      // Ajustar anchos de columna para mejor legibilidad
      const colWidths = [
        { wch: 15 }, // Código
        { wch: 20 }, // Código de Barras
        { wch: 40 }, // Nombre
        { wch: 50 }, // Descripción
        { wch: 15 }, // Categoría
        { wch: 12 }, // Stock Actual
        { wch: 12 }, // Stock Mínimo
        { wch: 12 }, // Stock Máximo
        { wch: 15 }, // Precio Coste
        { wch: 15 }, // Precio Venta
        { wch: 18 }, // Cód.Provedor
        { wch: 12 }, // Almacén
        { wch: 15 }, // Ubicación
        { wch: 15 }, // Control por Lotes
        { wch: 15 }, // Unidad de Medida
        { wch: 12 }, // Peso
        { wch: 20 }, // Dimensiones
        { wch: 30 }, // URL de Compra
        { wch: 30 }, // URL de Imagen
        { wch: 50 }, // Notas
        { wch: 10 }, // Estado
        { wch: 18 }, // Fecha de Creación
        { wch: 20 }, // Fecha de Modificación
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Producto');

      // Generar el buffer Excel con opciones explícitas
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
        cellStyles: false,
        compression: true,
      });

      // Crear el blob con el tipo MIME correcto
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Crear y descargar el archivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `producto_${(product.code || 'sin_codigo').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Mostrar mensaje de éxito
      // eslint-disable-next-line no-console
      console.log(`Producto "${product.name}" exportado correctamente como ${fileName}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error al exportar producto:', error);
      // Mostrar error al usuario
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(
        t('products.exportError') || `Error al exportar el producto: ${errorMessage}`,
      );
    }
  };

  /**
   * Maneja la activación/desactivación de un producto.
   * Valida que el producto exista y que el usuario tenga permisos.
   */
  const handleToggleActive = async (product: Product) => {
    if (!product || !product.id) {
      // eslint-disable-next-line no-console
      console.error('Producto inválido para cambiar estado');
      return;
    }
    if (!canEdit) {
      // eslint-disable-next-line no-console
      console.warn('No tienes permisos para editar productos');
      return;
    }

    try {
      await update(product.id, {
        isActive: !product.isActive,
        updatedBy: authContext?.profile.id || '',
      });
      // Recargar lista manteniendo filtros y paginación actuales
      await list(
        {
          search: searchTerm || undefined,
          includeInactive: showInactive,
          lowStock: showLowStock || advancedFilters.lowStock || undefined,
          category: advancedFilters.category,
          isBatchTracked: advancedFilters.isBatchTracked,
          lastModifiedFrom: advancedFilters.dateFrom,
          lastModifiedTo: advancedFilters.dateTo,
          lastModifiedType: advancedFilters.lastModifiedType || 'both',
          stockMin: advancedFilters.stockMin,
          stockMax: advancedFilters.stockMax,
          stockMinMin: advancedFilters.stockMinMin,
          stockMinMax: advancedFilters.stockMinMax,
          priceMin: advancedFilters.priceMin,
          priceMax: advancedFilters.priceMax,
          supplierCode: advancedFilters.supplierCode,
          warehouse: advancedFilters.warehouse,
          aisle: advancedFilters.aisle,
          shelf: advancedFilters.shelf,
          batchStatus: advancedFilters.batchStatus,
          createdAtFrom: advancedFilters.createdAtFrom,
          createdAtTo: advancedFilters.createdAtTo,
        },
        { page: currentPage, pageSize },
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error al cambiar estado del producto:', error);
      // El error ya está manejado en el hook
    }
  };

  // Acciones masivas
  const handleBulkActivate = async () => {
    try {
      await Promise.all(
        selectedProductIds.map((id) =>
          update(id, {
            isActive: true,
            updatedBy: authContext?.profile.id || '',
          }),
        ),
      );
      setSelectedProductIds([]);
      await list(
        {
          search: searchTerm || undefined,
          includeInactive: showInactive,
          lowStock: showLowStock || advancedFilters.lowStock || undefined,
          category: advancedFilters.category,
          isBatchTracked: advancedFilters.isBatchTracked,
        },
        { page: currentPage, pageSize },
      );
    } catch {
      // Error ya está manejado en el hook
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      await Promise.all(
        selectedProductIds.map((id) =>
          update(id, {
            isActive: false,
            updatedBy: authContext?.profile.id || '',
          }),
        ),
      );
      setSelectedProductIds([]);
      await list(
        {
          search: searchTerm || undefined,
          includeInactive: showInactive,
          lowStock: showLowStock || advancedFilters.lowStock || undefined,
          category: advancedFilters.category,
          isBatchTracked: advancedFilters.isBatchTracked,
        },
        { page: currentPage, pageSize },
      );
    } catch {
      // Error ya está manejado en el hook
    }
  };

  const handleBulkExport = async () => {
    if (selectedProductIds.length === 0) return;

    try {
      // Construir filtros actuales para obtener TODOS los productos filtrados
      const currentFilters: DomainProductFilters = {
        search: searchTerm || undefined,
        includeInactive: showInactive,
        lowStock: showLowStock || advancedFilters.lowStock || undefined,
        category: advancedFilters.category,
        isBatchTracked: advancedFilters.isBatchTracked,
        stockMin: advancedFilters.stockMin,
        stockMax: advancedFilters.stockMax,
        priceMin: advancedFilters.priceMin,
        priceMax: advancedFilters.priceMax,
        supplierCode: advancedFilters.supplierCode,
        warehouse: advancedFilters.warehouse,
        aisle: advancedFilters.aisle,
        shelf: advancedFilters.shelf,
        stockMinMin: advancedFilters.stockMinMin,
        stockMinMax: advancedFilters.stockMinMax,
        batchStatus: advancedFilters.batchStatus,
        lastModifiedFrom: advancedFilters.dateFrom,
        lastModifiedTo: advancedFilters.dateTo,
        createdAtFrom: advancedFilters.createdAtFrom,
        createdAtTo: advancedFilters.createdAtTo,
      };

      // Obtener TODOS los productos filtrados (sin paginación)
      const allProducts = await getAll(currentFilters);

      // Filtrar solo los productos seleccionados
      let selectedProducts = allProducts.filter((p) => selectedProductIds.includes(p.id));

      if (selectedProducts.length === 0) {
        // eslint-disable-next-line no-console
        console.warn('No se encontraron productos seleccionados para exportar');
        return;
      }

      // Enriquecer productos con ubicaciones si no las tienen (necesario para calcular stock por almacén)
      selectedProducts = await enrichProductsWithLocations(selectedProducts);

      // Función para calcular stock por almacén (misma lógica que handleExportExcel)
      const calculateStockByWarehouse = (
        product: Product,
        warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
      ): number => {
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

      // Obtener almacenes únicos
      const getWarehouses = (product: Product): string => {
        if (
          product.locations &&
          Array.isArray(product.locations) &&
          product.locations.length > 0
        ) {
          const warehouseSet = new Set<string>();
          product.locations.forEach((loc) => {
            if (loc.warehouse === 'MEYPAR') warehouseSet.add('MEYPAR');
            else if (loc.warehouse === 'OLIVA_TORRAS') warehouseSet.add('Oliva Torras');
            else if (loc.warehouse === 'FURGONETA') warehouseSet.add('Furgoneta');
          });
          return Array.from(warehouseSet).join(', ') || '-';
        } else if (product.warehouse) {
          return product.warehouse === 'MEYPAR'
            ? 'MEYPAR'
            : product.warehouse === 'OLIVA_TORRAS'
              ? 'Oliva Torras'
              : product.warehouse === 'FURGONETA'
                ? 'Furgoneta'
                : '-';
        }
        return '-';
      };

      // Obtener ubicaciones formateadas
      const getLocations = (product: Product): string => {
        if (
          product.locations &&
          Array.isArray(product.locations) &&
          product.locations.length > 0
        ) {
          const locationStrings: string[] = [];
          product.locations.forEach((loc) => {
            if (loc.warehouse === 'MEYPAR') {
              locationStrings.push(`${loc.aisle}${loc.shelf.toUpperCase()}`);
            } else if (loc.warehouse === 'FURGONETA') {
              locationStrings.push(loc.shelf); // shelf contiene el nombre del técnico
            } else if (loc.warehouse === 'OLIVA_TORRAS') {
              locationStrings.push('Oliva Torras');
            }
          });
          return locationStrings.join(', ') || '-';
        } else if (product.aisle && product.shelf) {
          return `${product.aisle}${product.shelf}`;
        }
        return '-';
      };

      const excelData = selectedProducts.map((product) => {
        return {
          Código: product.code || '',
          Nombre: product.name || '',
          Categoría: product.category || '',
          'Stock MEYPAR': calculateStockByWarehouse(product, 'MEYPAR'),
          'Stock OLIVA TORRAS': calculateStockByWarehouse(product, 'OLIVA_TORRAS'),
          'Stock FURGONETA': calculateStockByWarehouse(product, 'FURGONETA'),
          'Stock Total': product.stockCurrent ?? 0,
          'Stock Mínimo': product.stockMin ?? 0,
          Almacén: getWarehouses(product),
          Ubicación: getLocations(product),
          'Precio Coste (€)':
            typeof product.costPrice === 'number' ? product.costPrice : 0,
          'Precio Venta (€)':
            typeof product.salePrice === 'number' ? product.salePrice : '',
          'Cód.Provedor': product.supplierCode || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `productos_seleccionados_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSelectedProductIds([]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error al exportar productos seleccionados:', error);
    }
  };

  const handleBulkDelete = async () => {
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      await Promise.all(selectedProductIds.map((id) => remove(id)));
      setSelectedProductIds([]);
      setShowBulkDeleteConfirm(false);
      await list(
        {
          search: searchTerm || undefined,
          includeInactive: showInactive,
          lowStock: showLowStock || advancedFilters.lowStock || undefined,
          category: advancedFilters.category,
          isBatchTracked: advancedFilters.isBatchTracked,
          lastModifiedFrom: advancedFilters.dateFrom,
          lastModifiedTo: advancedFilters.dateTo,
          lastModifiedType: advancedFilters.lastModifiedType || 'both',
          stockMin: advancedFilters.stockMin,
          stockMax: advancedFilters.stockMax,
          stockMinMin: advancedFilters.stockMinMin,
          stockMinMax: advancedFilters.stockMinMax,
          priceMin: advancedFilters.priceMin,
          priceMax: advancedFilters.priceMax,
          supplierCode: advancedFilters.supplierCode,
          warehouse: advancedFilters.warehouse,
          aisle: advancedFilters.aisle,
          shelf: advancedFilters.shelf,
          batchStatus: advancedFilters.batchStatus,
          createdAtFrom: advancedFilters.createdAtFrom,
          createdAtTo: advancedFilters.createdAtTo,
        },
        { page: currentPage, pageSize },
      );
    } catch {
      // Error ya está manejado en el hook
    }
  };

  // Calcular información de stock para productos seleccionados
  const selectedProductsWithStock = React.useMemo(() => {
    if (!products || selectedProductIds.length === 0) return { count: 0, totalStock: 0 };
    const selected = products.filter((p) => selectedProductIds.includes(p.id));
    const withStock = selected.filter((p) => p.stockCurrent > 0);
    const totalStock = withStock.reduce((sum, p) => sum + p.stockCurrent, 0);
    return { count: withStock.length, totalStock };
  }, [products, selectedProductIds]);

  const exportColumns: ColumnOption[] = React.useMemo(
    () => [
      // Por defecto seleccionados según petición: Codi, Nom, Estoc, Mín, Stock Máximo,
      // Pasillo, Estante, Ubicación extra, Código proveedor, Control por lotes
      { key: 'code', label: t('table.code'), defaultSelected: true },
      { key: 'name', label: t('table.name'), defaultSelected: true },
      { key: 'category', label: t('table.category'), defaultSelected: false },
      { key: 'stockMEYPAR', label: 'Stock MEYPAR', defaultSelected: true },
      { key: 'stockOLIVA_TORRAS', label: 'Stock OLIVA TORRAS', defaultSelected: true },
      { key: 'stockFURGONETA', label: 'Stock FURGONETA', defaultSelected: true },
      {
        key: 'stockCurrent',
        label: t('table.stock') + ' (Total)',
        defaultSelected: true,
      },
      { key: 'stockMin', label: t('table.min'), defaultSelected: true },
      { key: 'stockMax', label: 'Stock Máximo', defaultSelected: true },
      { key: 'warehouse', label: 'Almacén', defaultSelected: true },
      { key: 'aisle', label: 'Ubicación', defaultSelected: true },
      { key: 'costPrice', label: 'Precio Coste (€)', defaultSelected: false },
      { key: 'salePrice', label: 'Precio Venta (€)', defaultSelected: false },
      { key: 'supplierCode', label: 'Cód.Provedor', defaultSelected: true },
      { key: 'isBatchTracked', label: 'Control por Lotes', defaultSelected: true },
      { key: 'unitOfMeasure', label: 'Unidad de Medida', defaultSelected: false },
      { key: 'isActive', label: t('table.status'), defaultSelected: false },
    ],
    [t],
  );

  // Obtener ubicaciones para productos si no las tienen (para exportación)
  const enrichProductsWithLocations = React.useCallback(
    async (products: Product[]): Promise<Product[]> => {
      // Verificar si algún producto no tiene locations
      const productsWithoutLocations = products.filter(
        (p) => !p.locations || p.locations.length === 0,
      );

      if (productsWithoutLocations.length === 0) {
        return products; // Todos tienen locations
      }

      // Obtener ubicaciones para productos que no las tienen
      const repository = new SupabaseProductRepository();

      // Obtener ubicaciones en lotes
      const enrichedProducts = [...products];
      for (const product of productsWithoutLocations) {
        try {
          const locations = await repository.getProductLocations(product.id);
          const productIndex = enrichedProducts.findIndex((p) => p.id === product.id);
          if (productIndex >= 0) {
            enrichedProducts[productIndex] = {
              ...enrichedProducts[productIndex],
              locations,
            };
          }
        } catch (error) {
          // Si falla, continuar sin locations
          console.warn(
            `Error al obtener ubicaciones para producto ${product.id}:`,
            error,
          );
        }
      }

      return enrichedProducts;
    },
    [],
  );

  const handleExportExcel = React.useCallback(
    async (
      selectedColumns: string[],
      format: 'xlsx' | 'csv' = 'xlsx',
      includeFilters: boolean = false,
    ) => {
      try {
        // Si includeFilters es false, exportar TODOS los productos sin filtros
        // Si includeFilters es true, aplicar los filtros actuales
        const filtersToApply: DomainProductFilters | undefined = includeFilters
          ? {
              search: searchTerm || undefined,
              includeInactive: showInactive,
              lowStock: showLowStock || advancedFilters.lowStock || undefined,
              category: advancedFilters.category,
              isBatchTracked: advancedFilters.isBatchTracked,
              stockMin: advancedFilters.stockMin,
              stockMax: advancedFilters.stockMax,
              priceMin: advancedFilters.priceMin,
              priceMax: advancedFilters.priceMax,
              supplierCode: advancedFilters.supplierCode,
              warehouse: advancedFilters.warehouse,
              aisle: advancedFilters.aisle,
              shelf: advancedFilters.shelf,
              stockMinMin: advancedFilters.stockMinMin,
              stockMinMax: advancedFilters.stockMinMax,
              batchStatus: advancedFilters.batchStatus,
              lastModifiedFrom: advancedFilters.dateFrom,
              lastModifiedTo: advancedFilters.dateTo,
              createdAtFrom: advancedFilters.createdAtFrom,
              createdAtTo: advancedFilters.createdAtTo,
            }
          : undefined;

        // Obtener TODOS los productos (sin paginación)
        // Si filtersToApply es undefined, exportar TODOS los productos (activos e inactivos)
        // para cumplir con la solicitud del usuario de exportar todos los productos de la base de datos
        let allProducts = await getAll(filtersToApply || { includeInactive: true });

        if (!allProducts || allProducts.length === 0) {
          // eslint-disable-next-line no-console
          console.warn('No hay productos para exportar');
          throw new Error('No hay productos para exportar');
        }

        // Enriquecer productos con ubicaciones si no las tienen (necesario para calcular stock por almacén)
        allProducts = await enrichProductsWithLocations(allProducts);

        if (selectedColumns.length === 0) {
          throw new Error('No hay columnas seleccionadas para exportar');
        }

        // Mapeo de columnas
        const columnMap: Record<string, (p: Product) => string | number> = {
          code: (p) => p.code,
          name: (p) => p.name,
          category: (p) => p.category || '',
          stockMEYPAR: (p) => {
            // Calcular stock en MEYPAR desde locations
            if (p.locations && Array.isArray(p.locations) && p.locations.length > 0) {
              return p.locations
                .filter((loc) => loc.warehouse === 'MEYPAR')
                .reduce((sum, loc) => sum + (loc.quantity || 0), 0);
            }
            // Fallback: si el producto tiene warehouse MEYPAR pero no locations
            return p.warehouse === 'MEYPAR' ? p.stockCurrent : 0;
          },
          stockOLIVA_TORRAS: (p) => {
            // Calcular stock en OLIVA_TORRAS desde locations
            if (p.locations && Array.isArray(p.locations) && p.locations.length > 0) {
              return p.locations
                .filter((loc) => loc.warehouse === 'OLIVA_TORRAS')
                .reduce((sum, loc) => sum + (loc.quantity || 0), 0);
            }
            // Fallback: si el producto tiene warehouse OLIVA_TORRAS pero no locations
            return p.warehouse === 'OLIVA_TORRAS' ? p.stockCurrent : 0;
          },
          stockFURGONETA: (p) => {
            // Calcular stock en FURGONETA desde locations
            if (p.locations && Array.isArray(p.locations) && p.locations.length > 0) {
              return p.locations
                .filter((loc) => loc.warehouse === 'FURGONETA')
                .reduce((sum, loc) => sum + (loc.quantity || 0), 0);
            }
            // Fallback: si el producto tiene warehouse FURGONETA pero no locations
            return p.warehouse === 'FURGONETA' ? p.stockCurrent : 0;
          },
          stockCurrent: (p) => p.stockCurrent,
          stockMin: (p) => p.stockMin,
          stockMax: (p) => p.stockMax || '',
          warehouse: (p) => {
            // Obtener todos los almacenes únicos de las ubicaciones
            if (p.locations && Array.isArray(p.locations) && p.locations.length > 0) {
              const warehouses = new Set<string>();
              p.locations.forEach((loc) => {
                if (loc.warehouse === 'MEYPAR') warehouses.add('MEYPAR');
                else if (loc.warehouse === 'OLIVA_TORRAS') warehouses.add('Oliva Torras');
                else if (loc.warehouse === 'FURGONETA') warehouses.add('Furgoneta');
              });
              return (
                Array.from(warehouses).join(', ') ||
                (p.warehouse === 'MEYPAR'
                  ? 'MEYPAR'
                  : p.warehouse === 'OLIVA_TORRAS'
                    ? 'Oliva Torras'
                    : p.warehouse === 'FURGONETA'
                      ? 'Furgoneta'
                      : '-')
              );
            }
            // Fallback para productos antiguos
            return p.warehouse === 'MEYPAR'
              ? 'MEYPAR'
              : p.warehouse === 'OLIVA_TORRAS'
                ? 'Oliva Torras'
                : p.warehouse === 'FURGONETA'
                  ? 'Furgoneta'
                  : '-';
          },
          aisle: (p) => {
            // Obtener todas las ubicaciones formateadas
            if (p.locations && Array.isArray(p.locations) && p.locations.length > 0) {
              const locationStrings: string[] = [];
              p.locations.forEach((loc) => {
                if (loc.warehouse === 'MEYPAR') {
                  locationStrings.push(`${loc.aisle}${loc.shelf.toUpperCase()}`);
                } else if (loc.warehouse === 'FURGONETA') {
                  locationStrings.push(loc.shelf); // shelf contiene el nombre del técnico
                } else if (loc.warehouse === 'OLIVA_TORRAS') {
                  locationStrings.push('Oliva Torras');
                }
              });
              return locationStrings.join(', ') || '-';
            }
            // Fallback para productos antiguos
            return p.warehouse === 'MEYPAR'
              ? `${p.aisle}${p.shelf}`
              : p.warehouse === 'OLIVA_TORRAS'
                ? 'Oliva Torras'
                : p.warehouse === 'FURGONETA' && p.locationExtra
                  ? p.locationExtra
                  : p.aisle && p.shelf
                    ? `${p.aisle}${p.shelf}`
                    : '-';
          },
          costPrice: (p) => (typeof p.costPrice === 'number' ? p.costPrice : 0),
          salePrice: (p) => (typeof p.salePrice === 'number' ? p.salePrice : ''),
          supplierCode: (p) => p.supplierCode || '', // Se mapeará a "Cód.Provedor" en el label
          isBatchTracked: (p) => (p.isBatchTracked ? 'Sí' : 'No'),
          unitOfMeasure: (p) => p.unitOfMeasure || '',
          isActive: (p) => (p.isActive ? 'Activo' : 'Inactivo'),
        };

        // Preparar datos para Excel solo con columnas seleccionadas
        const excelData = allProducts.map((product) => {
          const row: Record<string, string | number> = {};
          selectedColumns.forEach((colKey) => {
            const column = exportColumns.find((c) => c.key === colKey);
            if (column && columnMap[colKey]) {
              row[column.label] = columnMap[colKey](product);
            }
          });
          return row;
        });

        // Crear workbook y worksheet
        let worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

        const headerRow = excelData.length > 0 ? Object.keys(excelData[0]) : [];

        // Nota: Los estilos de Excel requieren xlsx-style, que no es compatible con Vite
        // Se usa XLSX estándar que funciona correctamente sin estilos

        // Formatear columnas de precio como moneda (formato numérico)
        headerRow.forEach((colName) => {
          if (colName.includes('(€)') || colName.includes('Precio')) {
            const colIndex = headerRow.indexOf(colName);
            if (colIndex >= 0) {
              for (let row = 1; row < excelData.length; row++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
                if (
                  worksheet[cellAddress] &&
                  worksheet[cellAddress].v !== '' &&
                  typeof worksheet[cellAddress].v === 'number'
                ) {
                  worksheet[cellAddress].z = '#,##0.00'; // Formato numérico con separadores de miles
                  worksheet[cellAddress].t = 'n'; // Tipo numérico
                }
              }
            }
          }
        });

        // Calcular ancho automático de columnas basado en contenido
        const columnWidths: { wch: number }[] = [];

        headerRow.forEach((colName) => {
          const columnData = excelData.map((row) => row[colName]);
          const width = calculateColumnWidth(columnData, colName);
          columnWidths.push({ wch: width });
        });

        worksheet['!cols'] = columnWidths;

        // Añadir fila de totales si hay columnas numéricas
        const numericColumns: Record<string, 'sum' | 'avg'> = {};
        headerRow.forEach((colName) => {
          // Sumar todas las columnas de stock (por almacén y total)
          if (
            colName === 'Stock MEYPAR' ||
            colName === 'Stock OLIVA TORRAS' ||
            colName === 'Stock FURGONETA' ||
            (colName.includes('Stock') && colName.includes('Total'))
          ) {
            numericColumns[colName] = 'sum';
          } else if (colName.includes('Precio') || colName.includes('precio')) {
            numericColumns[colName] = 'sum';
          }
        });

        if (Object.keys(numericColumns).length > 0 && excelData.length > 0) {
          const totalsRow = createTotalsRow(excelData, headerRow, numericColumns);
          const totalsData: Record<string, string | number> = {};
          headerRow.forEach((col) => {
            if (numericColumns[col]) {
              totalsData[col] = totalsRow[col] || 0;
            } else {
              totalsData[col] = col === headerRow[0] ? 'TOTALES' : '';
            }
          });

          // Añadir fila de totales al final
          excelData.push(totalsData);

          // Recrear worksheet con totales
          const newWorksheet = XLSX.utils.json_to_sheet(excelData);

          // Aplicar formato numérico y estilos a los totales
          const lastRow = excelData.length - 1;
          headerRow.forEach((colName, colIndex) => {
            if (numericColumns[colName]) {
              const cellAddress = XLSX.utils.encode_cell({ r: lastRow, c: colIndex });
              if (
                newWorksheet[cellAddress] &&
                typeof newWorksheet[cellAddress].v === 'number'
              ) {
                newWorksheet[cellAddress].z = colName.includes('Precio')
                  ? '#,##0.00'
                  : '#,##0';
                newWorksheet[cellAddress].t = 'n';
              }
            }
          });

          // Reemplazar worksheet
          workbook.Sheets['Productos'] = newWorksheet;
          worksheet = newWorksheet;
        }

        // Freeze panes en header
        worksheet['!freeze'] = {
          xSplit: 0,
          ySplit: 1,
          topLeftCell: 'A2',
          activePane: 'bottomLeft',
          state: 'frozen',
        };

        // Generar archivo según formato
        let blob: Blob;
        let fileName: string;

        if (format === 'csv') {
          // Convertir a CSV (UTF-8 con BOM para que Excel muestre bien acentos y caracteres especiales)
          const csvContent = XLSX.utils.sheet_to_csv(worksheet);
          const bom = '\uFEFF'; // Byte Order Mark para UTF-8
          blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
          fileName = `productos_${new Date().toISOString().split('T')[0]}.csv`;
        } else {
          // Excel (xlsx) - formato por defecto
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          fileName = `productos_${new Date().toISOString().split('T')[0]}.xlsx`;
        }

        // Crear enlace de descarga
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // eslint-disable-next-line no-console
        console.log(
          `✅ Archivo ${format.toUpperCase()} generado y descargado: ${fileName}`,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error al exportar productos:', error);
        throw error; // Re-lanzar el error para que el modal pueda manejarlo
      }
    },
    [
      exportColumns,
      getAll,
      showInactive,
      showLowStock,
      advancedFilters,
      enrichProductsWithLocations,
    ],
  );

  const canCreate = authContext?.permissions?.includes('products.create') ?? false;
  const canView = authContext?.permissions?.includes('products.view') ?? false;
  const canEdit = authContext?.permissions?.includes('products.edit') ?? false;
  // Solo ADMIN puede eliminar productos
  const canDelete = canEdit && authContext?.profile?.role === 'ADMIN';
  const canCreateMovement =
    authContext?.permissions?.includes('movements.create') ?? false;

  // Atajos de teclado
  useKeyboardShortcuts([
    {
      key: 'f',
      ctrl: true,
      action: () => {
        const searchInput = document.querySelector(
          'input[placeholder*="Buscar"]',
        ) as HTMLInputElement;
        searchInput?.focus();
      },
      description: t('shortcuts.search'),
    },
    {
      key: 'n',
      ctrl: true,
      action: () => {
        if (canCreate) {
          navigate('/products/new');
        }
      },
      description: t('shortcuts.new'),
    },
    {
      key: 'e',
      ctrl: true,
      action: () => {
        if (products && products.length > 0) {
          setShowExportDialog(true);
        }
      },
      description: t('shortcuts.export'),
    },
    {
      key: 'v',
      ctrl: true,
      action: () => {
        setViewMode(viewMode === 'table' ? 'grid' : 'table');
      },
      description: t('shortcuts.toggleView'),
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            {t('products.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {pagination.total} {t('products.total')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Toggle de vista */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            <Button
              variant={viewMode === 'table' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              title={t('products.view.table')}
              className="h-8"
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              title={t('products.view.grid')}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Configurar columnas (solo en vista tabla) */}
          {viewMode === 'table' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnConfig(true)}
              title={t('products.columns.configure')}
            >
              <Settings className="mr-2 h-4 w-4" />
              {t('products.columns.title')}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={!products || products.length === 0}
            title={t('products.export')}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('products.export')}
          </Button>
          {canCreate && (
            <Button onClick={() => navigate('/products/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('products.new')}
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-4 flex-wrap">
            <div className="flex-1 max-w-md min-w-[200px]">
              <SearchInput
                placeholder={t('products.search')}
                value={searchTerm}
                onChange={setSearchTerm}
                onClear={() => {
                  setSearchTerm('');
                }}
                onSearch={(value) => {
                  if (value.trim().length >= 3) {
                    navigate(`/products/search?q=${encodeURIComponent(value.trim())}`);
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <ProductFilters
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
              />
            </div>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700 dark:text-gray-300">
                {t('products.includeInactive')}
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700 dark:text-gray-300">
                {t('products.lowStockOnly')}
              </span>
            </label>
          </div>
        </div>

        {/* Chips de filtros activos */}
        {(searchTerm ||
          showInactive ||
          showLowStock ||
          Object.keys(advancedFilters).length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {searchTerm && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                {t('products.search')}: &quot;{searchTerm}&quot;
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {showLowStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {t('products.lowStockOnly')}
                <button
                  onClick={() => setShowLowStock(false)}
                  className="ml-1 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {showInactive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                {t('products.includeInactive')}
                <button
                  onClick={() => setShowInactive(false)}
                  className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {t('table.category')}: {advancedFilters.category}
                <button
                  onClick={() =>
                    setAdvancedFilters({ ...advancedFilters, category: undefined })
                  }
                  className="ml-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.isBatchTracked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                {t('filters.batchTracked') || 'Solo con lotes'}
                <button
                  onClick={() =>
                    setAdvancedFilters({ ...advancedFilters, isBatchTracked: undefined })
                  }
                  className="ml-1 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.lowStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                {t('products.lowStockOnly')}
                <button
                  onClick={() =>
                    setAdvancedFilters({ ...advancedFilters, lowStock: undefined })
                  }
                  className="ml-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.stockNearMinimum && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                {t('filters.stockNearMinimum') || 'Productos al 15% del stock mínimo'}
                <button
                  onClick={() =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      stockNearMinimum: undefined,
                    })
                  }
                  className="ml-1 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(advancedFilters.stockMin !== undefined ||
              advancedFilters.stockMax !== undefined) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {t('table.stock')}: {advancedFilters.stockMin ?? '0'} -{' '}
                {advancedFilters.stockMax ?? '∞'}
                <button
                  onClick={() =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      stockMin: undefined,
                      stockMax: undefined,
                    })
                  }
                  className="ml-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(advancedFilters.priceMin !== undefined ||
              advancedFilters.priceMax !== undefined) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                {t('filters.price')}: {advancedFilters.priceMin ?? '0'}€ -{' '}
                {advancedFilters.priceMax ?? '∞'}€
                <button
                  onClick={() =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      priceMin: undefined,
                      priceMax: undefined,
                    })
                  }
                  className="ml-1 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.supplierCode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                {t('table.supplierCode')}: {advancedFilters.supplierCode}
                <button
                  onClick={() =>
                    setAdvancedFilters({ ...advancedFilters, supplierCode: undefined })
                  }
                  className="ml-1 rounded-full hover:bg-teal-200 dark:hover:bg-teal-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.warehouse && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">
                {t('filters.warehouse') || 'Almacén'}:{' '}
                {advancedFilters.warehouse === 'MEYPAR'
                  ? t('form.warehouse.meypar') || 'MEYPAR'
                  : advancedFilters.warehouse === 'OLIVA_TORRAS'
                    ? t('form.warehouse.olivaTorras') || 'Oliva Torras'
                    : t('form.warehouse.furgoneta') || 'Furgoneta'}
                <button
                  onClick={() =>
                    setAdvancedFilters({ ...advancedFilters, warehouse: undefined })
                  }
                  className="ml-1 rounded-full hover:bg-cyan-200 dark:hover:bg-cyan-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.aisle && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">
                {t('filters.aisle')}: {advancedFilters.aisle}
                <button
                  onClick={() =>
                    setAdvancedFilters({ ...advancedFilters, aisle: undefined })
                  }
                  className="ml-1 rounded-full hover:bg-cyan-200 dark:hover:bg-cyan-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.shelf && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">
                {t('filters.shelf')}: {advancedFilters.shelf}
                <button
                  onClick={() =>
                    setAdvancedFilters({ ...advancedFilters, shelf: undefined })
                  }
                  className="ml-1 rounded-full hover:bg-cyan-200 dark:hover:bg-cyan-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.batchStatus && advancedFilters.batchStatus.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                {t('filters.batchStatus')}: {advancedFilters.batchStatus.join(', ')}
                <button
                  onClick={() =>
                    setAdvancedFilters({ ...advancedFilters, batchStatus: undefined })
                  }
                  className="ml-1 rounded-full hover:bg-orange-200 dark:hover:bg-orange-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(advancedFilters.stockMinMin !== undefined ||
              advancedFilters.stockMinMax !== undefined) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                {t('filters.stockMinRange')}: {advancedFilters.stockMinMin ?? '0'} -{' '}
                {advancedFilters.stockMinMax ?? '∞'}
                <button
                  onClick={() =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      stockMinMin: undefined,
                      stockMinMax: undefined,
                    })
                  }
                  className="ml-1 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(advancedFilters.createdAtFrom || advancedFilters.createdAtTo) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                {t('products.createdAt') || 'Creado'}:{' '}
                {(() => {
                  if (advancedFilters.createdAtSlider !== undefined) {
                    return (
                      DATE_RANGE_OPTIONS.find(
                        (opt) => opt.value === advancedFilters.createdAtSlider,
                      )?.label || 'Personalizado'
                    );
                  }
                  // Si no hay slider, intentar calcularlo desde las fechas
                  const sliderValue = getSliderValueFromDate(
                    advancedFilters.createdAtFrom,
                    advancedFilters.createdAtTo,
                  );
                  return sliderValue !== undefined
                    ? DATE_RANGE_OPTIONS.find((opt) => opt.value === sliderValue)
                        ?.label || 'Personalizado'
                    : 'Personalizado';
                })()}
                <button
                  onClick={() =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      createdAtFrom: undefined,
                      createdAtTo: undefined,
                      createdAtSlider: undefined,
                    })
                  }
                  className="ml-1 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(advancedFilters.dateFrom || advancedFilters.dateTo) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                {t('filters.lastModified') || 'Modificado'}:{' '}
                {(() => {
                  if (advancedFilters.lastModifiedSlider !== undefined) {
                    return (
                      DATE_RANGE_OPTIONS.find(
                        (opt) => opt.value === advancedFilters.lastModifiedSlider,
                      )?.label || 'Personalizado'
                    );
                  }
                  // Si no hay slider, intentar calcularlo desde las fechas
                  const sliderValue = getSliderValueFromDate(
                    advancedFilters.dateFrom,
                    advancedFilters.dateTo,
                  );
                  return sliderValue !== undefined
                    ? DATE_RANGE_OPTIONS.find((opt) => opt.value === sliderValue)
                        ?.label || 'Personalizado'
                    : 'Personalizado';
                })()}
                <button
                  onClick={() =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      dateFrom: undefined,
                      dateTo: undefined,
                      lastModifiedSlider: undefined,
                    })
                  }
                  className="ml-1 rounded-full hover:bg-pink-200 dark:hover:bg-pink-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Barra de acciones masivas */}
      {selectedProductIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedProductIds.length}
          totalCount={pagination.total}
          onSelectAll={async () => {
            // Obtener TODOS los productos filtrados (no solo los de la página actual)
            const currentFilters: DomainProductFilters = {
              search: searchTerm || undefined,
              includeInactive: showInactive,
              lowStock: showLowStock || advancedFilters.lowStock || undefined,
              category: advancedFilters.category,
              isBatchTracked: advancedFilters.isBatchTracked,
              stockMin: advancedFilters.stockMin,
              stockMax: advancedFilters.stockMax,
              priceMin: advancedFilters.priceMin,
              priceMax: advancedFilters.priceMax,
              supplierCode: advancedFilters.supplierCode,
              warehouse: advancedFilters.warehouse,
              aisle: advancedFilters.aisle,
              shelf: advancedFilters.shelf,
              stockMinMin: advancedFilters.stockMinMin,
              stockMinMax: advancedFilters.stockMinMax,
              batchStatus: advancedFilters.batchStatus,
              lastModifiedFrom: advancedFilters.dateFrom,
              lastModifiedTo: advancedFilters.dateTo,
              createdAtFrom: advancedFilters.createdAtFrom,
              createdAtTo: advancedFilters.createdAtTo,
            };

            const allFilteredProducts = await getAll(currentFilters);
            const allIds = allFilteredProducts.map((p) => p.id);
            setSelectedProductIds(allIds);
          }}
          onDeselectAll={() => setSelectedProductIds([])}
          onActivate={canEdit ? handleBulkActivate : undefined}
          onDeactivate={canEdit ? handleBulkDeactivate : undefined}
          onExport={canView ? handleBulkExport : undefined}
          onDelete={canDelete ? handleBulkDelete : undefined}
          isAllSelected={selectedProductIds.length === pagination.total}
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Tabla o Vista de Tarjetas */}
      {viewMode === 'table' ? (
        <ProductTable
          products={products ?? []}
          loading={loading}
          searchTerm={searchTerm}
          selectedIds={selectedProductIds}
          onSelectionChange={setSelectedProductIds}
          visibleColumns={tableColumns}
          onColumnResize={(columnId, width) => {
            const updated = tableColumns.map((col) =>
              col.id === columnId ? { ...col, width } : col,
            );
            saveColumns(updated);
          }}
          onView={canView ? handleView : undefined}
          onEdit={canEdit ? handleEdit : undefined}
          onMovement={canCreateMovement ? handleMovement : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          onDuplicate={canCreate ? handleDuplicate : undefined}
          onHistory={canView ? handleHistory : undefined}
          onExport={canView ? handleExportProduct : undefined}
          onToggleActive={canEdit ? handleToggleActive : undefined}
        />
      ) : (
        <ProductGridView
          products={products ?? []}
          loading={loading}
          searchTerm={searchTerm}
          onView={canView ? handleView : undefined}
          onEdit={canEdit ? handleEdit : undefined}
          onMovement={canCreateMovement ? handleMovement : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          onDuplicate={canCreate ? handleDuplicate : undefined}
          onHistory={canView ? handleHistory : undefined}
          onExport={canView ? handleExportProduct : undefined}
          onToggleActive={canEdit ? handleToggleActive : undefined}
        />
      )}

      {/* Paginación - SIEMPRE visible */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('pagination.showing')} {(currentPage - 1) * pagination.pageSize + 1} -{' '}
            {Math.min(currentPage * pagination.pageSize, pagination.total)}{' '}
            {t('pagination.of')} {pagination.total} {t('products.title').toLowerCase()}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              {t('pagination.itemsPerPage') || 'Por página:'}
            </label>
            <select
              value={pageSize}
              onChange={async (e) => {
                const newSize = parseInt(e.target.value, 10);
                setPageSize(newSize);
                setCurrentPage(1);

                // Guardar automáticamente en la configuración del usuario
                if (authContext?.profile?.id) {
                  try {
                    await userRepository.updateSettings(authContext.profile.id, {
                      itemsPerPage: newSize,
                    });
                    // Refrescar el contexto para que se actualice en toda la app
                    await refreshContext();
                  } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('Error al guardar elementos por página:', error);
                  }
                }
              }}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            title={t('pagination.first') || 'Primera página'}
          >
            ««
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            {t('pagination.previous')}
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('pagination.page') || 'Página'}
            </span>
            <Input
              type="number"
              min={1}
              max={Math.ceil(pagination.total / pagination.pageSize)}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value, 10);
                if (
                  page >= 1 &&
                  page <= Math.ceil(pagination.total / pagination.pageSize)
                ) {
                  setCurrentPage(page);
                }
              }}
              className="w-16 text-center"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              / {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage * pagination.pageSize >= pagination.total}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            {t('pagination.next')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage * pagination.pageSize >= pagination.total}
            onClick={() =>
              setCurrentPage(Math.ceil(pagination.total / pagination.pageSize))
            }
            title={t('pagination.last') || 'Última página'}
          >
            »»
          </Button>
        </div>
      </div>

      {/* Modal de exportación */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        columns={exportColumns}
        onExport={handleExportExcel}
        fileName={`productos_${new Date().toISOString().split('T')[0]}`}
      />

      {/* Modal de configuración de columnas */}
      <ColumnConfigDialog
        isOpen={showColumnConfig}
        onClose={() => setShowColumnConfig(false)}
        columns={tableColumns}
        onSave={async (newColumns) => {
          // Guardar las nuevas columnas con orden actualizado
          const reordered = newColumns.map((col, index) => ({
            ...col,
            order: index,
          }));
          await saveColumns(reordered);
          // Forzar actualización del estado
          setShowColumnConfig(false);
        }}
        onReset={resetColumns}
      />

      {/* Diálogo de confirmación de eliminación masiva */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title={t('actions.delete')}
        message={
          selectedProductsWithStock.count > 0
            ? t('actions.confirmDeleteBulkWithStock', {
                count: selectedProductIds.length,
                withStockCount: selectedProductsWithStock.count,
                totalStock: selectedProductsWithStock.totalStock,
              })
            : t('actions.confirmDeleteBulk', { count: selectedProductIds.length })
        }
        confirmText={t('actions.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
    </div>
  );
}
