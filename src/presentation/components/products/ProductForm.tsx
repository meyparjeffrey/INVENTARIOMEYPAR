import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Box,
  MapPin,
  Coins,
  Info,
  Settings,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import * as React from 'react';
import type {
  CreateProductInput,
  UpdateProductInput,
} from '@domain/repositories/ProductRepository';
import type { Product } from '@domain/entities';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { cn } from '../../lib/cn';
import { useBatches } from '../../hooks/useBatches';

// Componentes memoizados fuera del componente principal para evitar re-renders
const FieldWrapper = React.memo(
  ({
    children,
    error,
    touched,
    className,
  }: {
    children: React.ReactNode;
    error?: string;
    touched?: boolean;
    className?: string;
  }) => (
    <div className={cn('space-y-1.5', className)}>
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
  ),
);
FieldWrapper.displayName = 'FieldWrapper';

const SectionCard = React.memo(
  ({
    icon: Icon,
    title,
    children,
    delay = 0,
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </motion.div>
  ),
);
SectionCard.displayName = 'SectionCard';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: CreateProductInput | UpdateProductInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  canEditCode?: boolean; // Solo ADMIN puede editar código en modo edición
}

/**
 * Formulario moderno e interactivo para crear o editar productos.
 *
 * Incluye validación en tiempo real, animaciones, y soporte para productos con lotes.
 * El formulario se divide en secciones: Información básica, Stock, Ubicación, Precios, etc.
 *
 * @component
 * @param {ProductFormProps} props - Propiedades del componente
 * @param {Product} [props.product] - Producto a editar (si no se proporciona, se crea uno nuevo)
 * @param {Function} props.onSubmit - Callback al enviar el formulario con los datos validados
 * @param {Function} props.onCancel - Callback al cancelar la edición
 * @param {boolean} [props.loading=false] - Estado de carga durante el envío
 * @example
 * <ProductForm
 *   product={existingProduct}
 *   onSubmit={async (data) => await updateProduct(product.id, data)}
 *   onCancel={() => navigate('/products')}
 *   loading={isUpdating}
 * />
 */
