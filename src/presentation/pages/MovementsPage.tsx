import { RefreshCw, Download } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { Button } from "../components/ui/Button";
import { SearchInput } from "../components/ui/SearchInput";
import { MovementTable } from "../components/movements/MovementTable";
import { MovementFilters } from "../components/movements/MovementFilters";
import { MovementSortButton } from "../components/movements/MovementSortButton";
import { MovementDetailModal } from "../components/movements/MovementDetailModal";
import { useLanguage } from "../context/LanguageContext";
import { useMovements } from "../hooks/useMovements";

/**
 * Página principal de movimientos de inventario.
 */
export function MovementsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedMovement, setSelectedMovement] = React.useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [orderBy, setOrderBy] = React.useState<"date" | "product">("date");
  const [orderDirection, setOrderDirection] = React.useState<"asc" | "desc">("desc");

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
    refresh
  } = useMovements();

  // Búsqueda con debounce
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters({
        ...filters,
        search: searchTerm.trim() || undefined
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Actualizar ordenación cuando cambia
  React.useEffect(() => {
    setFilters({
      ...filters,
      orderBy,
      orderDirection
    });
  }, [orderBy, orderDirection]);

  const handleViewProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleViewDetail = (movement: any) => {
    setSelectedMovement(movement);
    setIsDetailOpen(true);
  };

  const handleExportExcel = () => {
    // Preparar datos
    const excelData = movements.map((movement) => {
      const date = new Date(movement.movementDate);
      const userName = movement.userFirstName || movement.userLastName
        ? `${movement.userFirstName || ""} ${movement.userLastName || ""}`.trim()
        : "";

      return {
        "Fecha": date.toLocaleDateString("es-ES"),
        "Hora": date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        "Tipo": movement.movementType === "IN" ? "Stock in" : 
                movement.movementType === "OUT" ? "Stock out" :
                movement.movementType === "TRANSFER" ? "Ubicación" :
                movement.movementType === "ADJUSTMENT" && movement.comments?.includes("Código:")
                  ? "Código"
                  : movement.movementType === "ADJUSTMENT" && movement.comments?.includes("Nombre:")
                    ? "Nombre"
                    : movement.movementType === "ADJUSTMENT" && movement.comments?.includes("Descripción:")
                      ? "Descripción"
                      : t(`movements.type.${movement.movementType}`),
        "Producto": movement.product?.name || movement.productName || "",
        "Código Producto": movement.product?.code || movement.productCode || "",
        "Cantidad": movement.quantity,
        "Stock Antes": movement.quantityBefore,
        "Stock Después": movement.quantityAfter,
        "Motivo": movement.requestReason,
        "Categoría": movement.reasonCategory ? t(`movements.category.${movement.reasonCategory}`) : "",
        "Comentarios": movement.comments || "",
        "Usuario": userName,
        "Documento Referencia": movement.referenceDocument || "",
        "Ubicación Origen": movement.sourceLocation || "",
        "Ubicación Destino": movement.destinationLocation || ""
      };
    });

    // Crear worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    
    // Ajustar anchos de columna
    const colWidths = [
      { wch: 12 }, // Fecha
      { wch: 8 },  // Hora
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
      { wch: 20 }  // Destino
    ];
    worksheet["!cols"] = colWidths;

    // Nota: xlsx básico no soporta estilos directamente
    // Los estilos se aplicarán cuando Excel abra el archivo
    // Mejoramos el formato con anchos de columna y estructura clara

    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movimientos_${new Date().toISOString().split("T")[0]}.xlsx`;
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
            {t("movements.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {totalCount} {t("movements.total")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t("common.refresh")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2"
            disabled={movements.length === 0}
          >
            <Download className="h-4 w-4" />
            {t("common.export")}
          </Button>
        </div>
      </div>

      {/* Búsqueda, Filtros y Ordenación */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            placeholder={t("movements.searchPlaceholder")}
            value={searchTerm}
            onChange={(value) => setSearchTerm(value)}
          />
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
            {t("pagination.showing")} {(page - 1) * 20 + 1}-
            {Math.min(page * 20, totalCount)} {t("pagination.of")} {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              {t("pagination.next")}
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
    </div>
  );
}

