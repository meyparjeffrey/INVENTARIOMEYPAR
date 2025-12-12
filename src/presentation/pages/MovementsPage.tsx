import {
  RefreshCw,
  Download,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw as RefreshCwIcon,
} from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { MovementTable } from '../components/movements/MovementTable';
import { MovementFilters } from '../components/movements/MovementFilters';
import { MovementSortButton } from '../components/movements/MovementSortButton';
import { MovementDetailModal } from '../components/movements/MovementDetailModal';
import { MovementForm } from '../components/movements/MovementForm';
import { MovementStatsCards } from '../components/movements/MovementStatsCards';
import { useLanguage } from '../context/LanguageContext';
import { useMovements } from '../hooks/useMovements';
import { useProducts } from '../hooks/useProducts';
import type {
  MovementType,
  MovementReasonCategory,
  Product,
  InventoryMovement,
} from '@domain/entities';

interface MovementWithProduct extends InventoryMovement {
  product?: Product;
  userFirstName?: string | null;
  userLastName?: string | null;
  productCode?: string | null;
  productName?: string | null;
}

/**
 * Página principal de movimientos de inventario.
 *
 * Permite ver todos los movimientos, crear nuevas entradas y salidas,
 * filtrar, buscar y exportar movimientos. Incluye estadísticas de
 * entradas, salidas y balance neto.
 */
