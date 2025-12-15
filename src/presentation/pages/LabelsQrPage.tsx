import { Download, FileArchive, Loader2, Package, QrCode, Save, Tag } from 'lucide-react';
import * as React from 'react';
import { toPng } from 'html-to-image';
import type { Product, ProductLocation } from '@domain/entities';
import type { ProductQrAsset } from '@domain/entities/ProductQrAsset';
import { QrCodeService } from '@application/services/QrCodeService';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import {
  buildLabelSvg,
  mmToPx,
  type LabelConfig,
} from '@application/services/LabelPngService';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../hooks/useProducts';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchInput } from '../components/ui/SearchInput';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { SupabaseProductQrRepository } from '@infrastructure/repositories/SupabaseProductQrRepository';
import {
  createProductQrSignedUrl,
  deleteProductQr,
  uploadProductQr,
} from '@infrastructure/storage/qrStorage';
import { cn } from '../lib/cn';

type BulkZipMode = 'qr' | 'labels' | 'both';

function withQrPrefix(code: string) {
  return `QR-${code}.png`;
}

function withEtPrefix(code: string) {
  return `ET-${code}.png`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function asyncPool<T, R>(
  limit: number,
  items: T[],
  iteratorFn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await iteratorFn(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

async function svgToPngBlob(
  svg: string,
  widthPx: number,
  heightPx: number,
): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = svgUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo renderizar el SVG'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener contexto de canvas');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.drawImage(img, 0, 0, widthPx, heightPx);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('No se pudo generar PNG'))),
        'image/png',
      );
    });

    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function checkBarcodeConflicts(barcode: string, excludeProductId?: string) {
  const term = barcode.trim();
  if (!term) return null;

  const { data, error } = await supabaseClient
    .from('products')
    .select('id,code,name,barcode')
    .or(`code.eq.${term},barcode.eq.${term}`);

  if (error) {
    throw new Error(`Error comprobando duplicados: ${error.message}`);
  }

  const conflict = (data ?? []).find((p) => p.id !== excludeProductId);
  return conflict
    ? (conflict as { id: string; code: string; name: string; barcode: string | null })
    : null;
}

