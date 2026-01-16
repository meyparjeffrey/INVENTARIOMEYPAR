import {
  AlertTriangle,
  Edit,
  Eye,
  MoreVertical,
  Package,
  Trash2,
  Copy,
  History,
  Download as DownloadIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
} from 'lucide-react';
import * as React from 'react';
import type { Product } from '@domain/entities';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/cn';
import { highlightText } from '../../utils/highlightText';
import { formatCurrency } from '../../utils/formatCurrency';
import { ResizableColumnHeader } from './ResizableColumnHeader';
import { ProductPreviewTooltip } from './ProductPreviewTooltip';
import { ConfirmDialog } from '../ui/ConfirmDialog';

type SortField =
  | 'code'
  | 'name'
  | 'category'
  | 'stockCurrent'
  | 'stockMin'
  | 'warehouse'
  | 'aisle'
  | 'supplierCode'
  | 'costPrice'
  | 'salePrice'
  | 'createdAt'
  | 'updatedAt';
type SortDirection = 'asc' | 'desc';

interface ProductTableProps {
  products: Product[];
  loading?: boolean;
  searchTerm?: string;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  visibleColumns?: Array<{
    id: string;
    label: string;
    visible: boolean;
    order: number;
    width?: number;
  }>;
  onColumnResize?: (columnId: string, width: number) => void;
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onMovement?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  onHistory?: (product: Product) => void;
  onExport?: (product: Product) => void;
  onToggleActive?: (product: Product) => void;
}

/**
 * Tabla de productos con columnas, badges y acciones.
 */
