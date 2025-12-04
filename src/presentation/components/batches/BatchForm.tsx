import { motion, AnimatePresence } from "framer-motion";
import { Boxes, Package, QrCode, Calendar, AlertCircle, CheckCircle2, Wand2, Scan } from "lucide-react";
import * as React from "react";
import type { CreateBatchInput, UpdateBatchInput } from "@domain/repositories/ProductRepository";
import type { ProductBatch, Product } from "@domain/entities";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";
import { useAuth } from "../../context/AuthContext";
import { ProductSelector } from "./ProductSelector";
import { useBatches } from "../../hooks/useBatches";

interface BatchFormProps {
  batch?: ProductBatch;
  onSubmit: (data: CreateBatchInput | UpdateBatchInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  onProductSelect?: (productId: string) => void;
  onCreateProduct?: () => void;
}

/**
 * Formulario para crear o editar lotes.
 */
export function BatchForm({ 
  batch, 
  onSubmit, 
  onCancel, 
  loading = false,
  onProductSelect,
  onCreateProduct
}: BatchFormProps) {
  const { t } = useLanguage();
  const { authContext } = useAuth();
  const { batchCodeExists } = useBatches();
  const isEditing = !!batch;
  const [checkingCode, setCheckingCode] = React.useState(false);
  
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(new Set());
  const [selectedProductId, setSelectedProductId] = React.useState<string>(batch?.productId || "");
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  
  const [formData, setFormData] = React.useState({
    batchCode: batch?.batchCode || "",
    batchBarcode: batch?.batchBarcode || "",
    quantityTotal: batch?.quantityTotal || 0,
    quantityAvailable: batch?.quantityAvailable || batch?.quantityTotal || 0,
    defectiveQty: batch?.defectiveQty || 0,
    receivedAt: batch?.receivedAt ? new Date(batch.receivedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    expiryDate: batch?.expiryDate ? new Date(batch.expiryDate).toISOString().split("T")[0] : "",
    manufactureDate: batch?.manufactureDate ? new Date(batch.manufactureDate).toISOString().split("T")[0] : "",
    costPerUnit: batch?.costPerUnit || "",
    notes: batch?.notes || ""
  });

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!selectedProductId && !isEditing) {
      newErrors.productId = t("batches.form.productRequired") || "Debes seleccionar un producto";
    }

    const batchCode = formData.batchCode.trim().toUpperCase();
    if (!batchCode) {
      newErrors.batchCode = t("batches.form.batchCodeRequired") || "El código de lote es obligatorio";
    } else {
      // Validar formato L-XXXXX
      const formatRegex = /^L-\d{5}$/;
      if (!formatRegex.test(batchCode)) {
        newErrors.batchCode = t("batches.form.batchCodeFormat") || "El código debe seguir el formato L-XXXXX (ej: L-00001)";
      } else if (!isEditing) {
        // Verificar duplicados solo al crear
        setCheckingCode(true);
        const exists = await batchCodeExists(batchCode);
        setCheckingCode(false);
        if (exists) {
          newErrors.batchCode = t("batches.form.batchCodeExists") || "Este código de lote ya existe";
        }
      }
    }

    if (formData.quantityTotal <= 0) {
      newErrors.quantityTotal = t("batches.form.quantityRequired") || "La cantidad debe ser mayor a 0";
    }

    if (formData.quantityAvailable > formData.quantityTotal) {
      newErrors.quantityAvailable = t("batches.form.quantityAvailableInvalid") || "La cantidad disponible no puede ser mayor a la total";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar todos los campos como tocados
    setTouchedFields(new Set(Object.keys(formData).concat(selectedProductId ? [] : ["productId"])));

    if (!(await validate())) {
      return;
    }

    if (!authContext?.profile?.id) {
      setErrors({ submit: t("batches.form.userRequired") || "Usuario no autenticado" });
      return;
    }

    const submitData: CreateBatchInput | UpdateBatchInput = {
      ...(isEditing ? {} : { productId: selectedProductId, createdBy: authContext.profile.id }),
      batchCode: formData.batchCode.trim(),
      batchBarcode: formData.batchBarcode.trim() || null,
      quantityTotal: Number(formData.quantityTotal),
      quantityAvailable: Number(formData.quantityAvailable),
      defectiveQty: Number(formData.defectiveQty) || 0,
      receivedAt: new Date(formData.receivedAt).toISOString(),
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString().split("T")[0] : null,
      manufactureDate: formData.manufactureDate ? new Date(formData.manufactureDate).toISOString().split("T")[0] : null,
      costPerUnit: formData.costPerUnit ? Number(formData.costPerUnit) : null,
      notes: formData.notes.trim() || null
    };

    await onSubmit(submitData);
  };

  const handleChange = (field: string, value: string | number) => {
    // Si es batchCode, convertir a mayúsculas y aplicar formato
    if (field === "batchCode" && typeof value === "string") {
      let formatted = value.toUpperCase().replace(/[^L0-9-]/g, "");
      // Asegurar formato L-XXXXX
      if (formatted.startsWith("L") && !formatted.includes("-")) {
        if (formatted.length > 1) {
          formatted = `L-${formatted.slice(1)}`;
        }
      }
      // Limitar a 7 caracteres (L-XXXXX)
      if (formatted.length > 7) {
        formatted = formatted.slice(0, 7);
      }
      value = formatted;
    }
    
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouchedFields((prev) => new Set(prev).add(field));
    validate();
  };

  const generateQR = () => {
    // Generar código QR único basado en timestamp y código de lote
    const timestamp = Date.now().toString(36).toUpperCase();
    const code = formData.batchCode.replace(/\s/g, "").toUpperCase();
    const qrCode = `LOT-${code}-${timestamp}`;
    handleChange("batchBarcode", qrCode);
  };

  const generateBatchCode = async () => {
    // Generar código único L-XXXXX
    let attempt = 1;
    let newCode = `L-${String(attempt).padStart(5, "0")}`;
    
    while (await batchCodeExists(newCode)) {
      attempt++;
      newCode = `L-${String(attempt).padStart(5, "0")}`;
      // Limitar intentos para evitar bucle infinito
      if (attempt > 99999) {
        // Si llegamos al límite, usar timestamp
        const timestamp = Date.now().toString().slice(-5);
        newCode = `L-${timestamp}`;
        break;
      }
    }
    
    handleChange("batchCode", newCode);
  };

  const handleScanQR = async () => {
    // Simular escaneo de QR (en producción se usaría la cámara)
    const scannedCode = prompt(t("batches.form.scanQRCode") || "Escanea o introduce el código QR del lote:");
    if (scannedCode) {
      handleChange("batchBarcode", scannedCode.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selección de Producto */}
      {!isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t("batches.form.selectProduct") || "Seleccionar Producto"}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="productId" className="mb-2">
                {t("batches.form.product") || "Producto"} *
              </Label>
              <ProductSelector
                value={selectedProductId}
                onChange={(productId) => {
                  setSelectedProductId(productId);
                  if (onProductSelect) onProductSelect(productId);
                  if (errors.productId) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.productId;
                      return newErrors;
                    });
                  }
                }}
                onProductSelect={(product) => {
                  setSelectedProduct(product);
                }}
                placeholder={t("batches.form.searchProduct") || "Buscar producto por código, nombre o barcode..."}
                filterActive={true}
                filterBatchTracked={false}
                className={cn(
                  errors.productId && touchedFields.has("productId") && "border-red-500"
                )}
              />
              {errors.productId && touchedFields.has("productId") && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.productId}
                </p>
              )}
            </div>

            {onCreateProduct && (
              <Button
                type="button"
                variant="outline"
                onClick={onCreateProduct}
                className="w-full"
              >
                <Package className="mr-2 h-4 w-4" />
                {t("batches.form.createNewProduct") || "Crear Producto Nuevo"}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Información del Lote */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <Boxes className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("batches.form.batchInfo") || "Información del Lote"}
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="batchCode" className="mb-2">
              {t("batches.form.batchCode") || "Código de Lote"} *
            </Label>
            <div className="flex gap-2">
              <Input
                id="batchCode"
                value={formData.batchCode}
                onChange={(e) => handleChange("batchCode", e.target.value)}
                onBlur={() => handleBlur("batchCode")}
                placeholder="L-00001"
                className={cn(
                  "flex-1",
                  errors.batchCode && touchedFields.has("batchCode") && "border-red-500"
                )}
                required
                disabled={checkingCode}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateBatchCode}
                className="gap-2"
                title={t("batches.form.generateCode") || "Generar código automático"}
                disabled={checkingCode || isEditing}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
            {errors.batchCode && touchedFields.has("batchCode") && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.batchCode}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("batches.form.batchCodeHint") || "Formato: L-XXXXX (ej: L-00001)"}
            </p>
          </div>

          <div>
            <Label htmlFor="batchBarcode" className="mb-2">
              {t("batches.form.batchBarcode") || "Código QR/Barcode"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="batchBarcode"
                value={formData.batchBarcode}
                onChange={(e) => handleChange("batchBarcode", e.target.value)}
                placeholder={t("batches.form.scanOrGenerate") || "Escanear o generar"}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleScanQR}
                className="gap-2"
                title={t("batches.form.scanQR") || "Escanear QR"}
              >
                <Scan className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={generateQR}
                className="gap-2"
                title={t("batches.form.generateQR") || "Generar QR"}
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("batches.form.barcodeHint") || "Escanea el código del proveedor o genera uno nuevo"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Cantidades */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <Package className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("batches.form.quantities") || "Cantidades"}
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="quantityTotal" className="mb-2">
              {t("batches.form.quantityTotal") || "Cantidad Total"} *
            </Label>
            <Input
              id="quantityTotal"
              type="number"
              min="1"
              value={formData.quantityTotal}
              onChange={(e) => {
                const value = Number(e.target.value);
                handleChange("quantityTotal", value);
                if (!isEditing) {
                  handleChange("quantityAvailable", value);
                }
              }}
              onBlur={() => handleBlur("quantityTotal")}
              className={cn(
                errors.quantityTotal && touchedFields.has("quantityTotal") && "border-red-500"
              )}
              required
            />
            {errors.quantityTotal && touchedFields.has("quantityTotal") && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.quantityTotal}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="quantityAvailable" className="mb-2">
              {t("batches.form.quantityAvailable") || "Cantidad Disponible"} *
            </Label>
            <Input
              id="quantityAvailable"
              type="number"
              min="0"
              max={formData.quantityTotal}
              value={formData.quantityAvailable}
              onChange={(e) => handleChange("quantityAvailable", Number(e.target.value))}
              onBlur={() => handleBlur("quantityAvailable")}
              className={cn(
                errors.quantityAvailable && touchedFields.has("quantityAvailable") && "border-red-500"
              )}
              required
            />
            {errors.quantityAvailable && touchedFields.has("quantityAvailable") && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.quantityAvailable}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="defectiveQty" className="mb-2">
              {t("batches.form.defectiveQty") || "Cantidad Defectuosa"}
            </Label>
            <Input
              id="defectiveQty"
              type="number"
              min="0"
              value={formData.defectiveQty}
              onChange={(e) => handleChange("defectiveQty", Number(e.target.value))}
            />
          </div>
        </div>
      </motion.div>

      {/* Fechas y Costos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("batches.form.datesAndCosts") || "Fechas y Costos"}
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="receivedAt" className="mb-2">
              {t("batches.form.receivedAt") || "Fecha de Recepción"} *
            </Label>
            <Input
              id="receivedAt"
              type="date"
              value={formData.receivedAt}
              onChange={(e) => handleChange("receivedAt", e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="expiryDate" className="mb-2">
              {t("batches.form.expiryDate") || "Fecha de Caducidad"}
            </Label>
            <Input
              id="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => handleChange("expiryDate", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="manufactureDate" className="mb-2">
              {t("batches.form.manufactureDate") || "Fecha de Fabricación"}
            </Label>
            <Input
              id="manufactureDate"
              type="date"
              value={formData.manufactureDate}
              onChange={(e) => handleChange("manufactureDate", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="costPerUnit" className="mb-2">
              {t("batches.form.costPerUnit") || "Costo por Unidad"}
            </Label>
            <Input
              id="costPerUnit"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPerUnit}
              onChange={(e) => handleChange("costPerUnit", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </motion.div>

      {/* Notas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <Label htmlFor="notes" className="mb-2">
          {t("batches.form.notes") || "Notas"}
        </Label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
          placeholder={t("batches.form.notesPlaceholder") || "Notas adicionales sobre el lote..."}
        />
      </motion.div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={loading}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={loading}
        >
          {loading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              />
              {t("common.saving") || "Guardando..."}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isEditing ? (t("common.save") || "Guardar") : (t("common.create") || "Crear")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