export function LabelsQrPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { getAll, update } = useProducts();

  const qrRepo = React.useMemo(() => new SupabaseProductQrRepository(), []);

  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [assetsByProductId, setAssetsByProductId] = React.useState<
    Map<string, ProductQrAsset>
  >(() => new Map());

  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selectedProduct = React.useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  );

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [bulkZipMode, setBulkZipMode] = React.useState<BulkZipMode>('both');
  const [bulkDownloading, setBulkDownloading] = React.useState(false);
  const [bulkProgress, setBulkProgress] = React.useState<{
    done: number;
    total: number;
  } | null>(null);
  const [bulkZipDialogOpen, setBulkZipDialogOpen] = React.useState(false);
  const [bulkLabelConfig, setBulkLabelConfig] = React.useState<LabelConfig | null>(null);

  const [barcodeDraft, setBarcodeDraft] = React.useState('');
  const [savingBarcode, setSavingBarcode] = React.useState(false);

  const [qrPreviewUrl, setQrPreviewUrl] = React.useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = React.useState(false);
  const [confirmReplaceQrOpen, setConfirmReplaceQrOpen] = React.useState(false);

  const [labelQrDataUrl, setLabelQrDataUrl] = React.useState<string | null>(null);

  const [productLocations, setProductLocations] = React.useState<ProductLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = React.useState<string>('legacy');

  const [labelConfig, setLabelConfig] = React.useState<LabelConfig>({
    widthMm: 30,
    heightMm: 20,
    dpi: 203,
    showQr: true,
    showCode: true,
    showBarcode: false,
    showName: true,
    showWarehouse: false,
    showLocation: true,
    qrSizeMm: 10,
    paddingMm: 1,
    codeFontPx: 12,
    nameFontPx: 10,
  });

  const labelRef = React.useRef<HTMLDivElement>(null);

  const selectedAsset = selectedProduct
    ? (assetsByProductId.get(selectedProduct.id) ?? null)
    : null;

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      return (
        p.code.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        (p.barcode ?? '').toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAll({ includeInactive: false });
      setProducts(all);
      const ids = all.map((p) => p.id);
      const assets = await qrRepo.getByProductIds(ids);
      setAssetsByProductId(new Map(assets.map((a) => [a.productId, a])));
    } catch (err) {
      toast.error(
        'Error',
        err instanceof Error ? err.message : 'No se pudieron cargar los datos',
      );
    } finally {
      setLoading(false);
    }
  }, [getAll, qrRepo, toast]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    setQrPreviewUrl(null);
    setBarcodeDraft(selectedProduct?.barcode ?? '');
  }, [selectedProduct?.id, selectedProduct?.barcode]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const productId = selectedProduct?.id;
      if (!productId) {
        setProductLocations([]);
        setSelectedLocationId('legacy');
        return;
      }

      try {
        const { data, error } = await supabaseClient
          .from('product_locations')
          .select(
            'id,product_id,warehouse,aisle,shelf,is_primary,created_at,updated_at,created_by,updated_by',
          )
          .eq('product_id', productId)
          .order('is_primary', { ascending: false })
          .order('warehouse', { ascending: true })
          .order('aisle', { ascending: true })
          .order('shelf', { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        const mapped: ProductLocation[] = (data ?? []).map((row) => ({
          id: row.id,
          productId: row.product_id,
          warehouse: row.warehouse,
          aisle: row.aisle,
          shelf: row.shelf,
          isPrimary: row.is_primary,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
          updatedBy: row.updated_by,
        }));

        if (cancelled) return;
        setProductLocations(mapped);

        const primary = mapped.find((l) => l.isPrimary);
        setSelectedLocationId(primary?.id ?? mapped[0]?.id ?? 'legacy');
      } catch {
        if (cancelled) return;
        setProductLocations([]);
        setSelectedLocationId('legacy');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const barcode = (selectedProduct?.barcode ?? '').trim();
      if (!barcode) {
        setLabelQrDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(barcode, {
          type: 'image/png',
          width: 512,
          margin: 4,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        if (!cancelled) setLabelQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setLabelQrDataUrl(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.barcode]);

  const selectedLocation = React.useMemo(() => {
    if (selectedLocationId === 'legacy') return null;
    return productLocations.find((l) => l.id === selectedLocationId) ?? null;
  }, [productLocations, selectedLocationId]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filtered.every((p) => next.has(p.id));
      if (allSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleSaveBarcode = async () => {
    if (!selectedProduct) return;
    const nextBarcode = barcodeDraft.trim();
    if (!nextBarcode) {
      toast.error('Barcode', 'El barcode no puede estar vacío.');
      return;
    }

    setSavingBarcode(true);
    try {
      const conflict = await checkBarcodeConflicts(nextBarcode, selectedProduct.id);
      if (conflict) {
        toast.error(
          'Barcode duplicado',
          `Ya está usado por ${conflict.code} - ${conflict.name}.`,
        );
        return;
      }

      const updated = await update(selectedProduct.id, { barcode: nextBarcode });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success('Barcode', 'Guardado correctamente.');
    } catch (err) {
      toast.error(
        'Barcode',
        err instanceof Error ? err.message : 'Error guardando barcode',
      );
    } finally {
      setSavingBarcode(false);
    }
  };

  const loadQrPreview = React.useCallback(async () => {
    if (!selectedAsset) return;
    try {
      const signed = await createProductQrSignedUrl(selectedAsset.qrPath, 60 * 10);
      setQrPreviewUrl(signed);
    } catch (err) {
      toast.error('QR', err instanceof Error ? err.message : 'Error cargando preview');
    }
  }, [selectedAsset, toast]);

  const handleGenerateQr = async () => {
    if (!selectedProduct) return;
    const barcode = (selectedProduct.barcode ?? '').trim();
    if (!barcode) {
      toast.error('QR', 'El producto no tiene barcode. Guárdalo primero.');
      return;
    }

    // Confirmación si ya existe asset
    if (selectedAsset) {
      setConfirmReplaceQrOpen(true);
      return;
    }

    await doGenerateQr();
  };

  const doGenerateQr = async () => {
    if (!selectedProduct) return;
    const barcode = (selectedProduct.barcode ?? '').trim();
    if (!barcode) return;

    setGeneratingQr(true);
    try {
      const pngBlob = await QrCodeService.generateQrPngBlob(barcode, { sizePx: 1024 });
      const qrPath = await uploadProductQr({
        productId: selectedProduct.id,
        barcode,
        pngBlob,
      });
      const asset = await qrRepo.upsert({
        productId: selectedProduct.id,
        barcode,
        qrPath,
      });
      setAssetsByProductId((prev) => {
        const next = new Map(prev);
        next.set(asset.productId, asset);
        return next;
      });
      toast.success('QR', 'QR generado correctamente.');
      // refrescar preview
      const signed = await createProductQrSignedUrl(qrPath, 60 * 10);
      setQrPreviewUrl(signed);
    } catch (err) {
      toast.error('QR', err instanceof Error ? err.message : 'Error generando QR');
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleDownloadQr = async () => {
    if (!selectedAsset || !selectedProduct) return;
    try {
      const signed = await createProductQrSignedUrl(selectedAsset.qrPath, 60 * 10);
      const res = await fetch(signed);
      const blob = await res.blob();
      downloadBlob(blob, withQrPrefix(selectedProduct.code));
    } catch (err) {
      toast.error('QR', err instanceof Error ? err.message : 'Error descargando QR');
    }
  };

  const handleDeleteQr = async () => {
    if (!selectedAsset || !selectedProduct) return;
    try {
      await deleteProductQr(selectedAsset.qrPath);
      await qrRepo.deleteByProductId(selectedProduct.id);
      setAssetsByProductId((prev) => {
        const next = new Map(prev);
        next.delete(selectedProduct.id);
        return next;
      });
      setQrPreviewUrl(null);
      toast.success('QR', 'QR eliminado.');
    } catch (err) {
      toast.error('QR', err instanceof Error ? err.message : 'Error eliminando QR');
    }
  };

  const handleDownloadLabelPng = async () => {
    if (!selectedProduct) return;
    if (!labelRef.current) return;

    try {
      const dataUrl = await toPng(labelRef.current, {
        cacheBust: true,
        pixelRatio: 1,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, withEtPrefix(selectedProduct.code));
    } catch (err) {
      toast.error('Etiqueta', err instanceof Error ? err.message : 'Error generando PNG');
    }
  };

  const labelWidthPx = mmToPx(labelConfig.widthMm, labelConfig.dpi);
  const labelHeightPx = mmToPx(labelConfig.heightMm, labelConfig.dpi);
  const qrSizePx = mmToPx(labelConfig.qrSizeMm, labelConfig.dpi);
  const paddingPx = mmToPx(labelConfig.paddingMm, labelConfig.dpi);

  const locationText = React.useMemo(() => {
    if (!selectedProduct) return '';
    const aisle = selectedLocation?.aisle ?? selectedProduct.aisle;
    const shelf = selectedLocation?.shelf ?? selectedProduct.shelf;
    return `${aisle}-${shelf}`;
  }, [selectedProduct, selectedLocation]);

  const warehouseText = React.useMemo(() => {
    if (!selectedProduct) return '';
    return selectedLocation?.warehouse ?? selectedProduct.warehouse ?? '';
  }, [selectedProduct, selectedLocation]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
              {t('nav.labelsQr') || 'Etiquetas QR'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Genera QR (Storage privado) y etiquetas PNG por producto. Descarga
              individual o ZIP masivo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">ZIP:</label>
            <select
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              value={bulkZipMode}
              onChange={(e) => setBulkZipMode(e.target.value as BulkZipMode)}
            >
              <option value="qr">QR</option>
              <option value="labels">Etiquetas</option>
              <option value="both">Ambos</option>
            </select>
          </div>

          <Button
            variant="secondary"
            onClick={async () => {
              if (bulkDownloading) return;
              if (selectedIds.size === 0) return;
              // Antes de descargar, abrir diálogo para elegir campos + dimensiones (si incluye etiquetas)
              setBulkLabelConfig(labelConfig);
              setBulkZipDialogOpen(true);
            }}
            disabled={selectedIds.size === 0 || bulkDownloading}
          >
            {bulkDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando ZIP…
                {bulkProgress ? (
                  <span className="ml-2 text-xs text-gray-600 dark:text-gray-300">
                    {bulkProgress.done}/{bulkProgress.total}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <FileArchive className="mr-2 h-4 w-4" />
                Descargar ZIP ({selectedIds.size})
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog
        isOpen={bulkZipDialogOpen}
        onClose={() => setBulkZipDialogOpen(false)}
        title="Descarga masiva (ZIP)"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
              Contenido del ZIP
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-200">Incluir:</label>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                value={bulkZipMode}
                onChange={(e) => setBulkZipMode(e.target.value as BulkZipMode)}
              >
                <option value="qr">QR</option>
                <option value="labels">Etiquetas</option>
                <option value="both">Ambos</option>
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Archivos: QR = <code>QR-CODIGO.png</code>, Etiqueta ={' '}
                <code>ET-CODIGO.png</code>
              </span>
            </div>
          </div>

          {(bulkZipMode === 'labels' || bulkZipMode === 'both') && bulkLabelConfig && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-50">
                Configuración de etiquetas (aplica al ZIP)
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Ancho (mm)
                  </label>
                  <Input
                    type="number"
                    min={10}
                    step={1}
                    value={bulkLabelConfig.widthMm}
                    onChange={(e) =>
                      setBulkLabelConfig((p) =>
                        p ? { ...p, widthMm: Number(e.target.value) } : p,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Alto (mm)
                  </label>
                  <Input
                    type="number"
                    min={10}
                    step={1}
                    value={bulkLabelConfig.heightMm}
                    onChange={(e) =>
                      setBulkLabelConfig((p) =>
                        p ? { ...p, heightMm: Number(e.target.value) } : p,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">DPI</label>
                  <select
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    value={bulkLabelConfig.dpi}
                    onChange={(e) =>
                      setBulkLabelConfig((p) =>
                        p ? { ...p, dpi: Number(e.target.value) as 203 | 300 } : p,
                      )
                    }
                  >
                    <option value={203}>203</option>
                    <option value={300}>300</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    QR (mm)
                  </label>
                  <Input
                    type="number"
                    min={6}
                    step={1}
                    value={bulkLabelConfig.qrSizeMm}
                    onChange={(e) =>
                      setBulkLabelConfig((p) =>
                        p ? { ...p, qrSizeMm: Number(e.target.value) } : p,
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {(
                  [
                    ['showQr', 'QR'],
                    ['showCode', 'Código'],
                    ['showBarcode', 'Barcode'],
                    ['showName', 'Nombre'],
                    ['showLocation', 'Ubicación'],
                    ['showWarehouse', 'Almacén'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={bulkLabelConfig[key]}
                      onChange={(e) =>
                        setBulkLabelConfig((p) =>
                          p ? { ...p, [key]: e.target.checked } : p,
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkZipDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (bulkDownloading) return;
                if (selectedIds.size === 0) return;

                const selectedProducts = products.filter((p) => selectedIds.has(p.id));
                const total = selectedProducts.length;
                setBulkZipDialogOpen(false);
                setBulkDownloading(true);
                setBulkProgress({ done: 0, total });

                try {
                  const zip = new JSZip();
                  const needQr = bulkZipMode === 'qr' || bulkZipMode === 'both';
                  const needLabels = bulkZipMode === 'labels' || bulkZipMode === 'both';

                  const labelCfg = bulkLabelConfig ?? labelConfig;
                  const widthPx = mmToPx(labelCfg.widthMm, labelCfg.dpi);
                  const heightPx = mmToPx(labelCfg.heightMm, labelCfg.dpi);

                  const folderQr = bulkZipMode === 'both' ? zip.folder('qr') : zip;
                  const folderLabels =
                    bulkZipMode === 'both' ? zip.folder('labels') : zip;

                  const barcodeQrCache = new Map<string, string>();

                  // Para etiquetas masivas: usar ubicación primaria si existe (si no, fallback a aisle/shelf del producto)
                  const locationsByProductId = new Map<string, ProductLocation>();
                  if (needLabels) {
                    const ids = selectedProducts.map((p) => p.id);
                    const { data, error } = await supabaseClient
                      .from('product_locations')
                      .select(
                        'id,product_id,warehouse,aisle,shelf,is_primary,created_at,updated_at',
                      )
                      .in('product_id', ids);
                    if (!error && data) {
                      for (const row of data) {
                        const existing = locationsByProductId.get(row.product_id);
                        if (!existing || row.is_primary) {
                          locationsByProductId.set(row.product_id, {
                            id: row.id,
                            productId: row.product_id,
                            warehouse: row.warehouse,
                            aisle: row.aisle,
                            shelf: row.shelf,
                            isPrimary: row.is_primary,
                            createdAt: row.created_at,
                            updatedAt: row.updated_at,
                          });
                        }
                      }
                    }
                  }

                  await asyncPool(6, selectedProducts, async (p) => {
                    // QR
                    if (needQr) {
                      const barcode = (p.barcode ?? '').trim();
                      if (barcode) {
                        const asset = assetsByProductId.get(p.id);
                        let qrBlob: Blob | null = null;

                        if (asset) {
                          const signed = await createProductQrSignedUrl(
                            asset.qrPath,
                            60 * 10,
                          );
                          const res = await fetch(signed);
                          qrBlob = await res.blob();
                        } else {
                          qrBlob = await QrCodeService.generateQrPngBlob(barcode, {
                            sizePx: 1024,
                          });
                        }

                        folderQr?.file(withQrPrefix(p.code), qrBlob);
                      }
                    }

                    // Etiquetas
                    if (needLabels) {
                      const barcode = (p.barcode ?? '').trim();
                      let qrDataUrl: string | null = null;

                      if (labelCfg.showQr && barcode) {
                        if (barcodeQrCache.has(barcode)) {
                          qrDataUrl = barcodeQrCache.get(barcode)!;
                        } else {
                          qrDataUrl = await QRCode.toDataURL(barcode, {
                            type: 'image/png',
                            width: 512,
                            margin: 4,
                            errorCorrectionLevel: 'M',
                            color: { dark: '#000000', light: '#FFFFFF' },
                          });
                          barcodeQrCache.set(barcode, qrDataUrl);
                        }
                      }

                      const loc = locationsByProductId.get(p.id);
                      const labelProduct: Product = {
                        ...p,
                        aisle: loc?.aisle ?? p.aisle,
                        shelf: loc?.shelf ?? p.shelf,
                        warehouse: loc?.warehouse ?? p.warehouse,
                      };

                      const svg = buildLabelSvg(labelProduct, qrDataUrl, labelCfg);
                      const labelBlob = await svgToPngBlob(svg, widthPx, heightPx);
                      folderLabels?.file(withEtPrefix(p.code), labelBlob);
                    }

                    setBulkProgress((prev) =>
                      prev ? { ...prev, done: prev.done + 1 } : null,
                    );
                  });

                  const zipBlob = await zip.generateAsync({ type: 'blob' });
                  const today = new Date().toISOString().split('T')[0];
                  downloadBlob(zipBlob, `etiquetas_qr_${today}.zip`);
                  toast.success('ZIP', 'Descarga preparada.');
                } catch (err) {
                  toast.error(
                    'ZIP',
                    err instanceof Error ? err.message : 'Error generando ZIP',
                  );
                } finally {
                  setBulkDownloading(false);
                  setBulkProgress(null);
                }
              }}
              disabled={bulkDownloading || selectedIds.size === 0}
            >
              Descargar ZIP
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lista */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
                <Package className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h2 className="font-semibold">Productos</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({filtered.length})
                </span>
              </div>
              <div className="w-full sm:w-96">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar por código, nombre o barcode…"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-600 dark:text-gray-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      <th className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={
                            filtered.length > 0 &&
                            filtered.every((p) => selectedIds.has(p.id))
                          }
                          onChange={toggleSelectAllFiltered}
                        />
                      </th>
                      <th className="py-2 pr-4">Código</th>
                      <th className="py-2 pr-4">Nombre</th>
                      <th className="py-2 pr-4">Barcode</th>
                      <th className="py-2 pr-4">QR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const asset = assetsByProductId.get(p.id);
                      const hasQr = !!asset;
                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            'border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/30',
                            selectedId === p.id && 'bg-blue-50 dark:bg-blue-900/20',
                          )}
                        >
                          <td className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(p.id)}
                              onChange={() => toggleSelected(p.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <button
                              className="font-medium text-gray-900 hover:underline dark:text-gray-50"
                              onClick={() => setSelectedId(p.id)}
                            >
                              {p.code}
                            </button>
                          </td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">
                            {p.name}
                          </td>
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                            {p.barcode || (
                              <span className="text-amber-600">Sin barcode</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {hasQr ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                OK
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                No
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Detalle */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Barcode */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-50">
                <Tag className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h2 className="font-semibold">Barcode</h2>
              </div>

              {!selectedProduct ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selecciona un producto para editar y generar QR/etiquetas.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-gray-700 dark:text-gray-200">
                    <div className="font-medium">{selectedProduct.code}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {selectedProduct.name}
                    </div>
                  </div>

                  <Input
                    value={barcodeDraft}
                    onChange={(e) => setBarcodeDraft(e.target.value)}
                    placeholder="Introduce barcode…"
                    autoComplete="off"
                  />

                  <Button
                    onClick={handleSaveBarcode}
                    disabled={savingBarcode || !barcodeDraft.trim()}
                  >
                    {savingBarcode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando…
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar barcode
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* QR */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-50">
                <QrCode className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h2 className="font-semibold">QR</h2>
              </div>

              {!selectedProduct ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">—</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleGenerateQr}
                      disabled={generatingQr || !(selectedProduct.barcode ?? '').trim()}
                    >
                      {generatingQr ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generando…
                        </>
                      ) : (
                        <>
                          <QrCode className="mr-2 h-4 w-4" />
                          {selectedAsset ? 'Reemplazar QR' : 'Generar QR'}
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleDownloadQr}
                      disabled={!selectedAsset || !selectedProduct}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={handleDeleteQr}
                      disabled={!selectedAsset || generatingQr}
                    >
                      Eliminar
                    </Button>
                  </div>

                  {selectedAsset && !qrPreviewUrl && (
                    <Button variant="outline" onClick={loadQrPreview}>
                      Cargar preview
                    </Button>
                  )}

                  {qrPreviewUrl && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                      <img
                        src={qrPreviewUrl}
                        alt={`QR ${selectedProduct.code}`}
                        className="mx-auto h-44 w-44"
                      />
                      <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                        Contenido QR: {selectedProduct.barcode}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Etiqueta */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-50">
                <Tag className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h2 className="font-semibold">Etiqueta</h2>
              </div>

              {!selectedProduct ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">—</p>
              ) : (
                <div className="space-y-4">
                  {productLocations.length > 1 && (
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Ubicación a imprimir
                      </label>
                      <select
                        className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                        value={selectedLocationId}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                      >
                        {productLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.warehouse}: {loc.aisle}-{loc.shelf}
                            {loc.isPrimary ? ' (principal)' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Si un producto tiene varias ubicaciones, elige cuál imprimir en la
                        etiqueta.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Ancho (mm)
                      </label>
                      <Input
                        type="number"
                        value={labelConfig.widthMm}
                        onChange={(e) =>
                          setLabelConfig((p) => ({
                            ...p,
                            widthMm: Number(e.target.value),
                          }))
                        }
                        min={10}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Alto (mm)
                      </label>
                      <Input
                        type="number"
                        value={labelConfig.heightMm}
                        onChange={(e) =>
                          setLabelConfig((p) => ({
                            ...p,
                            heightMm: Number(e.target.value),
                          }))
                        }
                        min={10}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        DPI
                      </label>
                      <select
                        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                        value={labelConfig.dpi}
                        onChange={(e) =>
                          setLabelConfig((p) => ({
                            ...p,
                            dpi: Number(e.target.value) as 203 | 300,
                          }))
                        }
                      >
                        <option value={203}>203</option>
                        <option value={300}>300</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        QR (mm)
                      </label>
                      <Input
                        type="number"
                        value={labelConfig.qrSizeMm}
                        onChange={(e) =>
                          setLabelConfig((p) => ({
                            ...p,
                            qrSizeMm: Number(e.target.value),
                          }))
                        }
                        min={6}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(
                      [
                        ['showQr', 'QR'],
                        ['showCode', 'Código'],
                        ['showBarcode', 'Barcode'],
                        ['showName', 'Nombre'],
                        ['showLocation', 'Ubicación'],
                        ['showWarehouse', 'Almacén'],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-gray-700 dark:text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={labelConfig[key]}
                          onChange={(e) =>
                            setLabelConfig((p) => ({ ...p, [key]: e.target.checked }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                      Preview ({labelConfig.widthMm}×{labelConfig.heightMm}mm @{' '}
                      {labelConfig.dpi}dpi)
                    </div>
                    <div className="overflow-auto">
                      <div
                        ref={labelRef}
                        style={{
                          width: `${labelWidthPx}px`,
                          height: `${labelHeightPx}px`,
                          background: '#ffffff',
                          color: '#000000',
                          position: 'relative',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                        }}
                      >
                        {/* QR */}
                        {labelConfig.showQr && (selectedProduct.barcode ?? '').trim() && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${paddingPx}px`,
                              top: `${paddingPx}px`,
                              width: `${qrSizePx}px`,
                              height: `${qrSizePx}px`,
                              background: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {/* Para el preview/PNG usamos un dataURL local (evita problemas CORS al exportar). */}
                            {labelQrDataUrl ? (
                              <img
                                src={labelQrDataUrl}
                                alt="QR"
                                style={{ width: '100%', height: '100%' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: '1px solid #eee',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                }}
                              >
                                QR
                              </div>
                            )}
                          </div>
                        )}

                        {/* Texto derecha */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${paddingPx + qrSizePx + paddingPx}px`,
                            top: `${paddingPx}px`,
                            right: `${paddingPx}px`,
                            bottom: `${paddingPx}px`,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div
                            style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                          >
                            {labelConfig.showCode && (
                              <div
                                style={{
                                  fontSize: labelConfig.codeFontPx,
                                  fontWeight: 700,
                                }}
                              >
                                {selectedProduct.code}
                              </div>
                            )}
                            {labelConfig.showBarcode && (
                              <div style={{ fontSize: labelConfig.codeFontPx }}>
                                {selectedProduct.barcode ?? ''}
                              </div>
                            )}
                            {labelConfig.showLocation && (
                              <div
                                style={{
                                  fontSize: Math.max(9, labelConfig.nameFontPx - 1),
                                }}
                              >
                                {locationText}
                              </div>
                            )}
                            {labelConfig.showWarehouse && warehouseText && (
                              <div
                                style={{
                                  fontSize: Math.max(9, labelConfig.nameFontPx - 1),
                                }}
                              >
                                {warehouseText}
                              </div>
                            )}
                          </div>

                          {labelConfig.showName && (
                            <div
                              style={{
                                fontSize: labelConfig.nameFontPx,
                                fontWeight: 600,
                              }}
                            >
                              {selectedProduct.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleDownloadLabelPng} variant="secondary">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar etiqueta PNG
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmReplaceQrOpen}
        onClose={() => setConfirmReplaceQrOpen(false)}
        onConfirm={async () => {
          // Si existe QR, reemplazamos (subida con upsert + upsert en tabla)
          await doGenerateQr();
        }}
        title="Reemplazar QR"
        message="Este producto ya tiene un QR generado. ¿Quieres reemplazarlo?"
        confirmText="Reemplazar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
}
