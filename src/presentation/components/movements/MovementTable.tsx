import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  ArrowRightLeft,
  Package,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
} from 'lucide-react';
import * as React from 'react';
import type { InventoryMovement, MovementType, Product } from '@domain/entities';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/cn';
import { ResizableColumnHeader } from '../products/ResizableColumnHeader';

interface MovementWithProduct extends InventoryMovement {
  product?: Product;
  userFirstName?: string | null;
  userLastName?: string | null;
  productCode?: string | null;
  productName?: string | null;
}

interface MovementTableProps {
  movements: MovementWithProduct[];
  loading?: boolean;
  onViewProduct?: (productId: string) => void;
  onViewDetail?: (movement: MovementWithProduct) => void;
  emptyMessage?: string;
  emptyDescription?: string;
  visibleColumns?: Array<{
    id: string;
    label: string;
    visible: boolean;
    order: number;
    width?: number;
  }>;
  onColumnResize?: (columnId: string, width: number) => void;
}

const movementTypeConfig: Record<
  MovementType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  IN: {
    icon: ArrowDownCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  OUT: {
    icon: ArrowUpCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  ADJUSTMENT: {
    icon: RefreshCw,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  TRANSFER: {
    icon: ArrowRightLeft,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

/**
 * Tabla de movimientos de inventario con scroll horizontal y columnas redimensionables.
 *
 * Muestra una tabla con todos los movimientos, incluyendo fecha, tipo,
 * producto, cantidad, stock antes/después, motivo, categoría y usuario.
 * Permite hacer clic en las filas para ver el detalle completo.
 * Incluye scroll horizontal con botones y área de arrastre, similar a ProductTable.
 *
 * @component
 * @param {MovementTableProps} props - Propiedades del componente
 * @param {MovementWithProduct[]} props.movements - Lista de movimientos a mostrar
 * @param {boolean} props.loading - Estado de carga
 * @param {Function} props.onViewProduct - Callback al hacer clic en un producto
 * @param {Function} props.onViewDetail - Callback al hacer clic en una fila
 * @param {Array} props.visibleColumns - Columnas visibles con configuración de ancho
 * @param {Function} props.onColumnResize - Callback al redimensionar una columna
 */
export const MovementTable = React.memo(function MovementTable({
  movements,
  loading = false,
  onViewProduct,
  onViewDetail,
  emptyMessage,
  emptyDescription,
  visibleColumns,
  onColumnResize,
}: MovementTableProps) {
  const { t } = useLanguage();
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
  }, [checkScrollButtons, movements]);

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

  // Función helper para verificar si una columna es visible
  const isColumnVisible = (columnId: string): boolean => {
    if (!visibleColumns || visibleColumns.length === 0) return true;
    const column = visibleColumns.find((col) => col.id === columnId);
    return column ? column.visible : true;
  };

  // Obtener ancho de columna
  const getColumnWidth = (columnId: string): number | undefined => {
    if (!visibleColumns || visibleColumns.length === 0) return undefined;
    const column = visibleColumns.find((col) => col.id === columnId);
    return column?.width;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <Package className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">
          {emptyMessage || t('movements.noMovements')}
        </p>
        <p className="text-sm">{emptyDescription || t('movements.createFirst')}</p>
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
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {isColumnVisible('date') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('date')}
                    minWidth={120}
                    onResize={(width) => onColumnResize('date', width)}
                    className="group"
                  >
                    <div className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('movements.date')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('movements.date')}
                  </th>
                )
              )}
              {isColumnVisible('type') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('type')}
                    minWidth={100}
                    onResize={(width) => onColumnResize('type', width)}
                    className="group"
                  >
                    <div className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('movements.type')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('movements.type')}
                  </th>
                )
              )}
              {isColumnVisible('product') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('product')}
                    minWidth={150}
                    onResize={(width) => onColumnResize('product', width)}
                    className="group"
                  >
                    <div className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('movements.product')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('movements.product')}
                  </th>
                )
              )}
              {isColumnVisible('quantity') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('quantity')}
                    minWidth={80}
                    onResize={(width) => onColumnResize('quantity', width)}
                    className="group text-right"
                  >
                    <div className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('movements.quantity')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('movements.quantity')}
                  </th>
                )
              )}
              {isColumnVisible('stockBefore') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('stockBefore')}
                    minWidth={100}
                    onResize={(width) => onColumnResize('stockBefore', width)}
                    className="group text-right"
                  >
                    <div className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('movements.stockBefore')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('movements.stockBefore')}
                  </th>
                )
              )}
              {isColumnVisible('stockAfter') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('stockAfter')}
                    minWidth={100}
                    onResize={(width) => onColumnResize('stockAfter', width)}
                    className="group text-right"
                  >
                    <div className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('movements.stockAfter')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('movements.stockAfter')}
                  </th>
                )
              )}
              {isColumnVisible('reason') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('reason')}
                    minWidth={200}
                    onResize={(width) => onColumnResize('reason', width)}
                    className="group"
                  >
                    <div className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('movements.reason')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('movements.reason')}
                  </th>
                )
              )}
              {isColumnVisible('category') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('category')}
                    minWidth={100}
                    onResize={(width) => onColumnResize('category', width)}
                    className="group"
                  >
                    <div className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('movements.category')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('movements.category')}
                  </th>
                )
              )}
              {isColumnVisible('user') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('user')}
                    minWidth={120}
                    onResize={(width) => onColumnResize('user', width)}
                    className="group"
                  >
                    <div className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('movements.user')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('movements.user')}
                  </th>
                )
              )}
              {isColumnVisible('actions') && (
                onColumnResize ? (
                  <ResizableColumnHeader
                    initialWidth={getColumnWidth('actions')}
                    minWidth={80}
                    onResize={(width) => onColumnResize('actions', width)}
                    className="group"
                  >
                    <div className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('table.actions')}
                    </div>
                  </ResizableColumnHeader>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('table.actions')}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody
            className={cn(
              'divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800',
              // Añadir cursor grab cuando se puede hacer scroll horizontal (solo en el cuerpo de la tabla)
              (canScrollLeft || canScrollRight) && 'cursor-grab active:cursor-grabbing',
            )}
            onMouseDown={(e) => {
              // Solo iniciar drag si no se hace click en un botón o elemento interactivo
              const target = e.target as HTMLElement;
              const isButton = target.closest('button');
              const isSelectable = target.closest('[data-selectable]');
              if (isButton || isSelectable) {
                return;
              }
              if (canScrollLeft || canScrollRight) {
                handleDragStart(e);
              }
            }}
          >
            {movements.map((movement) => {
              const config = movementTypeConfig[movement.movementType];
              const Icon = config.icon;
              const date = new Date(movement.movementDate);
              const userName =
                movement.userFirstName || movement.userLastName
                  ? `${movement.userFirstName || ''} ${movement.userLastName || ''}`.trim()
                  : null;

              // Obtener anchos de columnas
              const dateWidth = getColumnWidth('date');
              const typeWidth = getColumnWidth('type');
              const productWidth = getColumnWidth('product');
              const quantityWidth = getColumnWidth('quantity');
              const stockBeforeWidth = getColumnWidth('stockBefore');
              const stockAfterWidth = getColumnWidth('stockAfter');
              const reasonWidth = getColumnWidth('reason');
              const categoryWidth = getColumnWidth('category');
              const userWidth = getColumnWidth('user');
              const actionsWidth = getColumnWidth('actions');

              return (
                <tr
                  key={movement.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => onViewDetail?.(movement)}
                  style={{ cursor: "pointer" }}
                >
                  {isColumnVisible('date') && (
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-50"
                      style={dateWidth ? { width: `${dateWidth}px`, minWidth: `${dateWidth}px`, maxWidth: `${dateWidth}px` } : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{date.toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {date.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  {isColumnVisible('type') && (
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm"
                      style={typeWidth ? { width: `${typeWidth}px`, minWidth: `${typeWidth}px`, maxWidth: `${typeWidth}px` } : undefined}
                    >
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          config.bgColor,
                          config.color,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t(`movements.type.${movement.movementType}`)}
                      </span>
                    </td>
                  )}
                  {isColumnVisible('product') && (
                    <td
                      className="px-4 py-3 text-sm"
                      style={productWidth ? { width: `${productWidth}px`, minWidth: `${productWidth}px`, maxWidth: `${productWidth}px` } : undefined}
                    >
                      {movement.product || movement.productName ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProduct?.(movement.productId);
                          }}
                          className="text-left hover:underline"
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-50">
                            {movement.product?.name || movement.productName || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {movement.product?.code ||
                              movement.productCode ||
                              movement.productId.slice(0, 8)}
                          </div>
                        </button>
                      ) : (
                        <span className="text-gray-400">
                          {movement.productId.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                  )}
                  {isColumnVisible('quantity') && (
                    <td
                      className="whitespace-nowrap px-4 py-3 text-right text-sm"
                      style={quantityWidth ? { width: `${quantityWidth}px`, minWidth: `${quantityWidth}px`, maxWidth: `${quantityWidth}px` } : undefined}
                    >
                      <span
                        className={cn(
                          'font-bold',
                          movement.movementType === 'IN'
                            ? 'text-green-600 dark:text-green-400'
                            : movement.movementType === 'OUT'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-gray-50',
                        )}
                      >
                        {movement.movementType === 'IN'
                          ? '+'
                          : movement.movementType === 'OUT'
                            ? '-'
                            : ''}
                        {movement.quantity}
                      </span>
                    </td>
                  )}
                  {isColumnVisible('stockBefore') && (
                    <td
                      className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400"
                      style={stockBeforeWidth ? { width: `${stockBeforeWidth}px`, minWidth: `${stockBeforeWidth}px`, maxWidth: `${stockBeforeWidth}px` } : undefined}
                    >
                      {movement.quantityBefore}
                    </td>
                  )}
                  {isColumnVisible('stockAfter') && (
                    <td
                      className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-50"
                      style={stockAfterWidth ? { width: `${stockAfterWidth}px`, minWidth: `${stockAfterWidth}px`, maxWidth: `${stockAfterWidth}px` } : undefined}
                    >
                      {movement.quantityAfter}
                    </td>
                  )}
                  {isColumnVisible('reason') && (
                    <td
                      className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50"
                      style={reasonWidth ? { width: `${reasonWidth}px`, minWidth: `${reasonWidth}px`, maxWidth: `${reasonWidth}px` } : undefined}
                    >
                      <div className="max-w-xs truncate" title={movement.requestReason}>
                        {movement.requestReason}
                      </div>
                      {movement.comments && (
                        <div className="mt-1 space-y-1">
                          {/* Detectar y mostrar cambios de producto */}
                          {(() => {
                            const comments = movement.comments;
                            const hasNameChange = comments.includes('Nombre:') || comments.includes('Nom:');
                            const hasCodeChange = comments.includes('Código:') || comments.includes('Codi:') || comments.includes('Código de barras:');
                            const hasLocationChange = comments.includes('Pa illo:') || comments.includes('E tante:') || comments.includes('Ubicación') || comments.includes('Ubicació');
                            const hasBarcodeChange = comments.includes('Código de barras:') || comments.includes('Codi de barres:');
                            const hasActiveChange = comments.includes('Activo:') || comments.includes('Actiu:');

                            if (!hasNameChange && !hasCodeChange && !hasLocationChange && !hasBarcodeChange && !hasActiveChange) {
                              // Si no hay cambios específicos, mostrar comentarios normales
                              return (
                                <div
                                  className="max-w-xs truncate text-xs text-gray-500 dark:text-gray-400"
                                  title={comments}
                                >
                                  {comments}
                                </div>
                              );
                            }

                            // Mostrar badges de cambios
                            return (
                              <div className="flex flex-wrap gap-1">
                                {hasNameChange && (
                                  <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    {t('movements.changes.name') || 'Nombre'}
                                  </span>
                                )}
                                {hasCodeChange && (
                                  <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                    {t('movements.changes.code') || 'Código'}
                                  </span>
                                )}
                                {hasBarcodeChange && (
                                  <span className="inline-flex items-center rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                    {t('movements.changes.barcode') || 'Código de barras'}
                                  </span>
                                )}
                                {hasLocationChange && (
                                  <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                    {t('movements.changes.location') || 'Ubicación'}
                                  </span>
                                )}
                                {hasActiveChange && (
                                  <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                    {t('movements.changes.active') || 'Activo'}
                                  </span>
                                )}
                                <div
                                  className="max-w-xs truncate text-xs text-gray-500 dark:text-gray-400"
                                  title={comments}
                                >
                                  {comments}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                  )}
                  {isColumnVisible('category') && (
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm"
                      style={categoryWidth ? { width: `${categoryWidth}px`, minWidth: `${categoryWidth}px`, maxWidth: `${categoryWidth}px` } : undefined}
                    >
                      {movement.reasonCategory && (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {t(`movements.category.${movement.reasonCategory}`)}
                        </span>
                      )}
                    </td>
                  )}
                  {isColumnVisible('user') && (
                    <td
                      className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50"
                      style={userWidth ? { width: `${userWidth}px`, minWidth: `${userWidth}px`, maxWidth: `${userWidth}px` } : undefined}
                    >
                      {userName ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{userName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {isColumnVisible('actions') && (
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm"
                      style={actionsWidth ? { width: `${actionsWidth}px`, minWidth: `${actionsWidth}px`, maxWidth: `${actionsWidth}px` } : undefined}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail?.(movement);
                        }}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        {t('common.view')}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
