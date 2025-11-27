import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Box, MapPin, DollarSign, Info, Settings, CheckCircle2, AlertCircle } from "lucide-react";
import * as React from "react";
import type { CreateProductInput, UpdateProductInput } from "@domain/repositories/ProductRepository";
import type { Product } from "@domain/entities";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { cn } from "../../lib/cn";

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: CreateProductInput | UpdateProductInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Formulario moderno e interactivo para crear o editar productos.
 */
export function ProductForm({ product, onSubmit, onCancel, loading = false }: ProductFormProps) {
  const isEditing = !!product;
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(new Set());
  const [formData, setFormData] = React.useState({
    code: product?.code ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "",
    stockCurrent: product?.stockCurrent ?? 0,
    stockMin: product?.stockMin ?? 0,
    stockMax: product?.stockMax ?? "",
    aisle: product?.aisle ?? "",
    shelf: product?.shelf ?? "",
    locationExtra: product?.locationExtra ?? "",
    costPrice: product?.costPrice ?? 0,
    salePrice: product?.salePrice ?? "",
    purchaseUrl: product?.purchaseUrl ?? "",
    imageUrl: product?.imageUrl ?? "",
    supplierCode: product?.supplierCode ?? "",
    isActive: product?.isActive ?? true,
    isBatchTracked: product?.isBatchTracked ?? false,
    unitOfMeasure: product?.unitOfMeasure ?? "unidad",
    weightKg: product?.weightKg ?? "",
    dimensionsLength: product?.dimensionsCm?.length ?? "",
    dimensionsWidth: product?.dimensionsCm?.width ?? "",
    dimensionsHeight: product?.dimensionsCm?.height ?? "",
    notes: product?.notes ?? ""
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = "El código es requerido";
    } else if (formData.code.trim().length < 3) {
      newErrors.code = "El código debe tener al menos 3 caracteres";
    } else if (/\s/.test(formData.code)) {
      newErrors.code = "El código no puede contener espacios";
    }

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    }

    const stockMin = Number(formData.stockMin);
    if (isNaN(stockMin) || stockMin < 0) {
      newErrors.stockMin = "El stock mínimo debe ser un número >= 0";
    }

    const stockCurrent = Number(formData.stockCurrent);
    if (isNaN(stockCurrent) || stockCurrent < 0) {
      newErrors.stockCurrent = "El stock actual debe ser un número >= 0";
    }

    if (formData.stockMax !== "" && formData.stockMax !== null) {
      const stockMax = Number(formData.stockMax);
      if (isNaN(stockMax) || stockMax <= stockMin) {
        newErrors.stockMax = `El stock máximo debe ser mayor que el mínimo (${stockMin})`;
      }
    }

    if (!formData.aisle.trim()) {
      newErrors.aisle = "El pasillo es requerido";
    }
    if (!formData.shelf.trim()) {
      newErrors.shelf = "El estante es requerido";
    }

    const costPrice = Number(formData.costPrice);
    if (isNaN(costPrice) || costPrice < 0) {
      newErrors.costPrice = "El precio de coste debe ser un número >= 0";
    }

    if (formData.salePrice !== "" && formData.salePrice !== null) {
      const salePrice = Number(formData.salePrice);
      if (isNaN(salePrice) || salePrice < costPrice) {
        newErrors.salePrice = `El precio de venta debe ser >= precio de coste (${costPrice})`;
      }
    }

    if (formData.dimensionsLength !== "" || formData.dimensionsWidth !== "" || formData.dimensionsHeight !== "") {
      const length = formData.dimensionsLength ? Number(formData.dimensionsLength) : 0;
      const width = formData.dimensionsWidth ? Number(formData.dimensionsWidth) : 0;
      const height = formData.dimensionsHeight ? Number(formData.dimensionsHeight) : 0;

      if (length < 0 || width < 0 || height < 0) {
        newErrors.dimensions = "Las dimensiones deben ser números positivos";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const dimensionsCm =
      formData.dimensionsLength || formData.dimensionsWidth || formData.dimensionsHeight
        ? {
            length: Number(formData.dimensionsLength) || 0,
            width: Number(formData.dimensionsWidth) || 0,
            height: Number(formData.dimensionsHeight) || 0
          }
        : null;

    const submitData: CreateProductInput | UpdateProductInput = {
      code: formData.code.trim(),
      barcode: formData.barcode.trim() || null,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      category: formData.category.trim() || null,
      stockCurrent: Number(formData.stockCurrent),
      stockMin: Number(formData.stockMin),
      stockMax: formData.stockMax !== "" && formData.stockMax !== null ? Number(formData.stockMax) : null,
      aisle: formData.aisle.trim(),
      shelf: formData.shelf.trim(),
      locationExtra: formData.locationExtra.trim() || null,
      costPrice: Number(formData.costPrice),
      salePrice: formData.salePrice !== "" && formData.salePrice !== null ? Number(formData.salePrice) : null,
      purchaseUrl: formData.purchaseUrl.trim() || null,
      imageUrl: formData.imageUrl.trim() || null,
      supplierCode: formData.supplierCode.trim() || null,
      isActive: formData.isActive,
      isBatchTracked: formData.isBatchTracked,
      unitOfMeasure: formData.unitOfMeasure || null,
      weightKg: formData.weightKg !== "" && formData.weightKg !== null ? Number(formData.weightKg) : null,
      dimensionsCm,
      notes: formData.notes.trim() || null
    };

    await onSubmit(submitData);
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouchedFields((prev) => new Set(prev).add(field));
    
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

  const FieldWrapper = ({ 
    children, 
    error, 
    touched,
    className 
  }: { 
    children: React.ReactNode; 
    error?: string; 
    touched?: boolean;
    className?: string;
  }) => (
    <div className={cn("space-y-1.5", className)}>
      {children}
      <AnimatePresence>
        {error && touched && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  const SectionCard = ({ 
    icon: Icon, 
    title, 
    children, 
    delay = 0 
  }: { 
    icon: React.ElementType; 
    title: string; 
    children: React.ReactNode;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
    >
      {/* Efecto de brillo en hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/0 opacity-0 transition-opacity duration-500 group-hover:from-blue-500/5 group-hover:via-transparent group-hover:to-blue-500/5 group-hover:opacity-100" />
      
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors duration-300 group-hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/50">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
        </div>
        {children}
      </div>
    </motion.div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.form
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Información Básica */}
      <SectionCard icon={Package} title="Información Básica" delay={0}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrapper error={errors.code} touched={touchedFields.has("code")}>
              <Label htmlFor="code" className="flex items-center gap-1.5">
                Código <span className="text-red-500">*</span>
                {!errors.code && touchedFields.has("code") && formData.code && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                )}
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                onBlur={() => handleBlur("code")}
                disabled={isEditing}
                className={cn(
                  "transition-all duration-200",
                  errors.code && touchedFields.has("code")
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : touchedFields.has("code") && !errors.code && formData.code
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                    : "focus:border-blue-500 focus:ring-blue-500"
                )}
              />
            </FieldWrapper>

            <FieldWrapper error={errors.barcode} touched={touchedFields.has("barcode")}>
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleChange("barcode", e.target.value)}
                onBlur={() => handleBlur("barcode")}
                className="transition-all duration-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper error={errors.name} touched={touchedFields.has("name")}>
            <Label htmlFor="name" className="flex items-center gap-1.5">
              Nombre <span className="text-red-500">*</span>
              {!errors.name && touchedFields.has("name") && formData.name && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              )}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              className={cn(
                "transition-all duration-200",
                errors.name && touchedFields.has("name")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : touchedFields.has("name") && !errors.name && formData.name
                  ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                  : "focus:border-primary-500 focus:ring-primary-500"
              )}
            />
          </FieldWrapper>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <div>
            <Label htmlFor="category">Categoría</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className="transition-all duration-200 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      </SectionCard>

      {/* Stock */}
      <SectionCard icon={Box} title="Stock" delay={0.1}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper error={errors.stockCurrent} touched={touchedFields.has("stockCurrent")}>
            <Label htmlFor="stockCurrent">Stock Actual</Label>
            <Input
              id="stockCurrent"
              type="number"
              min="0"
              value={formData.stockCurrent}
              onChange={(e) => handleChange("stockCurrent", e.target.value)}
              onBlur={() => handleBlur("stockCurrent")}
              className={cn(
                "transition-all duration-200",
                errors.stockCurrent && touchedFields.has("stockCurrent")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "focus:border-primary-500 focus:ring-primary-500"
              )}
            />
          </FieldWrapper>

          <FieldWrapper error={errors.stockMin} touched={touchedFields.has("stockMin")}>
            <Label htmlFor="stockMin">
              Stock Mínimo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stockMin"
              type="number"
              min="0"
              value={formData.stockMin}
              onChange={(e) => handleChange("stockMin", e.target.value)}
              onBlur={() => handleBlur("stockMin")}
              className={cn(
                "transition-all duration-200",
                errors.stockMin && touchedFields.has("stockMin")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "focus:border-primary-500 focus:ring-primary-500"
              )}
            />
          </FieldWrapper>

          <FieldWrapper error={errors.stockMax} touched={touchedFields.has("stockMax")}>
            <Label htmlFor="stockMax">Stock Máximo</Label>
            <Input
              id="stockMax"
              type="number"
              min="0"
              value={formData.stockMax}
              onChange={(e) => handleChange("stockMax", e.target.value)}
              onBlur={() => handleBlur("stockMax")}
              className={cn(
                "transition-all duration-200",
                errors.stockMax && touchedFields.has("stockMax")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "focus:border-primary-500 focus:ring-primary-500"
              )}
            />
          </FieldWrapper>
        </div>
      </SectionCard>

      {/* Ubicación */}
      <SectionCard icon={MapPin} title="Ubicación" delay={0.2}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper error={errors.aisle} touched={touchedFields.has("aisle")}>
            <Label htmlFor="aisle">
              Pasillo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="aisle"
              value={formData.aisle}
              onChange={(e) => handleChange("aisle", e.target.value)}
              onBlur={() => handleBlur("aisle")}
              className={cn(
                "transition-all duration-200",
                errors.aisle && touchedFields.has("aisle")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "focus:border-primary-500 focus:ring-primary-500"
              )}
            />
          </FieldWrapper>

          <FieldWrapper error={errors.shelf} touched={touchedFields.has("shelf")}>
            <Label htmlFor="shelf">
              Estante <span className="text-red-500">*</span>
            </Label>
            <Input
              id="shelf"
              value={formData.shelf}
              onChange={(e) => handleChange("shelf", e.target.value)}
              onBlur={() => handleBlur("shelf")}
              className={cn(
                "transition-all duration-200",
                errors.shelf && touchedFields.has("shelf")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "focus:border-primary-500 focus:ring-primary-500"
              )}
            />
          </FieldWrapper>

          <div>
            <Label htmlFor="locationExtra">Ubicación Extra</Label>
            <Input
              id="locationExtra"
              value={formData.locationExtra}
              onChange={(e) => handleChange("locationExtra", e.target.value)}
              className="transition-all duration-200 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      </SectionCard>

      {/* Precios */}
      <SectionCard icon={DollarSign} title="Precios" delay={0.3}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper error={errors.costPrice} touched={touchedFields.has("costPrice")}>
            <Label htmlFor="costPrice">
              Precio de Coste <span className="text-red-500">*</span>
            </Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPrice}
              onChange={(e) => handleChange("costPrice", e.target.value)}
              onBlur={() => handleBlur("costPrice")}
              className={cn(
                "transition-all duration-200",
                errors.costPrice && touchedFields.has("costPrice")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "focus:border-primary-500 focus:ring-primary-500"
              )}
            />
          </FieldWrapper>

          <FieldWrapper error={errors.salePrice} touched={touchedFields.has("salePrice")}>
            <Label htmlFor="salePrice">Precio de Venta</Label>
            <Input
              id="salePrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.salePrice}
              onChange={(e) => handleChange("salePrice", e.target.value)}
              onBlur={() => handleBlur("salePrice")}
              className={cn(
                "transition-all duration-200",
                errors.salePrice && touchedFields.has("salePrice")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "focus:border-primary-500 focus:ring-primary-500"
              )}
            />
          </FieldWrapper>
        </div>
      </SectionCard>

      {/* Información Adicional */}
      <SectionCard icon={Info} title="Información Adicional" delay={0.4}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="supplierCode">Código de Proveedor</Label>
              <Input
                id="supplierCode"
                value={formData.supplierCode}
                onChange={(e) => handleChange("supplierCode", e.target.value)}
                className="transition-all duration-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="unitOfMeasure">Unidad de Medida</Label>
              <Input
                id="unitOfMeasure"
                value={formData.unitOfMeasure}
                onChange={(e) => handleChange("unitOfMeasure", e.target.value)}
                placeholder="unidad"
                className="transition-all duration-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="purchaseUrl">URL de Compra</Label>
            <Input
              id="purchaseUrl"
              type="url"
              value={formData.purchaseUrl}
              onChange={(e) => handleChange("purchaseUrl", e.target.value)}
              placeholder="https://..."
              className="transition-all duration-200 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <div>
            <Label htmlFor="imageUrl">URL de Imagen</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => handleChange("imageUrl", e.target.value)}
              placeholder="https://..."
              className="transition-all duration-200 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <div>
            <Label htmlFor="weightKg">Peso (kg)</Label>
            <Input
              id="weightKg"
              type="number"
              step="0.001"
              min="0"
              value={formData.weightKg}
              onChange={(e) => handleChange("weightKg", e.target.value)}
              className="transition-all duration-200 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <FieldWrapper error={errors.dimensions} touched={touchedFields.has("dimensions")}>
            <Label>Dimensiones (cm)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Largo"
                type="number"
                step="0.1"
                min="0"
                value={formData.dimensionsLength}
                onChange={(e) => handleChange("dimensionsLength", e.target.value)}
                onBlur={() => handleBlur("dimensions")}
                className={cn(
                  "transition-all duration-200",
                  errors.dimensions && touchedFields.has("dimensions")
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "focus:border-blue-500 focus:ring-blue-500"
                )}
              />
              <Input
                placeholder="Ancho"
                type="number"
                step="0.1"
                min="0"
                value={formData.dimensionsWidth}
                onChange={(e) => handleChange("dimensionsWidth", e.target.value)}
                onBlur={() => handleBlur("dimensions")}
                className={cn(
                  "transition-all duration-200",
                  errors.dimensions && touchedFields.has("dimensions")
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "focus:border-blue-500 focus:ring-blue-500"
                )}
              />
              <Input
                placeholder="Alto"
                type="number"
                step="0.1"
                min="0"
                value={formData.dimensionsHeight}
                onChange={(e) => handleChange("dimensionsHeight", e.target.value)}
                onBlur={() => handleBlur("dimensions")}
                className={cn(
                  "transition-all duration-200",
                  errors.dimensions && touchedFields.has("dimensions")
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "focus:border-blue-500 focus:ring-blue-500"
                )}
              />
            </div>
          </FieldWrapper>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
        </div>
      </SectionCard>

      {/* Opciones */}
      <SectionCard icon={Settings} title="Opciones" delay={0.5}>
        <div className="space-y-3">
          <motion.label
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
          >
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Producto activo</span>
          </motion.label>

          <motion.label
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
          >
            <input
              type="checkbox"
              checked={formData.isBatchTracked}
              onChange={(e) => handleChange("isBatchTracked", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Control por lotes</span>
          </motion.label>
        </div>
      </SectionCard>

      {/* Botones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-700"
      >
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="transition-all duration-200 hover:scale-105"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button type="submit" disabled={loading} className="min-w-[140px] transition-all duration-200">
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                />
                Guardando...
              </>
            ) : (
              isEditing ? "Actualizar" : "Crear Producto"
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