export const ProductTable = React.memo(
  function ProductTable({
    products,
    loading = false,
    searchTerm = '',
    selectedIds = [],
    onSelectionChange,
    visibleColumns,
    onColumnResize,
    onView,
    onEdit,
    onMovement,
    onDelete,
    onDuplicate,
    onHistory,
    onExport,
    onToggleActive,
  }: ProductTableProps) {
    const { t } = useLanguage();
    const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);
    const [actionMenuOpen, setActionMenuOpen] = React.useState<string | null>(null);
    const [sortField, setSortField] = React.useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
    const [deleteConfirm, setDeleteConfirm] = React.useState<{
      isOpen: boolean;
      product: Product | null;
    }>({
      isOpen: false,
      product: null,
    });
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const dragStartX = React.useRef(0);
    const scrollStartX = React.useRef(0);

    // Función para verificar el estado del scroll
    const checkScrollButtons = React.useCallback(() => {
      if (!scrollContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }, []);

    // Efecto para verificar el estado del scroll
    React.useEffect(() => {
      checkScrollButtons();
      const container = scrollContainerRef.current;
      if (!container) return;

      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);

      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }, [checkScrollButtons, products]);

    // Funciones de scroll
    const scrollLeft = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
      }
    };

    const scrollRight = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
      }
    };

    // Funciones de arrastre
    const handleDragStart = React.useCallback((e: React.MouseEvent) => {
      if (!scrollContainerRef.current) return;
      setIsDragging(true);
      dragStartX.current = e.clientX;
      scrollStartX.current = scrollContainerRef.current.scrollLeft;
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDragMove = React.useCallback(
      (e: MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        const deltaX = e.clientX - dragStartX.current;
        scrollContainerRef.current.scrollLeft = scrollStartX.current - deltaX;
      },
      [isDragging],
    );

    const handleDragEnd = React.useCallback(() => {
      setIsDragging(false);
    }, []);

    // Efecto para manejar eventos globales de arrastre
    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      } else {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Función para ordenar productos
    const sortedProducts = React.useMemo(() => {
      if (!sortField) return products;

      const sorted = [...products].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case 'code':
            aValue = a.code.toLowerCase();
            bValue = b.code.toLowerCase();
            break;
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'category':
            aValue = (a.category || '').toLowerCase();
            bValue = (b.category || '').toLowerCase();
            break;
          case 'stockCurrent':
            aValue = a.stockCurrent;
            bValue = b.stockCurrent;
            break;
          case 'stockMin':
            aValue = a.stockMin;
            bValue = b.stockMin;
            break;
          case 'warehouse':
            aValue = (a.warehouse || '').toLowerCase();
            bValue = (b.warehouse || '').toLowerCase();
            break;
          case 'aisle': {
            // Ordenar por ubicación formateada (usar primera ubicación si hay múltiples)
            const getLocationValue = (p: Product) => {
              if (p.warehouse === 'MEYPAR') {
                if (p.locations && Array.isArray(p.locations) && p.locations.length > 0) {
                  const primary =
                    p.locations.find((loc) => loc.isPrimary) || p.locations[0];
                  return `${primary.aisle}${primary.shelf}`.toLowerCase();
                }
                return `${p.aisle}${p.shelf}`.toLowerCase();
              } else if (p.warehouse === 'OLIVA_TORRAS') {
                return 'oliva torras';
              } else if (p.warehouse === 'FURGONETA' && p.locationExtra) {
                return p.locationExtra.toLowerCase();
              }
              return `${p.aisle}${p.shelf}`.toLowerCase();
            };
            aValue = getLocationValue(a);
            bValue = getLocationValue(b);
            break;
          }
          case 'supplierCode':
            aValue = (a.supplierCode || '').toLowerCase();
            bValue = (b.supplierCode || '').toLowerCase();
            break;
          case 'costPrice':
            aValue = a.costPrice;
            bValue = b.costPrice;
            break;
          case 'salePrice':
            aValue = a.salePrice || 0;
            bValue = b.salePrice || 0;
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'updatedAt':
            aValue = new Date(a.updatedAt).getTime();
            bValue = new Date(b.updatedAt).getTime();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      return sorted;
    }, [products, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    };

    const handleSelectAll = () => {
      if (onSelectionChange) {
        const allIds = sortedProducts.map((p) => p.id);
        onSelectionChange(allIds);
      }
    };

    const handleDeselectAll = () => {
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    };

    const handleToggleSelect = (productId: string) => {
      if (!onSelectionChange) return;

      if (selectedIds.includes(productId)) {
        onSelectionChange(selectedIds.filter((id) => id !== productId));
      } else {
        onSelectionChange([...selectedIds, productId]);
      }
    };

    const isAllSelected =
      selectedIds.length > 0 && selectedIds.length === sortedProducts.length;
    const isIndeterminate =
      selectedIds.length > 0 && selectedIds.length < sortedProducts.length;

    // Función helper para verificar si una columna es visible
    const isColumnVisible = (columnId: string): boolean => {
      if (!visibleColumns || visibleColumns.length === 0) return true;
      const column = visibleColumns.find((col) => col.id === columnId);
      return column ? column.visible : true;
    };

    // Obtener columnas ordenadas y visibles
    const getOrderedVisibleColumns = () => {
      if (!visibleColumns || visibleColumns.length === 0) {
        // Si no hay configuración, mostrar todas las columnas por defecto
        return [
          { id: 'code', order: 0 },
          { id: 'name', order: 1 },
          { id: 'category', order: 2 },
          { id: 'stockCurrent', order: 3 },
          { id: 'stockMin', order: 4 },
          { id: 'warehouse', order: 5 },
          { id: 'aisle', order: 6 },
          { id: 'supplierCode', order: 7 },
          { id: 'costPrice', order: 8 },
          { id: 'salePrice', order: 9 },
          { id: 'createdAt', order: 10 },
          { id: 'updatedAt', order: 11 },
          { id: 'user', order: 12 },
          { id: 'status', order: 13 },
          { id: 'actions', order: 14 },
        ];
      }
      return visibleColumns
        .filter((col) => col.visible)
        .sort((a, b) => a.order - b.order);
    };

    const orderedColumns = getOrderedVisibleColumns();

    const SortIcon = ({ field }: { field: SortField }) => {
      if (sortField !== field) {
        return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400" />;
      }
      return sortDirection === 'asc' ? (
        <ArrowUp className="ml-1 h-3 w-3 text-primary-600 dark:text-primary-400" />
      ) : (
        <ArrowDown className="ml-1 h-3 w-3 text-primary-600 dark:text-primary-400" />
      );
    };

    if (loading) {
      return (
        <div className="relative rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {[...Array(9)].map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const productsList = sortedProducts ?? [];

    if (productsList.length === 0) {
      return (
        <div className="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <Package className="mb-4 h-12 w-12" />
          <p className="text-lg font-medium">{t('products.noProducts')}</p>
          <p className="text-sm">{t('products.createFirst')}</p>
        </div>
      );
    }

    return (
      <div className="relative rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Controles de scroll horizontal */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition-all hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label="Desplazar izquierda"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition-all hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label="Desplazar derecha"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        )}

        {/* Área de arrastre para scroll */}
        {!canScrollLeft && !canScrollRight ? null : (
          <div
            className={cn(
              'absolute top-0 left-0 right-0 z-10 h-12 cursor-grab transition-opacity hover:opacity-100',
              isDragging && 'cursor-grabbing opacity-100',
              !isDragging && 'opacity-0',
            )}
            onMouseDown={(e) => {
              // No iniciar drag si se hace click en un botón o elemento interactivo
              const target = e.target as HTMLElement;
              const isButton = target.closest('button');
              const isSelectable = target.closest('[data-selectable]');
              if (isButton || isSelectable) {
                return;
              }
              handleDragStart(e);
            }}
            style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
          >
            <div className="flex h-full items-center justify-center">
              <GripHorizontal className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        )}

        {/* Scroll horizontal con indicadores */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db #f3f4f6',
          }}
        >
          <style>{`
          div::-webkit-scrollbar {
            height: 8px;
          }
          div::-webkit-scrollbar-track {
            background: #f3f4f4;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
          .dark div::-webkit-scrollbar-track {
            background: #1f2937;
          }
          .dark div::-webkit-scrollbar-thumb {
            background: #4b5563;
          }
          .dark div::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `}</style>
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {onSelectionChange && (
                  <th className="px-4 py-3 text-center relative z-20">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAllSelected) {
                          handleDeselectAll();
                        } else {
                          handleSelectAll();
                        }
                      }}
                      className="h-6 w-6 p-0 cursor-pointer relative z-20"
                      title={
                        isAllSelected
                          ? t('products.bulk.deselectAll')
                          : t('products.bulk.selectAll')
                      }
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      ) : isIndeterminate ? (
                        <div className="h-4 w-4 rounded border-2 border-primary-600 bg-primary-100 dark:border-primary-400 dark:bg-primary-900/30" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </th>
                )}
                {orderedColumns.map((col) => {
                  if (!isColumnVisible(col.id)) return null;

                  const getHeaderConfig = () => {
                    switch (col.id) {
                      case 'code':
                        return {
                          label: t('table.code'),
                          sortField: 'code' as SortField,
                          align: 'left',
                        };
                      case 'name':
                        return {
                          label: t('table.name'),
                          sortField: 'name' as SortField,
                          align: 'left',
                        };
                      case 'category':
                        return {
                          label: t('table.category'),
                          sortField: 'category' as SortField,
                          align: 'left',
                        };
                      case 'stockCurrent':
                        return {
                          label: t('table.stock'),
                          sortField: 'stockCurrent' as SortField,
                          align: 'right',
                        };
                      case 'stockMin':
                        return {
                          label: t('table.min'),
                          sortField: 'stockMin' as SortField,
                          align: 'right',
                        };
                      case 'warehouse':
                        return {
                          label: t('table.warehouse') || 'Almacén',
                          sortField: 'warehouse' as SortField,
                          align: 'left',
                        };
                      case 'aisle':
                        return {
                          label: t('table.location'),
                          sortField: 'aisle' as SortField,
                          align: 'left',
                        };
                      case 'supplierCode':
                        return {
                          label: t('table.supplierCode'),
                          sortField: 'supplierCode' as SortField,
                          align: 'left',
                        };
                      case 'costPrice':
                        return {
                          label: t('products.price.cost'),
                          sortField: 'costPrice' as SortField,
                          align: 'right',
                        };
                      case 'salePrice':
                        return {
                          label: t('products.price.sale'),
                          sortField: 'salePrice' as SortField,
                          align: 'right',
                        };
                      case 'createdAt':
                        return {
                          label: t('products.createdAt') || 'Fecha de creación',
                          sortField: 'createdAt' as SortField,
                          align: 'left',
                        };
                      case 'updatedAt':
                        return {
                          label: t('products.lastUpdate') || 'Última modificación',
                          sortField: 'updatedAt' as SortField,
                          align: 'left',
                        };
                      case 'user':
                        return {
                          label: t('table.user') || 'Usuario',
                          sortField: null,
                          align: 'left',
                        };
                      case 'status':
                        return {
                          label: t('table.status'),
                          sortField: null,
                          align: 'center',
                        };
                      case 'actions':
                        return {
                          label: t('table.actions'),
                          sortField: null,
                          align: 'center',
                        };
                      default:
                        // Manejar columnas dinámicas de almacén
                        if (col.id.startsWith('warehouse_')) {
                          return {
                            label:
                              (col as any).label ||
                              `Stock ${col.id.replace('warehouse_', '')}`,
                            sortField: null,
                            align: 'right',
                          };
                        }
                        return null;
                    }
                  };

                  const config = getHeaderConfig();
                  if (!config) return null;

                  const columnConfig = visibleColumns?.find((c) => c.id === col.id);
                  const columnWidth = columnConfig?.width;

                  const headerContent = (
                    <div
                      className={cn(
                        'flex items-center px-4 py-3',
                        config.align === 'right' && 'justify-end',
                        config.align === 'center' && 'justify-center',
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400',
                          // Solo código tiene cursor pointer, el resto no
                          config.sortField && col.id === 'code' && 'cursor-pointer',
                          // Para otras columnas con sort, permitir selección de texto pero no pointer
                          config.sortField && col.id !== 'code' && 'select-text',
                        )}
                        onClick={
                          config.sortField && col.id === 'code'
                            ? (e) => {
                                e.stopPropagation();
                                handleSort(config.sortField!);
                              }
                            : config.sortField && col.id !== 'code'
                              ? (e) => {
                                  e.stopPropagation();
                                  handleSort(config.sortField!);
                                }
                              : undefined
                        }
                      >
                        {config.label}
                        {config.sortField && <SortIcon field={config.sortField} />}
                      </div>
                    </div>
                  );

                  if (onColumnResize) {
                    return (
                      <ResizableColumnHeader
                        key={col.id}
                        initialWidth={columnWidth}
                        minWidth={col.id === 'name' ? 150 : col.id === 'code' ? 100 : 80}
                        onResize={(width) => onColumnResize(col.id, width)}
                        className={cn(
                          'group',
                          config.align === 'right' && 'text-right',
                          config.align === 'center' && 'text-center',
                          config.align === 'left' && 'text-left',
                          config.sortField &&
                            'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                        )}
                      >
                        {headerContent}
                      </ResizableColumnHeader>
                    );
                  }

                  return (
                    <th
                      key={col.id}
                      data-code-header={col.id === 'code' ? true : undefined}
                      className={cn(
                        'px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400',
                        config.align === 'right' && 'text-right',
                        config.align === 'center' && 'text-center',
                        config.align === 'left' && 'text-left',
                        // Solo código tiene cursor pointer y hover, el resto permite selección de texto
                        config.sortField &&
                          col.id === 'code' &&
                          'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                        config.sortField &&
                          col.id !== 'code' &&
                          'select-text hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                      )}
                      style={columnWidth ? { width: `${columnWidth}px` } : undefined}
                      onClick={
                        config.sortField ? () => handleSort(config.sortField!) : undefined
                      }
                    >
                      <div
                        className={cn(
                          'flex items-center',
                          config.align === 'right' && 'justify-end',
                          config.align === 'center' && 'justify-center',
                        )}
                      >
                        {config.label}
                        {config.sortField && <SortIcon field={config.sortField} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody
              className={cn(
                'divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800',
                // Añadir cursor grab cuando se puede hacer scroll horizontal (solo en el cuerpo de la tabla)
                (canScrollLeft || canScrollRight) && 'cursor-grab active:cursor-grabbing',
              )}
              onMouseDown={(e) => {
                // Solo activar drag si no se está haciendo click en un header, celda de código o botón
                const target = e.target as HTMLElement;
                const isHeader = target.closest('th');
                const isCodeCell = target.closest('td[data-code-cell]');
                const isButton = target.closest('button');
                const isInput = target.closest('input, select, textarea');

                // Si es un header, celda de código, botón o input, no activar drag
                if (isHeader || isCodeCell || isButton || isInput) {
                  return;
                }

                // Activar drag para mover la tabla
                handleDragStart(e);
              }}
            >
              {productsList.map((product) => {
                const isLowStock = product.stockCurrent <= product.stockMin;
                const isHovered = hoveredRow === product.id;

                return (
                  <tr
                    key={product.id}
                    className={cn(
                      'transition-all duration-200',
                      isHovered && 'bg-gray-50 dark:bg-gray-700/50 shadow-sm',
                    )}
                    onMouseEnter={() => setHoveredRow(product.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {onSelectionChange && (
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleSelect(product.id)}
                          className="h-6 w-6 p-0"
                        >
                          {selectedIds.includes(product.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    )}
                    {orderedColumns.map((col) => {
                      if (!isColumnVisible(col.id)) return null;

                      const columnConfig = visibleColumns?.find((c) => c.id === col.id);
                      const columnWidth = columnConfig?.width;

                      // Aplicar el ancho a todas las celdas de esta columna
                      const cellStyle = columnWidth
                        ? {
                            width: `${columnWidth}px`,
                            minWidth: `${columnWidth}px`,
                            maxWidth: `${columnWidth}px`,
                          }
                        : undefined;

                      const renderCell = () => {
                        switch (col.id) {
                          case 'code':
                            return (
                              <td
                                key="code"
                                data-code-cell="true"
                                className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                style={cellStyle}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onView) {
                                    onView(product);
                                  }
                                }}
                              >
                                <ProductPreviewTooltip product={product}>
                                  <span>{highlightText(product.code, searchTerm)}</span>
                                </ProductPreviewTooltip>
                              </td>
                            );
                          case 'name':
                            return (
                              <td
                                key="name"
                                className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50"
                                style={cellStyle}
                              >
                                <ProductPreviewTooltip product={product}>
                                  <div className="flex items-center gap-2">
                                    <span>{highlightText(product.name, searchTerm)}</span>
                                    {product.isBatchTracked && (
                                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {t('products.batches')}
                                      </span>
                                    )}
                                  </div>
                                </ProductPreviewTooltip>
                              </td>
                            );
                          case 'category':
                            return (
                              <td
                                key="category"
                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                style={cellStyle}
                              >
                                {product.category || (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    -
                                  </span>
                                )}
                              </td>
                            );
                          case 'stockCurrent': {
                            // Sistema de porcentajes por 15% basado en stockMin
                            const stockMinRef = product.stockMin || 1; // Evitar división por 0
                            let stockProgress = 0;
                            let progressColor = 'bg-red-500 dark:bg-red-600'; // Rojo por defecto

                            if (product.stockCurrent <= stockMinRef) {
                              // 0%: En o por debajo del mínimo (rojo)
                              stockProgress = 0;
                              progressColor = 'bg-red-500 dark:bg-red-600';
                            } else if (product.stockCurrent <= stockMinRef * 1.15) {
                              // 15%: Entre mínimo y 15% por encima (amarillo)
                              stockProgress = 15;
                              progressColor = 'bg-yellow-500 dark:bg-yellow-600';
                            } else if (product.stockCurrent <= stockMinRef * 1.3) {
                              // 30%: Entre 15% y 30% por encima (amarillo)
                              stockProgress = 30;
                              progressColor = 'bg-yellow-500 dark:bg-yellow-600';
                            } else if (product.stockCurrent <= stockMinRef * 1.45) {
                              // 45%: Entre 30% y 45% por encima (amarillo/verde)
                              stockProgress = 45;
                              progressColor = 'bg-yellow-500 dark:bg-yellow-600';
                            } else if (product.stockCurrent <= stockMinRef * 1.6) {
                              // 60%: Entre 45% y 60% por encima (verde claro)
                              stockProgress = 60;
                              progressColor = 'bg-green-400 dark:bg-green-500';
                            } else if (product.stockCurrent <= stockMinRef * 1.75) {
                              // 75%: Entre 60% y 75% por encima (verde)
                              stockProgress = 75;
                              progressColor = 'bg-green-500 dark:bg-green-600';
                            } else if (product.stockCurrent <= stockMinRef * 1.9) {
                              // 90%: Entre 75% y 90% por encima (verde)
                              stockProgress = 90;
                              progressColor = 'bg-green-500 dark:bg-green-600';
                            } else if (product.stockCurrent <= stockMinRef * 2) {
                              // 100%: Entre 90% y 2x el mínimo (verde)
                              stockProgress = 100;
                              progressColor = 'bg-green-600 dark:bg-green-700';
                            } else {
                              // 100%+: Más de 2x el mínimo (verde oscuro)
                              stockProgress = 100;
                              progressColor = 'bg-green-700 dark:bg-green-800';
                            }

                            return (
                              <td
                                key="stockCurrent"
                                className="whitespace-nowrap px-4 py-3 text-right text-sm"
                                style={cellStyle}
                              >
                                <div className="flex flex-col items-end gap-1">
                                  <span
                                    className={cn(
                                      'font-medium',
                                      isLowStock && 'text-red-600 dark:text-red-400',
                                      !isLowStock &&
                                        product.stockCurrent <= stockMinRef * 1.15 &&
                                        'text-yellow-600 dark:text-yellow-400',
                                    )}
                                  >
                                    {product.stockCurrent}
                                  </span>
                                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div
                                      className={cn(
                                        'h-full transition-all duration-300',
                                        progressColor,
                                      )}
                                      style={{
                                        width: `${Math.max(stockProgress, 5)}%`, // Mínimo 5% para que sea visible
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                            );
                          }
                          case 'stockMin':
                            return (
                              <td
                                key="stockMin"
                                className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400"
                                style={cellStyle}
                              >
                                {product.stockMin}
                              </td>
                            );
                          case 'warehouse': {
                            // Obtener almacenes únicos de las ubicaciones del producto
                            const warehouses = new Set<string>();
                            if (product.locations && Array.isArray(product.locations)) {
                              product.locations.forEach((loc) =>
                                warehouses.add(loc.warehouse),
                              );
                            } else if (product.warehouse) {
                              warehouses.add(product.warehouse);
                            }

                            // Convertir a nombres completos
                            const warehouseNames = Array.from(warehouses)
                              .map((w) => {
                                switch (w) {
                                  case 'MEYPAR':
                                    return t('form.warehouse.meypar') || 'MEYPAR';
                                  case 'OLIVA_TORRAS':
                                    return (
                                      t('form.warehouse.olivaTorras') || 'Oliva Torras'
                                    );
                                  case 'FURGONETA':
                                    return t('form.warehouse.furgoneta') || 'Furgoneta';
                                  default:
                                    return w;
                                }
                              })
                              .join(', ');

                            return (
                              <td
                                key="warehouse"
                                className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300"
                                style={cellStyle}
                              >
                                {warehouseNames || '-'}
                              </td>
                            );
                          }
                          case 'aisle': {
                            // Formatear ubicaciones: mostrar TODAS separadas por comas
                            let locationText = '-';

                            if (
                              product.locations &&
                              Array.isArray(product.locations) &&
                              product.locations.length > 0
                            ) {
                              // Recopilar todas las ubicaciones formateadas
                              const allLocations: string[] = [];

                              product.locations.forEach((loc) => {
                                if (loc.warehouse === 'MEYPAR') {
                                  allLocations.push(`${loc.aisle}${loc.shelf}`);
                                } else if (loc.warehouse === 'FURGONETA') {
                                  allLocations.push(loc.shelf);
                                } else if (loc.warehouse === 'OLIVA_TORRAS') {
                                  allLocations.push(
                                    t('form.warehouse.olivaTorras') || 'Oliva Torras',
                                  );
                                }
                              });

                              locationText = allLocations.join(', ');
                            } else if (product.aisle && product.shelf) {
                              // Fallback para productos antiguos
                              locationText = `${product.aisle}${product.shelf}`;
                            }

                            return (
                              <td
                                key="aisle"
                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                style={cellStyle}
                              >
                                {locationText}
                              </td>
                            );
                          }
                          case 'supplierCode':
                            return (
                              <td
                                key="supplierCode"
                                className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                style={cellStyle}
                              >
                                {product.supplierCode ? (
                                  <span
                                    className="max-w-xs truncate"
                                    title={product.supplierCode}
                                  >
                                    {product.supplierCode}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    -
                                  </span>
                                )}
                              </td>
                            );
                          case 'costPrice':
                            return (
                              <td
                                key="costPrice"
                                className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50"
                                style={cellStyle}
                              >
                                {formatCurrency(product.costPrice)}
                              </td>
                            );
                          case 'salePrice':
                            return (
                              <td
                                key="salePrice"
                                className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50"
                                style={cellStyle}
                              >
                                {product.salePrice ? (
                                  formatCurrency(product.salePrice)
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    -
                                  </span>
                                )}
                              </td>
                            );
                          case 'createdAt':
                            return (
                              <td
                                key="createdAt"
                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                style={cellStyle}
                              >
                                {new Date(product.createdAt).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </td>
                            );
                          case 'updatedAt':
                            return (
                              <td
                                key="updatedAt"
                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                style={cellStyle}
                              >
                                {new Date(product.updatedAt).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </td>
                            );
                          case 'user': {
                            const userProfile = product.createdByProfile;
                            const userName = userProfile
                              ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
                              : '-';
                            return (
                              <td
                                key="user"
                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                style={cellStyle}
                              >
                                {userName}
                              </td>
                            );
                          }
                          case 'status':
                            return (
                              <td
                                key="status"
                                className="whitespace-nowrap px-4 py-3 text-center text-sm"
                                style={cellStyle}
                              >
                                {isLowStock ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="relative">
                                      <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400 animate-pulse" />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-3 w-3 rounded-full bg-amber-500/30 animate-ping" />
                                      </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                      {t('products.alarm')}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                                      {t('products.ok')}
                                    </span>
                                  </div>
                                )}
                              </td>
                            );
                          case 'actions':
                            return null; // Las acciones se renderizan después
                          default:
                            // Manejar columnas dinámicas de almacén (warehouse_MEYPAR, warehouse_OLIVA_TORRAS, etc.)
                            if (col.id.startsWith('warehouse_')) {
                              const stockValue =
                                ((product as any)[
                                  col.id
                                ] as number) || 0;
                              return (
                                <td
                                  key={col.id}
                                  className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-50"
                                  style={cellStyle}
                                >
                                  {stockValue.toLocaleString()}
                                </td>
                              );
                            }
                            return null;
                        }
                      };

                      return renderCell();
                    })}
                    {isColumnVisible('actions') && (
                      <td
                        key="actions"
                        className="whitespace-nowrap px-4 py-3 text-center text-sm"
                      >
                        <div className="relative flex items-center justify-center gap-1">
                          {/* Botones principales siempre visibles */}
                          <div
                            className={cn(
                              'flex items-center gap-1 transition-opacity duration-200',
                              isHovered ? 'opacity-100' : 'opacity-70',
                            )}
                          >
                            {onView && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onView(product)}
                                title={t('actions.view')}
                                className="transition-all duration-200 hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(product)}
                                title={t('actions.edit')}
                                className="transition-all duration-200 hover:scale-110 hover:bg-green-50 dark:hover:bg-green-900/20"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {/* Menú de acciones adicionales */}
                          {(onDelete ||
                            onDuplicate ||
                            onHistory ||
                            onExport ||
                            onMovement ||
                            onToggleActive) && (
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setActionMenuOpen(
                                    actionMenuOpen === product.id ? null : product.id,
                                  )
                                }
                                title="Más acciones"
                                className={cn(
                                  'transition-all duration-200',
                                  isHovered ? 'opacity-100' : 'opacity-70',
                                  'hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-700',
                                )}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>

                              {actionMenuOpen === product.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setActionMenuOpen(null)}
                                  />
                                  <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                    <div className="py-1">
                                      {onMovement && (
                                        <button
                                          onClick={() => {
                                            onMovement(product);
                                            setActionMenuOpen(null);
                                          }}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                          {t('actions.movement')}
                                        </button>
                                      )}
                                      {onDuplicate && (
                                        <button
                                          onClick={() => {
                                            onDuplicate(product);
                                            setActionMenuOpen(null);
                                          }}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                          <Copy className="h-4 w-4" />
                                          {t('actions.duplicate')}
                                        </button>
                                      )}
                                      {onHistory && (
                                        <button
                                          onClick={() => {
                                            onHistory(product);
                                            setActionMenuOpen(null);
                                          }}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                          <History className="h-4 w-4" />
                                          {t('actions.history')}
                                        </button>
                                      )}
                                      {onExport && (
                                        <button
                                          onClick={() => {
                                            onExport(product);
                                            setActionMenuOpen(null);
                                          }}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                          <DownloadIcon className="h-4 w-4" />
                                          {t('actions.export')}
                                        </button>
                                      )}
                                      {onToggleActive && (
                                        <button
                                          onClick={() => {
                                            onToggleActive(product);
                                            setActionMenuOpen(null);
                                          }}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                          {product.isActive ? (
                                            <>
                                              <AlertTriangle className="h-4 w-4" />
                                              {t('actions.deactivate')}
                                            </>
                                          ) : (
                                            <>
                                              <Package className="h-4 w-4" />
                                              {t('actions.activate')}
                                            </>
                                          )}
                                        </button>
                                      )}
                                      {onDelete && (
                                        <>
                                          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                                          <button
                                            onClick={() => {
                                              setActionMenuOpen(null);
                                              setDeleteConfirm({ isOpen: true, product });
                                            }}
                                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            {t('actions.delete')}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Diálogo de confirmación de eliminación */}
        {deleteConfirm.product && (
          <ConfirmDialog
            isOpen={deleteConfirm.isOpen}
            onClose={() => setDeleteConfirm({ isOpen: false, product: null })}
            onConfirm={() => {
              if (deleteConfirm.product && onDelete) {
                onDelete(deleteConfirm.product);
              }
            }}
            title={t('actions.delete')}
            message={
              deleteConfirm.product.stockCurrent > 0
                ? t('actions.confirmDeleteWithStock', {
                    productName: deleteConfirm.product.name,
                    stock: deleteConfirm.product.stockCurrent,
                  })
                : t('actions.confirmDelete', { productName: deleteConfirm.product.name })
            }
            confirmText={t('actions.delete')}
            cancelText={t('common.cancel')}
            variant="destructive"
          />
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Comparación personalizada para React.memo
    return (
      prevProps.products === nextProps.products &&
      prevProps.loading === nextProps.loading &&
      prevProps.searchTerm === nextProps.searchTerm &&
      JSON.stringify(prevProps.selectedIds) === JSON.stringify(nextProps.selectedIds) &&
      JSON.stringify(prevProps.visibleColumns) ===
        JSON.stringify(nextProps.visibleColumns)
    );
  },
);