export function MovementsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedMovement, setSelectedMovement] =
    React.useState<MovementWithProduct | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [orderBy, setOrderBy] = React.useState<'date' | 'product'>('date');
  const [orderDirection, setOrderDirection] = React.useState<'asc' | 'desc'>('desc');

  // Estados para modales de creación
  const [isEntryOpen, setIsEntryOpen] = React.useState(false);
  const [isExitOpen, setIsExitOpen] = React.useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = React.useState(false);

  const {
    movements,
    loading,
    error,
    totalCount,
    page,
    totalPages,
    filters,
    setFilters,
    setPage,
    refresh,
    recordMovement,
  } = useMovements();

  // Cargar productos para el formulario
  const { getAll: getAllProducts } = useProducts();
  const [products, setProducts] = React.useState<Product[]>([]);

  // Cargar productos cuando se abre un modal
  React.useEffect(() => {
    if (isEntryOpen || isExitOpen || isAdjustmentOpen) {
      getAllProducts({})
        .then((prods) => {
          setProducts(prods);
        })
        .catch(() => {
          // Error silencioso
        });
    }
  }, [isEntryOpen, isExitOpen, isAdjustmentOpen, getAllProducts]);

  // Búsqueda con debounce
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters((prevFilters) => ({
        ...prevFilters,
        search: searchTerm.trim() || undefined,
      }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, setFilters]);

  // Actualizar ordenación cuando cambia
  React.useEffect(() => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      orderBy,
      orderDirection,
    }));
  }, [orderBy, orderDirection, setFilters]);

  const handleViewProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleViewDetail = (movement: MovementWithProduct) => {
    setSelectedMovement(movement);
    setIsDetailOpen(true);
  };

  // Handlers para abrir modales con tipo preseleccionado
  const handleOpenEntry = () => {
    setPreselectedMovementType('IN');
    setIsEntryOpen(true);
  };

  const handleOpenExit = () => {
    setPreselectedMovementType('OUT');
    setIsExitOpen(true);
  };

  const handleOpenAdjustment = () => {
    setPreselectedMovementType('ADJUSTMENT');
    setIsAdjustmentOpen(true);
  };

  // Handler para crear movimiento
  const handleCreateMovement = async (data: {
    productId: string;
    movementType: MovementType;
    quantity: number;
    requestReason: string;
    reasonCategory?: string;
    comments?: string;
    referenceDocument?: string;
  }) => {
    await recordMovement({
      productId: data.productId,
      movementType: data.movementType,
      quantity: data.quantity,
      requestReason: data.requestReason,
      reasonCategory: data.reasonCategory as MovementReasonCategory | undefined,
      comments: data.comments,
      referenceDocument: data.referenceDocument,
    });

    // Cerrar modales
    setIsEntryOpen(false);
    setIsExitOpen(false);
    setIsAdjustmentOpen(false);
    setPreselectedMovementType(null);
  };

  const handleExportExcel = () => {
    // Preparar datos
    const excelData = movements.map((movement) => {
      const date = new Date(movement.movementDate);
      const userName =
        movement.userFirstName || movement.userLastName
          ? `${movement.userFirstName || ''} ${movement.userLastName || ''}`.trim()
          : '';

      return {
        Fecha: date.toLocaleDateString('es-ES'),
        Hora: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        Tipo:
          movement.movementType === 'IN'
            ? 'Stock in'
            : movement.movementType === 'OUT'
              ? 'Stock out'
              : movement.movementType === 'TRANSFER'
                ? 'Ubicación'
                : movement.movementType === 'ADJUSTMENT' &&
                    movement.comments?.includes('Código:')
                  ? 'Código'
                  : movement.movementType === 'ADJUSTMENT' &&
                      movement.comments?.includes('Nombre:')
                    ? 'Nombre'
                    : movement.movementType === 'ADJUSTMENT' &&
                        movement.comments?.includes('Descripción:')
                      ? 'Descripción'
                      : t(`movements.type.${movement.movementType}`),
        Producto: movement.product?.name || movement.productName || '',
        'Código Producto': movement.product?.code || movement.productCode || '',
        Cantidad: movement.quantity,
        'Stock Antes': movement.quantityBefore,
        'Stock Después': movement.quantityAfter,
        Motivo: movement.requestReason,
        Categoría: movement.reasonCategory
          ? t(`movements.category.${movement.reasonCategory}`)
          : '',
        Comentarios: movement.comments || '',
        Usuario: userName,
        'Documento Referencia': movement.referenceDocument || '',
        'Ubicación Origen': movement.sourceLocation || '',
        'Ubicación Destino': movement.destinationLocation || '',
      };
    });

    // Crear worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 12 }, // Fecha
      { wch: 8 }, // Hora
      { wch: 12 }, // Tipo
      { wch: 30 }, // Producto
      { wch: 18 }, // Código
      { wch: 10 }, // Cantidad
      { wch: 12 }, // Stock Antes
      { wch: 12 }, // Stock Después
      { wch: 45 }, // Motivo
      { wch: 18 }, // Categoría
      { wch: 60 }, // Comentarios
      { wch: 25 }, // Usuario
      { wch: 25 }, // Documento
      { wch: 20 }, // Origen
      { wch: 20 }, // Destino
    ];
    worksheet['!cols'] = colWidths;

    // Nota: xlsx básico no soporta estilos directamente
    // Los estilos se aplicarán cuando Excel abra el archivo
    // Mejoramos el formato con anchos de columna y estructura clara

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimientos_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {t('movements.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {totalCount} {t('movements.total')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenEntry}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <ArrowDownCircle className="h-4 w-4" />
            {t('movements.newEntry')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenExit}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <ArrowUpCircle className="h-4 w-4" />
            {t('movements.newExit')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAdjustment}
            className="gap-2"
          >
            <RefreshCwIcon className="h-4 w-4" />
            {t('movements.type.ADJUSTMENT')}
          </Button>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2"
            disabled={movements.length === 0}
          >
            <Download className="h-4 w-4" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Búsqueda, Filtros y Ordenación */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            placeholder={t('movements.searchPlaceholder')}
            value={searchTerm}
            onChange={(value) => setSearchTerm(value)}
            onClear={() => {
              setSearchTerm('');
              setFilters({ ...filters, search: undefined });
            }}
          />
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2">
          <Button
            variant={filters.movementType === 'IN' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              if (filters.movementType === 'IN') {
                setFilters({ ...filters, movementType: undefined });
              } else {
                setFilters({ ...filters, movementType: 'IN' });
              }
            }}
            className="gap-2"
          >
            <ArrowDownCircle className="h-4 w-4" />
            {t('movements.filter.entriesOnly')}
          </Button>
          <Button
            variant={filters.movementType === 'OUT' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              if (filters.movementType === 'OUT') {
                setFilters({ ...filters, movementType: undefined });
              } else {
                setFilters({ ...filters, movementType: 'OUT' });
              }
            }}
            className="gap-2"
          >
            <ArrowUpCircle className="h-4 w-4" />
            {t('movements.filter.exitsOnly')}
          </Button>
        </div>

        <MovementFilters filters={filters} onFiltersChange={setFilters} />

        {/* Botón de ordenación */}
        <MovementSortButton
          orderBy={orderBy}
          orderDirection={orderDirection}
          onOrderChange={(newOrderBy, newOrderDirection) => {
            setOrderBy(newOrderBy);
            setOrderDirection(newOrderDirection);
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Estadísticas */}
      {movements.length > 0 && <MovementStatsCards movements={movements} />}

      {/* Tabla */}
      <MovementTable
        movements={movements}
        loading={loading}
        onViewProduct={handleViewProduct}
        onViewDetail={handleViewDetail}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('pagination.showing')} {(page - 1) * 20 + 1}-
            {Math.min(page * 20, totalCount)} {t('pagination.of')} {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              {t('pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              {t('pagination.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedMovement(null);
          }}
        />
      )}

      {/* Modales de creación de movimientos */}
      <MovementForm
        isOpen={isEntryOpen}
        onClose={() => {
          setIsEntryOpen(false);
        }}
        onSubmit={handleCreateMovement}
        products={products}
        preselectedMovementType="IN"
      />

      <MovementForm
        isOpen={isExitOpen}
        onClose={() => {
          setIsExitOpen(false);
        }}
        onSubmit={handleCreateMovement}
        products={products}
        preselectedMovementType="OUT"
      />

      <MovementForm
        isOpen={isAdjustmentOpen}
        onClose={() => {
          setIsAdjustmentOpen(false);
        }}
        onSubmit={handleCreateMovement}
        products={products}
        preselectedMovementType="ADJUSTMENT"
      />
    </div>
  );
}