export function ProductForm({
  product,
  onSubmit,
  onCancel,
  loading = false,
  canEditCode = false,
}: ProductFormProps) {
  const { t } = useLanguage();
  const { batchCodeExists } = useBatches();
  const isEditing = !!product;
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(new Set());
  const [checkingCode, setCheckingCode] = React.useState(false);
  // Determinar warehouse inicial basado en el producto existente
  const getInitialWarehouse = (): 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA' => {
    if (!product) return 'MEYPAR'; // Por defecto MEYPAR para productos nuevos

    // Si tiene warehouse definido, usarlo
    if (product.warehouse) {
      return product.warehouse;
    }

    // Si locationExtra contiene "Oliva Torras", es OLIVA_TORRAS
    if (product.locationExtra?.includes('Oliva Torras')) {
      return 'OLIVA_TORRAS';
    }

    // Si locationExtra contiene "Furgoneta", es FURGONETA
    if (product.locationExtra?.includes('Furgoneta')) {
      return 'FURGONETA';
    }

    // Por defecto MEYPAR
    return 'MEYPAR';
  };

  // Extraer nombre del técnico de locationExtra si es furgoneta
  const getFurgonetaName = (): string => {
    if (product?.warehouse === 'FURGONETA' && product.locationExtra) {
      const match = product.locationExtra.match(/Furgoneta\s+(.+)/);
      return match ? match[1] : '';
    }
    return '';
  };

  const [formData, setFormData] = React.useState({
    code: product?.code ?? '',
    barcode: product?.barcode ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? '',
    stockCurrent: product?.stockCurrent ?? 0,
    stockMin: product?.stockMin ?? 0,
    stockMax: product?.stockMax ?? '',
    warehouse: getInitialWarehouse(),
    estanteria: product?.warehouse === 'MEYPAR' ? product.aisle || '1' : '1',
    estante: product?.warehouse === 'MEYPAR' ? product.shelf || 'A' : 'A',
    furgonetaName: getFurgonetaName(),
    aisle: product?.aisle ?? '',
    shelf: product?.shelf ?? '',
    locationExtra: product?.locationExtra ?? '',
    costPrice: product?.costPrice ?? 0,
    salePrice: product?.salePrice ?? '',
    purchaseUrl: product?.purchaseUrl ?? '',
    imageUrl: product?.imageUrl ?? '',
    supplierCode: product?.supplierCode ?? '',
    batchCode: '', // Campo para código de lote
    isActive: product?.isActive ?? true,
    unitOfMeasure: product?.unitOfMeasure ?? 'unidad',
    weightKg: product?.weightKg ?? '',
    dimensionsLength: product?.dimensionsCm?.length ?? '',
    dimensionsWidth: product?.dimensionsCm?.width ?? '',
    dimensionsHeight: product?.dimensionsCm?.height ?? '',
    notes: product?.notes ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar y obtener errores
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = t('validation.code.required');
    } else if (formData.code.trim().length < 3) {
      newErrors.code = t('validation.code.minLength');
    } else if (/\s/.test(formData.code)) {
      newErrors.code = t('validation.code.noSpaces');
    }

    if (!formData.name.trim()) {
      newErrors.name = t('validation.name.required');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t('validation.name.minLength');
    }

    const stockMin = Number(formData.stockMin);
    if (isNaN(stockMin) || stockMin < 0) {
      newErrors.stockMin = t('validation.stockMin.invalid');
    }

    const stockCurrent = Number(formData.stockCurrent);
    if (isNaN(stockCurrent) || stockCurrent < 0) {
      newErrors.stockCurrent = t('validation.stockCurrent.invalid');
    }

    if (formData.stockMax !== '' && formData.stockMax !== null) {
      const stockMax = Number(formData.stockMax);
      if (isNaN(stockMax) || stockMax <= stockMin) {
        newErrors.stockMax = `${t('validation.stockMax.invalid')} (${stockMin})`;
      }
    }

    const costPrice = Number(formData.costPrice);
    if (isNaN(costPrice) || costPrice < 0) {
      newErrors.costPrice = t('validation.costPrice.invalid');
    }

    if (formData.salePrice !== '' && formData.salePrice !== null) {
      const salePrice = Number(formData.salePrice);
      if (isNaN(salePrice) || salePrice < costPrice) {
        newErrors.salePrice = `${t('validation.salePrice.invalid')} (${formatCurrency(costPrice)})`;
      }
    }

    if (
      formData.dimensionsLength !== '' ||
      formData.dimensionsWidth !== '' ||
      formData.dimensionsHeight !== ''
    ) {
      const length = formData.dimensionsLength ? Number(formData.dimensionsLength) : 0;
      const width = formData.dimensionsWidth ? Number(formData.dimensionsWidth) : 0;
      const height = formData.dimensionsHeight ? Number(formData.dimensionsHeight) : 0;

      if (length < 0 || width < 0 || height < 0) {
        newErrors.dimensions = t('validation.dimensions.invalid');
      }
    }

    // Validar URLs si están presentes
    if (formData.purchaseUrl && formData.purchaseUrl.trim()) {
      try {
        new URL(formData.purchaseUrl);
      } catch {
        newErrors.purchaseUrl = t('validation.url.invalid');
      }
    }
    if (formData.imageUrl && formData.imageUrl.trim()) {
      try {
        new URL(formData.imageUrl);
      } catch {
        newErrors.imageUrl = t('validation.url.invalid');
      }
    }

    // Validaciones de ubicación según almacén
    if (formData.warehouse === 'MEYPAR') {
      const estanteria = Number(formData.estanteria);
      if (isNaN(estanteria) || estanteria < 1 || estanteria > 30) {
        newErrors.estanteria =
          t('validation.estanteria.invalid') || 'La estantería debe estar entre 1 y 30';
      }
      const estante = formData.estante.toUpperCase();
      if (!/^[A-G]$/.test(estante)) {
        newErrors.estante =
          t('validation.estante.invalid') || 'El estante debe ser una letra de A a G';
      }
    } else if (formData.warehouse === 'FURGONETA') {
      if (!formData.furgonetaName.trim() || formData.furgonetaName.trim().length < 2) {
        newErrors.furgonetaName =
          t('validation.furgonetaName.required') ||
          'El nombre del técnico es obligatorio (mínimo 2 caracteres)';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Hacer scroll al primer campo con error
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField) {
        // Usar setTimeout para asegurar que el DOM se haya actualizado
        setTimeout(() => {
          const errorElement =
            document.querySelector(`[name="${firstErrorField}"]`) ||
            document.querySelector(`#${firstErrorField}`) ||
            document.querySelector(`[data-field="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (errorElement as HTMLElement).focus();
          }
        }, 100);
      }
      return;
    }

    const dimensionsCm =
      formData.dimensionsLength || formData.dimensionsWidth || formData.dimensionsHeight
        ? {
            length: Number(formData.dimensionsLength) || 0,
            width: Number(formData.dimensionsWidth) || 0,
            height: Number(formData.dimensionsHeight) || 0,
          }
        : null;

    // Preparar datos de ubicación según el almacén seleccionado
    let aisle = '';
    let shelf = '';
    let locationExtra: string | null = null;
    const warehouse = formData.warehouse;

    if (warehouse === 'MEYPAR') {
      aisle = formData.estanteria;
      shelf = formData.estante.toUpperCase();
      locationExtra = null;
    } else if (warehouse === 'OLIVA_TORRAS') {
      aisle = '';
      shelf = '';
      locationExtra = 'Oliva Torras';
    } else if (warehouse === 'FURGONETA') {
      aisle = '';
      shelf = '';
      locationExtra = `Furgoneta ${formData.furgonetaName.trim()}`;
    }

    const submitData: CreateProductInput | UpdateProductInput = {
      code: formData.code.trim(),
      barcode: formData.barcode.trim() || null,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      category: formData.category.trim() || null,
      stockCurrent: Number(formData.stockCurrent),
      stockMin: Number(formData.stockMin),
      stockMax:
        formData.stockMax !== '' && formData.stockMax !== null
          ? Number(formData.stockMax)
          : null,
      aisle,
      shelf,
      locationExtra,
      warehouse,
      costPrice: Number(formData.costPrice),
      salePrice:
        formData.salePrice !== '' && formData.salePrice !== null
          ? Number(formData.salePrice)
          : null,
      purchaseUrl: formData.purchaseUrl.trim() || null,
      imageUrl: formData.imageUrl.trim() || null,
      supplierCode: formData.supplierCode.trim() || null,
      isActive: formData.isActive,
      isBatchTracked: false, // Siempre false, se eliminó la opción
      unitOfMeasure: formData.unitOfMeasure || null,
      weightKg:
        formData.weightKg !== '' && formData.weightKg !== null
          ? Number(formData.weightKg)
          : null,
      dimensionsCm,
      notes: formData.notes.trim() || null,
    };

    await onSubmit(submitData);
  };

  const handleChange = React.useCallback(
    (field: string, value: string | number | boolean) => {
      // Si es batchCode, convertir a mayúsculas y aplicar formato
      if (field === 'batchCode' && typeof value === 'string') {
        let formatted = value.toUpperCase().replace(/[^L0-9-]/g, '');
        // Asegurar formato L-XXXXX
        if (formatted.startsWith('L') && !formatted.includes('-')) {
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
      // Solo limpiar error si existe, sin validar
      setErrors((prev) => {
        if (prev[field]) {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        }
        return prev;
      });
    },
    [],
  );

  const handleBlur = React.useCallback((field: string) => {
    // Solo marcar como tocado, sin validar hasta el submit
    setTouchedFields((prev) => {
      if (prev.has(field)) return prev;
      return new Set(prev).add(field);
    });
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.form
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
    >
      {/* Información Básica */}
      <SectionCard icon={Package} title={t('form.basicInfo')} delay={0}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrapper error={errors.code} touched={touchedFields.has('code')}>
              <Label htmlFor="code" className="flex items-center gap-1.5">
                {t('table.code')} <span className="text-red-500">*</span>
                {!errors.code && touchedFields.has('code') && formData.code && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                )}
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                onBlur={() => handleBlur('code')}
                disabled={isEditing && !canEditCode}
                autoComplete="off"
                className={cn(
                  'transition-all duration-200',
                  errors.code && touchedFields.has('code')
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.has('code') && !errors.code && formData.code
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                      : 'focus:border-blue-500 focus:ring-blue-500',
                )}
              />
            </FieldWrapper>

            <FieldWrapper error={errors.barcode} touched={touchedFields.has('barcode')}>
              <Label htmlFor="barcode">{t('form.barcode')}</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                onBlur={() => handleBlur('barcode')}
                className="transition-all duration-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper error={errors.batchCode} touched={touchedFields.has('batchCode')}>
            <Label htmlFor="batchCode">
              {t('batches.form.batchCode') || 'Código de Lote'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="batchCode"
                value={formData.batchCode}
                onChange={(e) => handleChange('batchCode', e.target.value)}
                onBlur={async () => {
                  handleBlur('batchCode');
                  // Validar formato y duplicados
                  if (formData.batchCode.trim()) {
                    const batchCode = formData.batchCode.trim().toUpperCase();
                    const formatRegex = /^L-\d{5}$/;
                    if (!formatRegex.test(batchCode)) {
                      setErrors((prev) => ({
                        ...prev,
                        batchCode:
                          t('batches.form.batchCodeFormat') ||
                          'El código debe seguir el formato L-XXXXX (ej: L-00001)',
                      }));
                    } else {
                      setCheckingCode(true);
                      const exists = await batchCodeExists(batchCode);
                      setCheckingCode(false);
                      if (exists) {
                        setErrors((prev) => ({
                          ...prev,
                          batchCode:
                            t('batches.form.batchCodeExists') ||
                            'Este código de lote ya existe',
                        }));
                      }
                    }
                  }
                }}
                placeholder="L-00001"
                disabled={checkingCode}
                className={cn(
                  'flex-1 transition-all duration-200',
                  errors.batchCode && touchedFields.has('batchCode')
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'focus:border-blue-500 focus:ring-blue-500',
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  // Generar código único L-XXXXX
                  let attempt = 1;
                  let newCode = `L-${String(attempt).padStart(5, '0')}`;

                  while (await batchCodeExists(newCode)) {
                    attempt++;
                    newCode = `L-${String(attempt).padStart(5, '0')}`;
                    if (attempt > 99999) {
                      const timestamp = Date.now().toString().slice(-5);
                      newCode = `L-${timestamp}`;
                      break;
                    }
                  }

                  handleChange('batchCode', newCode);
                }}
                className="gap-2"
                title={t('batches.form.generateCode') || 'Generar código automático'}
                disabled={checkingCode}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
            {errors.batchCode && touchedFields.has('batchCode') && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.batchCode}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('batches.form.batchCodeHint') || 'Formato: L-XXXXX (ej: L-00001)'}
            </p>
          </FieldWrapper>

          <FieldWrapper error={errors.name} touched={touchedFields.has('name')}>
            <Label htmlFor="name" className="flex items-center gap-1.5">
              {t('table.name')} <span className="text-red-500">*</span>
              {!errors.name && touchedFields.has('name') && formData.name && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              )}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              className={cn(
                'transition-all duration-200',
                errors.name && touchedFields.has('name')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : touchedFields.has('name') && !errors.name && formData.name
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                    : 'focus:border-primary-500 focus:ring-primary-500',
              )}
            />
          </FieldWrapper>

          <div>
            <Label htmlFor="description">{t('form.description')}</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <div>
            <Label htmlFor="category">{t('table.category')}</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="transition-all duration-200 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      </SectionCard>

      {/* Stock */}
      <SectionCard icon={Box} title={t('form.stock')} delay={0.1}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper
            error={errors.stockCurrent}
            touched={touchedFields.has('stockCurrent')}
          >
            <Label htmlFor="stockCurrent">{t('form.stockCurrent')}</Label>
            <Input
              id="stockCurrent"
              type="number"
              min="0"
              value={formData.stockCurrent}
              onChange={(e) => handleChange('stockCurrent', Number(e.target.value) || 0)}
              onBlur={() => handleBlur('stockCurrent')}
              className={cn(
                'transition-all duration-200',
                errors.stockCurrent && touchedFields.has('stockCurrent')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'focus:border-primary-500 focus:ring-primary-500',
              )}
            />
          </FieldWrapper>

          <FieldWrapper error={errors.stockMin} touched={touchedFields.has('stockMin')}>
            <Label htmlFor="stockMin">
              {t('form.stockMin')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stockMin"
              type="number"
              min="0"
              value={formData.stockMin}
              onChange={(e) => handleChange('stockMin', Number(e.target.value) || 0)}
              onBlur={() => handleBlur('stockMin')}
              className={cn(
                'transition-all duration-200',
                errors.stockMin && touchedFields.has('stockMin')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'focus:border-primary-500 focus:ring-primary-500',
              )}
            />
          </FieldWrapper>

          <FieldWrapper error={errors.stockMax} touched={touchedFields.has('stockMax')}>
            <Label htmlFor="stockMax">{t('form.stockMax')}</Label>
            <Input
              id="stockMax"
              type="number"
              min="0"
              value={formData.stockMax || ''}
              onChange={(e) =>
                handleChange(
                  'stockMax',
                  e.target.value === '' ? '' : Number(e.target.value),
                )
              }
              onBlur={() => handleBlur('stockMax')}
              className={cn(
                'transition-all duration-200',
                errors.stockMax && touchedFields.has('stockMax')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'focus:border-primary-500 focus:ring-primary-500',
              )}
            />
          </FieldWrapper>
        </div>
      </SectionCard>

      {/* Ubicación */}
      <SectionCard icon={MapPin} title={t('form.location')} delay={0.2}>
        <div className="space-y-4">
          {/* Selector de Almacén */}
          <div>
            <Label htmlFor="warehouse">
              {t('form.warehouse') || 'Almacén'} <span className="text-red-500">*</span>
            </Label>
            <select
              id="warehouse"
              value={formData.warehouse}
              onChange={(e) => {
                const newWarehouse = e.target.value as
                  | 'MEYPAR'
                  | 'OLIVA_TORRAS'
                  | 'FURGONETA';
                setFormData({
                  ...formData,
                  warehouse: newWarehouse,
                  // Resetear campos según el almacén seleccionado
                  estanteria: newWarehouse === 'MEYPAR' ? '1' : '1',
                  estante: newWarehouse === 'MEYPAR' ? 'A' : 'A',
                  furgonetaName:
                    newWarehouse === 'FURGONETA' ? formData.furgonetaName : '',
                });
                handleBlur('warehouse');
              }}
              onBlur={() => handleBlur('warehouse')}
              className={cn(
                'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
                errors.warehouse && touchedFields.has('warehouse')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : '',
              )}
            >
              <option value="MEYPAR">{t('form.warehouse.meypar') || 'MEYPAR'}</option>
              <option value="OLIVA_TORRAS">
                {t('form.warehouse.olivaTorras') || 'Oliva Torras'}
              </option>
              <option value="FURGONETA">
                {t('form.warehouse.furgoneta') || 'Furgoneta'}
              </option>
            </select>
            {errors.warehouse && touchedFields.has('warehouse') && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.warehouse}
              </p>
            )}
          </div>

          {/* Campos condicionales según almacén */}
          {formData.warehouse === 'MEYPAR' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrapper
                error={errors.estanteria}
                touched={touchedFields.has('estanteria')}
              >
                <Label htmlFor="estanteria">
                  {t('form.estanteria') || 'Estantería'}{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <select
                  id="estanteria"
                  value={formData.estanteria}
                  onChange={(e) => handleChange('estanteria', e.target.value)}
                  onBlur={() => handleBlur('estanteria')}
                  className={cn(
                    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
                    errors.estanteria && touchedFields.has('estanteria')
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : '',
                  )}
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num.toString()}>
                      {num}
                    </option>
                  ))}
                </select>
              </FieldWrapper>

              <FieldWrapper error={errors.estante} touched={touchedFields.has('estante')}>
                <Label htmlFor="estante">
                  {t('form.estante') || 'Estante'} <span className="text-red-500">*</span>
                </Label>
                <select
                  id="estante"
                  value={formData.estante.toUpperCase()}
                  onChange={(e) => handleChange('estante', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('estante')}
                  className={cn(
                    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
                    errors.estante && touchedFields.has('estante')
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : '',
                  )}
                >
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </select>
              </FieldWrapper>

              {/* Preview de ubicación */}
              <div className="col-span-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('form.locationPreview') || 'Ubicación'}:{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {formData.estanteria}
                      {formData.estante.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {formData.warehouse === 'OLIVA_TORRAS' && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('form.locationPreview') || 'Ubicación'}:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Oliva Torras
                </span>
              </p>
            </div>
          )}

          {formData.warehouse === 'FURGONETA' && (
            <div>
              <FieldWrapper
                error={errors.furgonetaName}
                touched={touchedFields.has('furgonetaName')}
              >
                <Label htmlFor="furgonetaName">
                  {t('form.furgonetaName') || 'Nombre del técnico'}{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="furgonetaName"
                  type="text"
                  value={formData.furgonetaName}
                  onChange={(e) => handleChange('furgonetaName', e.target.value)}
                  onBlur={() => handleBlur('furgonetaName')}
                  placeholder={
                    t('form.furgonetaNamePlaceholder') || 'Ej: Jaume, Carles...'
                  }
                  className={cn(
                    'transition-all duration-200',
                    errors.furgonetaName && touchedFields.has('furgonetaName')
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'focus:border-primary-500 focus:ring-primary-500',
                  )}
                />
              </FieldWrapper>

              {/* Preview de ubicación */}
              {formData.furgonetaName.trim() && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('form.locationPreview') || 'Ubicación'}:{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      Furgoneta {formData.furgonetaName.trim()}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Precios */}
      <SectionCard icon={Coins} title={t('form.prices')} delay={0.3}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper error={errors.costPrice} touched={touchedFields.has('costPrice')}>
            <Label htmlFor="costPrice">
              {t('form.costPrice')} (€) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', e.target.value)}
                onBlur={() => handleBlur('costPrice')}
                className={cn(
                  'pr-8 transition-all duration-200',
                  errors.costPrice && touchedFields.has('costPrice')
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'focus:border-primary-500 focus:ring-primary-500',
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                €
              </span>
            </div>
          </FieldWrapper>

          <FieldWrapper error={errors.salePrice} touched={touchedFields.has('salePrice')}>
            <Label htmlFor="salePrice">{t('form.salePrice')} (€)</Label>
            <div className="relative">
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.salePrice}
                onChange={(e) => handleChange('salePrice', e.target.value)}
                onBlur={() => handleBlur('salePrice')}
                className={cn(
                  'pr-8 transition-all duration-200',
                  errors.salePrice && touchedFields.has('salePrice')
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'focus:border-primary-500 focus:ring-primary-500',
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                €
              </span>
            </div>
          </FieldWrapper>
        </div>
      </SectionCard>

      {/* Información Adicional */}
      <SectionCard icon={Info} title={t('form.additionalInfo')} delay={0.4}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="supplierCode">{t('form.supplierCode')}</Label>
              <Input
                id="supplierCode"
                value={formData.supplierCode}
                onChange={(e) => handleChange('supplierCode', e.target.value)}
                className="transition-all duration-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="unitOfMeasure">{t('form.unitOfMeasure')}</Label>
              <Input
                id="unitOfMeasure"
                value={formData.unitOfMeasure}
                onChange={(e) => handleChange('unitOfMeasure', e.target.value)}
                placeholder="unidad"
                className="transition-all duration-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <FieldWrapper
            error={errors.purchaseUrl}
            touched={touchedFields.has('purchaseUrl')}
          >
            <Label htmlFor="purchaseUrl">{t('form.purchaseUrl')}</Label>
            <Input
              id="purchaseUrl"
              type="url"
              value={formData.purchaseUrl}
              onChange={(e) => handleChange('purchaseUrl', e.target.value)}
              onBlur={() => handleBlur('purchaseUrl')}
              placeholder="https://..."
              className={cn(
                'transition-all duration-200',
                errors.purchaseUrl && touchedFields.has('purchaseUrl')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'focus:border-primary-500 focus:ring-primary-500',
              )}
            />
          </FieldWrapper>

          <FieldWrapper error={errors.imageUrl} touched={touchedFields.has('imageUrl')}>
            <Label htmlFor="imageUrl">{t('form.imageUrl')}</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              onBlur={() => handleBlur('imageUrl')}
              placeholder="https://..."
              className={cn(
                'transition-all duration-200',
                errors.imageUrl && touchedFields.has('imageUrl')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'focus:border-primary-500 focus:ring-primary-500',
              )}
            />
          </FieldWrapper>

          <div>
            <Label htmlFor="weightKg">{t('form.weightKg')}</Label>
            <Input
              id="weightKg"
              type="number"
              step="0.001"
              min="0"
              value={formData.weightKg}
              onChange={(e) => handleChange('weightKg', e.target.value)}
              className="transition-all duration-200 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <FieldWrapper
            error={errors.dimensions}
            touched={touchedFields.has('dimensions')}
          >
            <Label>{t('form.dimensions')}</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder={t('form.length')}
                type="number"
                step="0.1"
                min="0"
                value={formData.dimensionsLength}
                onChange={(e) => handleChange('dimensionsLength', e.target.value)}
                onBlur={() => handleBlur('dimensions')}
                className={cn(
                  'transition-all duration-200',
                  errors.dimensions && touchedFields.has('dimensions')
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'focus:border-blue-500 focus:ring-blue-500',
                )}
              />
              <Input
                placeholder={t('form.width')}
                type="number"
                step="0.1"
                min="0"
                value={formData.dimensionsWidth}
                onChange={(e) => handleChange('dimensionsWidth', e.target.value)}
                onBlur={() => handleBlur('dimensions')}
                className={cn(
                  'transition-all duration-200',
                  errors.dimensions && touchedFields.has('dimensions')
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'focus:border-blue-500 focus:ring-blue-500',
                )}
              />
              <Input
                placeholder={t('form.height')}
                type="number"
                step="0.1"
                min="0"
                value={formData.dimensionsHeight}
                onChange={(e) => handleChange('dimensionsHeight', e.target.value)}
                onBlur={() => handleBlur('dimensions')}
                className={cn(
                  'transition-all duration-200',
                  errors.dimensions && touchedFields.has('dimensions')
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'focus:border-blue-500 focus:ring-blue-500',
                )}
              />
            </div>
          </FieldWrapper>

          <div>
            <Label htmlFor="notes">{t('form.notes')}</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
        </div>
      </SectionCard>

      {/* Opciones */}
      <SectionCard icon={Settings} title={t('form.options')} delay={0.5}>
        <div className="space-y-3">
          <motion.label
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
          >
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('form.activeProduct')}
            </span>
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
          {t('form.cancel')}
        </Button>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            type="submit"
            disabled={loading}
            className="min-w-[140px] transition-all duration-200"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                />
                {t('form.save')}
              </>
            ) : isEditing ? (
              t('form.update')
            ) : (
              t('form.create')
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
