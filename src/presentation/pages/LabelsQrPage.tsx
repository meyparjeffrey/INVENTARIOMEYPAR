import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileArchive,
  Loader2,
  Package,
  QrCode,
  Tag,
} from 'lucide-react';
import * as React from 'react';
import { toPng } from 'html-to-image';
import type { Product, ProductLocation } from '@domain/entities';
import type { ProductQrAsset } from '@domain/entities/ProductQrAsset';
import type { ProductLabelAsset } from '@domain/entities/ProductLabelAsset';
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
import { SupabaseProductLabelRepository } from '@infrastructure/repositories/SupabaseProductLabelRepository';
import {
  createProductQrSignedUrl,
  deleteProductQr,
  uploadProductQr,
} from '@infrastructure/storage/qrStorage';
import {
  deleteProductLabel,
  uploadProductLabel,
} from '@infrastructure/storage/labelStorage';
import { cn } from '../lib/cn';

type BulkZipMode = 'qr' | 'labels' | 'both';

type PngQuality = 'auto' | 'default' | 'better' | 'max';

type StatusFilter = 'all' | 'ok' | 'no';

function qualityScale(q: PngQuality, dpi: number): number {
  if (q === 'better') return 2;
  if (q === 'max') return 3;
  if (q === 'auto') {
    // Pro (auto): mejora en 203dpi, normal en 300/600dpi
    if (dpi <= 203) return 2;
    return 1;
  }
  return 1;
}

function withQrPrefix(code: string) {
  return `QR-${code}.png`;
}

function withEtPrefix(code: string) {
  return `ET-${code}.png`;
}

function truncateWithEllipsis(text: string, maxChars: number): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, Math.max(0, maxChars - 1)).trimEnd();
  return `${cut}…`;
}

function buildQrPayload(product: Product): string {
  const code = String(product.code ?? '').trim();
  const name = String(product.name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replaceAll('|', ' ');

  // QR compacto para etiquetas pequeñas: CODE|NAME_TRUNC
  return `${code}|${truncateWithEllipsis(name, 60)}`;
}

function tt(t: (k: string) => string, key: string, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

function hashStringToBase36(input: string): string {
  // djb2
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // unsigned
  return (hash >>> 0).toString(36);
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
  scale: number = 1,
): Promise<Blob> {
  const scaledW = Math.max(1, Math.round(widthPx * scale));
  const scaledH = Math.max(1, Math.round(heightPx * scale));

  const svgForRender =
    scale === 1
      ? svg
      : svg.replace(
          `width="${widthPx}" height="${heightPx}"`,
          `width="${scaledW}" height="${scaledH}"`,
        );

  const svgBlob = new Blob([svgForRender], { type: 'image/svg+xml;charset=utf-8' });
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
    canvas.width = scaledW;
    canvas.height = scaledH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener contexto de canvas');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, scaledW, scaledH);
    ctx.drawImage(img, 0, 0, scaledW, scaledH);

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

export function LabelsQrPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { getAll } = useProducts();

  const qrRepo = React.useMemo(() => new SupabaseProductQrRepository(), []);
  const labelRepo = React.useMemo(() => new SupabaseProductLabelRepository(), []);
  const didWarnLabelsBackendRef = React.useRef(false);

  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [assetsByProductId, setAssetsByProductId] = React.useState<
    Map<string, ProductQrAsset>
  >(() => new Map());
  const [labelAssetsByProductId, setLabelAssetsByProductId] = React.useState<
    Map<string, ProductLabelAsset>
  >(() => new Map());

  const [search, setSearch] = React.useState('');
  const [qrFilter, setQrFilter] = React.useState<StatusFilter>('all');
  const [labelFilter, setLabelFilter] = React.useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selectedProduct = React.useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  );

  // Reset etiqueta UI al cambiar de producto seleccionado
  React.useEffect(() => {
    setLabelEnabled(!!(selectedId && labelAssetsByProductId.has(selectedId)));
    setLabelPreviewOpen(true);
    setLabelDialogOpen(false);
    setLabelDialogConfig(null);
    setLabelDialogQrDataUrl(null);
  }, [selectedId, labelAssetsByProductId]);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [bulkZipMode, setBulkZipMode] = React.useState<BulkZipMode>('both');
  const [bulkDownloading, setBulkDownloading] = React.useState(false);
  const [bulkProgress, setBulkProgress] = React.useState<{
    done: number;
    total: number;
  } | null>(null);
  const [bulkZipDialogOpen, setBulkZipDialogOpen] = React.useState(false);
  const [bulkLabelConfig, setBulkLabelConfig] = React.useState<LabelConfig | null>(null);
  const [bulkLabelQuality, setBulkLabelQuality] = React.useState<PngQuality>('auto');
  const [bulkPreviewQrDataUrl, setBulkPreviewQrDataUrl] = React.useState<string | null>(
    null,
  );

  const [qrPreviewUrl, setQrPreviewUrl] = React.useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = React.useState(false);
  const [confirmReplaceQrOpen, setConfirmReplaceQrOpen] = React.useState(false);

  const [labelQrDataUrl, setLabelQrDataUrl] = React.useState<string | null>(null);

  const [productLocations, setProductLocations] = React.useState<ProductLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = React.useState<string>('legacy');

  const [labelConfig, setLabelConfig] = React.useState<LabelConfig>({
    widthMm: 35,
    heightMm: 15,
    dpi: 203,
    showQr: true,
    showCode: true,
    showBarcode: false,
    showName: true,
    showWarehouse: false,
    showLocation: false,
    qrSizeMm: 13,
    paddingMm: 0.7,
    codeFontPx: 13,
    barcodeFontPx: 11,
    locationFontPx: 10,
    warehouseFontPx: 10,
    nameFontPx: 10,
    nameMaxLines: 2,
    barcodeBold: false,
    locationBold: false,
    warehouseBold: false,
    nameBold: false,
    offsetsMm: {
      qr: { x: 0, y: 0 },
      code: { x: -0.5, y: 2 },
      barcode: { x: 0, y: 0 },
      location: { x: 0, y: 0 },
      warehouse: { x: 0, y: 0 },
      name: { x: -0.5, y: -4 },
    },
  });

  const labelRef = React.useRef<HTMLDivElement>(null);

  const [labelQuality, setLabelQuality] = React.useState<PngQuality>('auto');
  const [labelEnabled, setLabelEnabled] = React.useState(false);
  const [labelPreviewOpen, setLabelPreviewOpen] = React.useState(true);
  const [labelDialogOpen, setLabelDialogOpen] = React.useState(false);
  const [labelDialogConfig, setLabelDialogConfig] = React.useState<LabelConfig | null>(
    null,
  );
  const [labelDialogQuality, setLabelDialogQuality] = React.useState<PngQuality>('auto');
  const [labelDialogQrDataUrl, setLabelDialogQrDataUrl] = React.useState<string | null>(
    null,
  );

  const bulkPreviewProduct = React.useMemo(() => {
    if (selectedProduct && selectedIds.has(selectedProduct.id)) return selectedProduct;
    return products.find((p) => selectedIds.has(p.id)) ?? null;
  }, [products, selectedIds, selectedProduct]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!bulkZipDialogOpen) {
        setBulkPreviewQrDataUrl(null);
        return;
      }
      if (bulkZipMode !== 'labels' && bulkZipMode !== 'both') {
        setBulkPreviewQrDataUrl(null);
        return;
      }
      if (!bulkPreviewProduct) {
        setBulkPreviewQrDataUrl(null);
        return;
      }
      try {
        const scale = qualityScale(bulkLabelQuality, bulkLabelConfig?.dpi ?? 203);
        const url = await QRCode.toDataURL(buildQrPayload(bulkPreviewProduct), {
          type: 'image/png',
          width: 512 * scale,
          margin: 4,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        if (!cancelled) setBulkPreviewQrDataUrl(url);
      } catch {
        if (!cancelled) setBulkPreviewQrDataUrl(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    bulkZipDialogOpen,
    bulkZipMode,
    bulkPreviewProduct,
    bulkPreviewProduct?.id,
    bulkPreviewProduct?.code,
    bulkPreviewProduct?.name,
    bulkLabelQuality,
    bulkLabelConfig?.dpi,
  ]);

  // QR dataURL para el preview dentro del diálogo de etiqueta (individual)
  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!labelDialogOpen) {
        setLabelDialogQrDataUrl(null);
        return;
      }
      const cfg = labelDialogConfig ?? labelConfig;
      if (!selectedProduct || !cfg.showQr) {
        setLabelDialogQrDataUrl(null);
        return;
      }

      try {
        const scale = qualityScale(labelDialogQuality, cfg.dpi);
        const url = await QRCode.toDataURL(buildQrPayload(selectedProduct), {
          type: 'image/png',
          width: 512 * scale,
          margin: 4,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        if (!cancelled) setLabelDialogQrDataUrl(url);
      } catch {
        if (!cancelled) setLabelDialogQrDataUrl(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    labelDialogOpen,
    labelDialogQuality,
    labelDialogConfig,
    labelDialogConfig?.dpi,
    labelDialogConfig?.showQr,
    selectedProduct,
    selectedProduct?.id,
    selectedProduct?.code,
    selectedProduct?.name,
    labelConfig,
    labelConfig.dpi,
    labelConfig.showQr,
  ]);

  const selectedAsset = selectedProduct
    ? (assetsByProductId.get(selectedProduct.id) ?? null)
    : null;

  const cycleStatusFilter = React.useCallback((cur: StatusFilter): StatusFilter => {
    if (cur === 'all') return 'ok';
    if (cur === 'ok') return 'no';
    return 'all';
  }, []);

  const statusFilterIcon = React.useCallback((cur: StatusFilter) => {
    if (cur === 'ok') return ArrowUp;
    if (cur === 'no') return ArrowDown;
    return ArrowUpDown;
  }, []);

  const statusFilterTitle = React.useCallback(
    (kind: 'qr' | 'label', cur: StatusFilter) => {
      const base =
        kind === 'qr'
          ? tt(t, 'labelsQr.table.filter.qr', 'Filtrar QR')
          : tt(t, 'labelsQr.table.filter.label', 'Filtrar etiqueta');
      const mode =
        cur === 'ok'
          ? tt(t, 'labelsQr.table.filter.mode.ok', 'Solo OK')
          : cur === 'no'
            ? tt(t, 'labelsQr.table.filter.mode.no', 'Solo No')
            : tt(t, 'labelsQr.table.filter.mode.all', 'Todos');
      return `${base}: ${mode}`;
    },
    [t],
  );

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const byTerm = !term
      ? products
      : products.filter((p) => {
          return (
            p.code.toLowerCase().includes(term) ||
            p.name.toLowerCase().includes(term) ||
            (p.barcode ?? '').toLowerCase().includes(term)
          );
        });

    const byQr =
      qrFilter === 'all'
        ? byTerm
        : byTerm.filter((p) =>
            qrFilter === 'ok'
              ? assetsByProductId.has(p.id)
              : !assetsByProductId.has(p.id),
          );

    const byLabel =
      labelFilter === 'all'
        ? byQr
        : byQr.filter((p) =>
            labelFilter === 'ok'
              ? labelAssetsByProductId.has(p.id)
              : !labelAssetsByProductId.has(p.id),
          );

    return byLabel;
  }, [
    assetsByProductId,
    labelAssetsByProductId,
    labelFilter,
    products,
    qrFilter,
    search,
  ]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAll({ includeInactive: false });
      setProducts(all);
      const ids = all.map((p) => p.id);
      const assets = await qrRepo.getByProductIds(ids);
      setAssetsByProductId(new Map(assets.map((a) => [a.productId, a])));
      try {
        const labelAssets = await labelRepo.getLatestByProductIds(ids);
        setLabelAssetsByProductId(new Map(labelAssets.map((a) => [a.productId, a])));
      } catch (err) {
        // Si la migración/bucket de etiquetas aún no está aplicada, no rompemos la página.
        setLabelAssetsByProductId(new Map());
        if (!didWarnLabelsBackendRef.current) {
          didWarnLabelsBackendRef.current = true;
          toast.error(
            tt(t, 'labelsQr.toast.label.title', 'Etiqueta'),
            tt(
              t,
              'labelsQr.toast.label.backendMissing',
              'No se pudieron cargar las etiquetas (falta migración/bucket de Supabase).',
            ),
          );
        }
        // eslint-disable-next-line no-console
        console.warn('[LabelsQrPage] No se pudieron cargar assets de etiquetas:', err);
      }
    } catch (err) {
      toast.error(
        'Error',
        err instanceof Error ? err.message : 'No se pudieron cargar los datos',
      );
    } finally {
      setLoading(false);
    }
  }, [getAll, qrRepo, labelRepo, toast, t]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    setQrPreviewUrl(null);
  }, [selectedProduct?.id]);

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
      if (!selectedProduct || !labelConfig.showQr) {
        setLabelQrDataUrl(null);
        return;
      }

      try {
        const scale = qualityScale(labelQuality, labelConfig.dpi);
        const dataUrl = await QRCode.toDataURL(buildQrPayload(selectedProduct), {
          type: 'image/png',
          width: 512 * scale,
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
  }, [
    selectedProduct,
    selectedProduct?.id,
    selectedProduct?.code,
    selectedProduct?.name,
    labelQuality,
    labelConfig.dpi,
    labelConfig.showQr,
  ]);

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
    // QR dual: dentro de la app se busca por CODE; fuera se muestra CODE|NOMBRE…

    // Confirmación si ya existe asset
    if (selectedAsset) {
      setConfirmReplaceQrOpen(true);
      return;
    }

    await doGenerateQr();
  };

  const doGenerateQr = async () => {
    if (!selectedProduct) return;
    const qrContent = buildQrPayload(selectedProduct);
    const prevPath = selectedAsset?.qrPath ?? null;

    setGeneratingQr(true);
    try {
      const pngBlob = await QrCodeService.generateQrPngBlob(qrContent, { sizePx: 1024 });
      const qrPath = await uploadProductQr({
        productId: selectedProduct.id,
        barcode: qrContent,
        pngBlob,
      });
      const asset = await qrRepo.upsert({
        productId: selectedProduct.id,
        barcode: qrContent,
        qrPath,
      });

      // Si el QR anterior tenía un path distinto, borrar el archivo viejo (como hacemos con las etiquetas).
      if (prevPath && prevPath !== qrPath) {
        try {
          await deleteProductQr(prevPath);
        } catch (err) {
          // No crítico si falla el borrado (puede que ya no exista)
          // eslint-disable-next-line no-console
          console.warn('[LabelsQrPage] No se pudo borrar QR anterior:', err);
        }
      }

      setAssetsByProductId((prev) => {
        const next = new Map(prev);
        next.set(asset.productId, asset);
        return next;
      });
      toast.success(
        tt(t, 'labelsQr.toast.qr.title', 'QR'),
        tt(t, 'labelsQr.toast.qr.generated', 'QR generado correctamente.'),
      );
      // refrescar preview
      const signed = await createProductQrSignedUrl(qrPath, 60 * 10);
      setQrPreviewUrl(signed);
    } catch (err) {
      toast.error(
        tt(t, 'labelsQr.toast.qr.title', 'QR'),
        err instanceof Error
          ? err.message
          : tt(t, 'labelsQr.toast.qr.generateError', 'Error generando QR'),
      );
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
      toast.error(
        tt(t, 'labelsQr.toast.qr.title', 'QR'),
        err instanceof Error
          ? err.message
          : tt(t, 'labelsQr.toast.qr.downloadError', 'Error descargando QR'),
      );
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
      toast.success(
        tt(t, 'labelsQr.toast.qr.title', 'QR'),
        tt(t, 'labelsQr.toast.qr.deleted', 'QR eliminado.'),
      );
    } catch (err) {
      toast.error(
        tt(t, 'labelsQr.toast.qr.title', 'QR'),
        err instanceof Error
          ? err.message
          : tt(t, 'labelsQr.toast.qr.deleteError', 'Error eliminando QR'),
      );
    }
  };

  const handleDownloadLabelPng = async () => {
    if (!selectedProduct) return;
    if (!labelRef.current) return;

    try {
      const scale = qualityScale(labelQuality, labelConfig.dpi);
      const dataUrl = await toPng(labelRef.current, {
        cacheBust: true,
        pixelRatio: scale,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Guardar etiqueta en Storage/DB (best-effort)
      try {
        // Borrar etiqueta anterior si existe
        const existingLabel = labelAssetsByProductId.get(selectedProduct.id);
        if (existingLabel?.labelPath) {
          try {
            await deleteProductLabel(existingLabel.labelPath);
          } catch (err) {
            // No crítico si falla el borrado (puede que ya no exista)
            // eslint-disable-next-line no-console
            console.warn('[LabelsQrPage] No se pudo borrar etiqueta anterior:', err);
          }
        }

        const locKey =
          selectedLocation?.id ??
          `legacy:${selectedProduct.aisle ?? ''}-${selectedProduct.shelf ?? ''}:${selectedProduct.warehouse ?? ''}`;
        const configJson = {
          cfg: labelConfig,
          locationId: selectedLocation?.id ?? null,
          locationKey: locKey,
        } as const;
        const configHash = hashStringToBase36(stableStringify(configJson));
        const labelPath = await uploadProductLabel({
          productId: selectedProduct.id,
          configHash,
          pngBlob: blob,
        });
        const asset = await labelRepo.upsert({
          productId: selectedProduct.id,
          labelPath,
          configHash,
          configJson: configJson as unknown as Record<string, unknown>,
        });
        setLabelAssetsByProductId((prev) => {
          const next = new Map(prev);
          next.set(selectedProduct.id, asset);
          return next;
        });
      } catch (err) {
        toast.error(
          tt(t, 'labelsQr.toast.label.title', 'Etiqueta'),
          tt(
            t,
            'labelsQr.toast.label.saveError',
            'No se pudo guardar en Supabase: {{error}}',
          ).replace('{{error}}', err instanceof Error ? err.message : 'sin detalle'),
        );
        // eslint-disable-next-line no-console
        console.warn('[LabelsQrPage] No se pudo guardar etiqueta en Storage/DB:', err);
      }

      downloadBlob(blob, withEtPrefix(selectedProduct.code));
    } catch (err) {
      toast.error(
        tt(t, 'labelsQr.toast.label.title', 'Etiqueta'),
        err instanceof Error
          ? err.message
          : tt(t, 'labelsQr.toast.label.generateError', 'Error generando PNG'),
      );
    }
  };

  const labelWidthPx = mmToPx(labelConfig.widthMm, labelConfig.dpi);
  const labelHeightPx = mmToPx(labelConfig.heightMm, labelConfig.dpi);
  const qrSizePx = mmToPx(labelConfig.qrSizeMm, labelConfig.dpi);
  const paddingPx = mmToPx(labelConfig.paddingMm, labelConfig.dpi);
  const pxOff = React.useCallback(
    (mm: number) => mmToPx(mm, labelConfig.dpi),
    [labelConfig.dpi],
  );

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
              setBulkLabelQuality(labelQuality);
              setBulkZipDialogOpen(true);
            }}
            disabled={selectedIds.size === 0 || bulkDownloading}
          >
            {bulkDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tt(t, 'labelsQr.zip.generating', 'Generando ZIP…')}
                {bulkProgress ? (
                  <span className="ml-2 text-xs text-gray-600 dark:text-gray-300">
                    {bulkProgress.done}/{bulkProgress.total}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <FileArchive className="mr-2 h-4 w-4" />
                {tt(t, 'labelsQr.zip.download', 'Descargar ZIP')} ({selectedIds.size})
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog
        isOpen={bulkZipDialogOpen}
        onClose={() => setBulkZipDialogOpen(false)}
        title={tt(t, 'labelsQr.zipDialog.title', 'Descarga masiva (ZIP)')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
              {tt(t, 'labelsQr.zipDialog.section.content', 'Contenido del ZIP')}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-200">
                {tt(t, 'labelsQr.zipDialog.include', 'Incluir:')}
              </label>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                value={bulkZipMode}
                onChange={(e) => setBulkZipMode(e.target.value as BulkZipMode)}
              >
                <option value="qr">{tt(t, 'labelsQr.zip.mode.qr', 'QR')}</option>
                <option value="labels">
                  {tt(t, 'labelsQr.zip.mode.labels', 'Etiquetas')}
                </option>
                <option value="both">{tt(t, 'labelsQr.zip.mode.both', 'Ambos')}</option>
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {tt(t, 'labelsQr.zipDialog.filesHint', 'Archivos:')} QR ={' '}
                <code>QR-CODIGO.png</code>,{' '}
                {tt(t, 'labelsQr.zipDialog.filesHint.label', 'Etiqueta')} ={' '}
                <code>ET-CODIGO.png</code>
              </span>
            </div>
          </div>

          {(bulkZipMode === 'labels' || bulkZipMode === 'both') && bulkLabelConfig && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-50">
                {tt(
                  t,
                  'labelsQr.zipDialog.section.labelsConfig',
                  'Configuración de etiquetas (aplica al ZIP)',
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    {tt(t, 'labelsQr.label.widthMm', 'Ancho (mm)')}
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
                    {tt(t, 'labelsQr.label.heightMm', 'Alto (mm)')}
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
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    {tt(t, 'labelsQr.label.dpi', 'DPI')}
                  </label>
                  <select
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    value={bulkLabelConfig.dpi}
                    onChange={(e) =>
                      setBulkLabelConfig((p) =>
                        p ? { ...p, dpi: Number(e.target.value) as 203 | 300 | 600 } : p,
                      )
                    }
                  >
                    <option value={203}>203</option>
                    <option value={300}>300</option>
                    <option value={600}>600</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    {tt(t, 'labelsQr.label.qrMm', 'QR (mm)')}
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
                    ['showQr', tt(t, 'labelsQr.toggles.qr', 'QR')],
                    ['showCode', tt(t, 'labelsQr.toggles.code', 'Código')],
                    ['showBarcode', tt(t, 'labelsQr.toggles.barcode', 'Barcode')],
                    ['showName', tt(t, 'labelsQr.toggles.name', 'Nombre')],
                    ['showLocation', tt(t, 'labelsQr.toggles.location', 'Ubicación')],
                    ['showWarehouse', tt(t, 'labelsQr.toggles.warehouse', 'Almacén')],
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

              {/* Tipografía (aplica al ZIP) */}
              {(bulkLabelConfig.showCode ||
                bulkLabelConfig.showBarcode ||
                bulkLabelConfig.showLocation ||
                bulkLabelConfig.showWarehouse ||
                bulkLabelConfig.showName) && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {tt(t, 'labelsQr.typography.title', 'Tipografía')}
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    {bulkLabelConfig.showCode && (
                      <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                        <div className="text-gray-700 dark:text-gray-200">
                          {tt(t, 'labelsQr.typography.code', 'Código')}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                          </label>
                          <Input
                            type="number"
                            min={8}
                            step={1}
                            value={bulkLabelConfig.codeFontPx}
                            onChange={(e) =>
                              setBulkLabelConfig((p) =>
                                p ? { ...p, codeFontPx: Number(e.target.value) } : p,
                              )
                            }
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {tt(t, 'labelsQr.typography.bold', 'Negrita')}: ✓
                        </div>
                      </div>
                    )}

                    {bulkLabelConfig.showBarcode && (
                      <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                        <div className="text-gray-700 dark:text-gray-200">
                          {tt(t, 'labelsQr.typography.barcode', 'Barcode')}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                          </label>
                          <Input
                            type="number"
                            min={8}
                            step={1}
                            value={bulkLabelConfig.barcodeFontPx}
                            onChange={(e) =>
                              setBulkLabelConfig((p) =>
                                p ? { ...p, barcodeFontPx: Number(e.target.value) } : p,
                              )
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={bulkLabelConfig.barcodeBold}
                            onChange={(e) =>
                              setBulkLabelConfig((p) =>
                                p ? { ...p, barcodeBold: e.target.checked } : p,
                              )
                            }
                          />
                          {tt(t, 'labelsQr.typography.bold', 'Negrita')}
                        </label>
                      </div>
                    )}

                    {bulkLabelConfig.showLocation && (
                      <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                        <div className="text-gray-700 dark:text-gray-200">
                          {tt(t, 'labelsQr.typography.location', 'Ubicación')}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                          </label>
                          <Input
                            type="number"
                            min={8}
                            step={1}
                            value={bulkLabelConfig.locationFontPx}
                            onChange={(e) =>
                              setBulkLabelConfig((p) =>
                                p ? { ...p, locationFontPx: Number(e.target.value) } : p,
                              )
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={bulkLabelConfig.locationBold}
                            onChange={(e) =>
                              setBulkLabelConfig((p) =>
                                p ? { ...p, locationBold: e.target.checked } : p,
                              )
                            }
                          />
                          {tt(t, 'labelsQr.typography.bold', 'Negrita')}
                        </label>
                      </div>
                    )}

                    {bulkLabelConfig.showWarehouse && (
                      <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                        <div className="text-gray-700 dark:text-gray-200">
                          {tt(t, 'labelsQr.typography.warehouse', 'Almacén')}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                          </label>
                          <Input
                            type="number"
                            min={8}
                            step={1}
                            value={bulkLabelConfig.warehouseFontPx}
                            onChange={(e) =>
                              setBulkLabelConfig((p) =>
                                p ? { ...p, warehouseFontPx: Number(e.target.value) } : p,
                              )
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={bulkLabelConfig.warehouseBold}
                            onChange={(e) =>
                              setBulkLabelConfig((p) =>
                                p ? { ...p, warehouseBold: e.target.checked } : p,
                              )
                            }
                          />
                          {tt(t, 'labelsQr.typography.bold', 'Negrita')}
                        </label>
                      </div>
                    )}

                    {bulkLabelConfig.showName && (
                      <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                        <div className="text-gray-700 dark:text-gray-200">
                          {tt(t, 'labelsQr.typography.name', 'Nombre')}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                          </label>
                          <Input
                            type="number"
                            min={8}
                            step={1}
                            value={bulkLabelConfig.nameFontPx}
                            onChange={(e) =>
                              setBulkLabelConfig((p) =>
                                p ? { ...p, nameFontPx: Number(e.target.value) } : p,
                              )
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={bulkLabelConfig.nameBold}
                            onChange={(e) =>
                              setBulkLabelConfig((p) =>
                                p ? { ...p, nameBold: e.target.checked } : p,
                              )
                            }
                          />
                          {tt(t, 'labelsQr.typography.bold', 'Negrita')}
                        </label>
                      </div>
                    )}

                    {bulkLabelConfig.showName && (
                      <div className="grid grid-cols-[1fr,1fr] items-end gap-2">
                        <div className="text-gray-700 dark:text-gray-200">
                          {tt(t, 'labelsQr.typography.lines', 'Líneas')} (
                          {tt(t, 'labelsQr.typography.name', 'Nombre')})
                        </div>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          step={1}
                          value={bulkLabelConfig.nameMaxLines}
                          onChange={(e) =>
                            setBulkLabelConfig((p) =>
                              p ? { ...p, nameMaxLines: Number(e.target.value) } : p,
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(bulkLabelConfig.showQr ||
                bulkLabelConfig.showCode ||
                bulkLabelConfig.showBarcode ||
                bulkLabelConfig.showLocation ||
                bulkLabelConfig.showWarehouse ||
                bulkLabelConfig.showName) && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {tt(t, 'labelsQr.position.title', 'Posición (mm)')}
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    {(
                      [
                        ['qr', tt(t, 'labelsQr.toggles.qr', 'QR')],
                        ['code', tt(t, 'labelsQr.toggles.code', 'Código')],
                        ['barcode', tt(t, 'labelsQr.toggles.barcode', 'Barcode')],
                        ['location', tt(t, 'labelsQr.toggles.location', 'Ubicación')],
                        ['warehouse', tt(t, 'labelsQr.toggles.warehouse', 'Almacén')],
                        ['name', tt(t, 'labelsQr.toggles.name', 'Nombre')],
                      ] as const
                    )
                      .filter(([key]) => {
                        if (key === 'qr') return bulkLabelConfig.showQr;
                        if (key === 'code') return bulkLabelConfig.showCode;
                        if (key === 'barcode') return bulkLabelConfig.showBarcode;
                        if (key === 'location') return bulkLabelConfig.showLocation;
                        if (key === 'warehouse') return bulkLabelConfig.showWarehouse;
                        if (key === 'name') return bulkLabelConfig.showName;
                        return false;
                      })
                      .map(([key, label]) => (
                        <div
                          key={key}
                          className="grid grid-cols-[1fr,1fr,1fr] items-center gap-2"
                        >
                          <div className="text-gray-700 dark:text-gray-200">{label}</div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">
                              {tt(t, 'labelsQr.position.x', 'X')}
                            </label>
                            <Input
                              type="number"
                              step={0.5}
                              value={bulkLabelConfig.offsetsMm[key].x}
                              onChange={(e) =>
                                setBulkLabelConfig((p) =>
                                  p
                                    ? {
                                        ...p,
                                        offsetsMm: {
                                          ...p.offsetsMm,
                                          [key]: {
                                            ...p.offsetsMm[key],
                                            x: Number(e.target.value),
                                          },
                                        },
                                      }
                                    : p,
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">
                              {tt(t, 'labelsQr.position.y', 'Y')}
                            </label>
                            <Input
                              type="number"
                              step={0.5}
                              value={bulkLabelConfig.offsetsMm[key].y}
                              onChange={(e) =>
                                setBulkLabelConfig((p) =>
                                  p
                                    ? {
                                        ...p,
                                        offsetsMm: {
                                          ...p.offsetsMm,
                                          [key]: {
                                            ...p.offsetsMm[key],
                                            y: Number(e.target.value),
                                          },
                                        },
                                      }
                                    : p,
                                )
                              }
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    {tt(t, 'labelsQr.quality.label', 'Calidad PNG')}
                  </label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    value={bulkLabelQuality}
                    onChange={(e) => setBulkLabelQuality(e.target.value as PngQuality)}
                  >
                    <option value="auto">
                      {tt(t, 'labelsQr.quality.auto', 'Auto (recomendado)')}
                    </option>
                    <option value="default">
                      {tt(t, 'labelsQr.quality.default', 'Por defecto (x1)')}
                    </option>
                    <option value="better">
                      {tt(t, 'labelsQr.quality.better', 'Mejor calidad (x2)')}
                    </option>
                    <option value="max">
                      {tt(t, 'labelsQr.quality.max', 'Máxima calidad (x3)')}
                    </option>
                  </select>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <div className="mt-6">
                    {tt(
                      t,
                      'labelsQr.quality.hint',
                      'Afecta a la resolución del PNG (recomendado para impresión).',
                    )}
                  </div>
                </div>
              </div>

              {bulkPreviewProduct && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                  <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    {tt(t, 'labelsQr.label.preview', 'Preview')} (
                    {bulkLabelConfig.widthMm}×{bulkLabelConfig.heightMm}mm @{' '}
                    {bulkLabelConfig.dpi}dpi)
                  </div>
                  <div className="overflow-auto">
                    {(() => {
                      const widthPx = mmToPx(
                        bulkLabelConfig.widthMm,
                        bulkLabelConfig.dpi,
                      );
                      const heightPx = mmToPx(
                        bulkLabelConfig.heightMm,
                        bulkLabelConfig.dpi,
                      );
                      const qrSizePx = mmToPx(
                        bulkLabelConfig.qrSizeMm,
                        bulkLabelConfig.dpi,
                      );
                      const paddingPx = mmToPx(
                        bulkLabelConfig.paddingMm,
                        bulkLabelConfig.dpi,
                      );

                      return (
                        <div
                          style={{
                            width: `${widthPx}px`,
                            height: `${heightPx}px`,
                            background: '#ffffff',
                            color: '#000000',
                            position: 'relative',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                          }}
                        >
                          {bulkLabelConfig.showQr &&
                            (bulkPreviewProduct.barcode ?? '').trim() && (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${paddingPx + mmToPx(bulkLabelConfig.offsetsMm.qr.x, bulkLabelConfig.dpi)}px`,
                                  top: `${paddingPx + mmToPx(bulkLabelConfig.offsetsMm.qr.y, bulkLabelConfig.dpi)}px`,
                                  width: `${qrSizePx}px`,
                                  height: `${qrSizePx}px`,
                                  background: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {bulkPreviewQrDataUrl ? (
                                  <img
                                    src={bulkPreviewQrDataUrl}
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

                          {(() => {
                            const pxOff = (mm: number) => mmToPx(mm, bulkLabelConfig.dpi);
                            const rightX =
                              paddingPx +
                              (bulkLabelConfig.showQr ? qrSizePx + paddingPx : 0);
                            const lineH = Math.max(10, bulkLabelConfig.nameFontPx);

                            const xCode =
                              rightX + pxOff(bulkLabelConfig.offsetsMm.code.x);
                            const yCode =
                              paddingPx + pxOff(bulkLabelConfig.offsetsMm.code.y);

                            const xBarcode =
                              rightX + pxOff(bulkLabelConfig.offsetsMm.barcode.x);
                            const yBarcode =
                              paddingPx +
                              bulkLabelConfig.codeFontPx +
                              2 +
                              pxOff(bulkLabelConfig.offsetsMm.barcode.y);

                            const xLocation =
                              rightX + pxOff(bulkLabelConfig.offsetsMm.location.x);
                            const yLocation =
                              paddingPx +
                              bulkLabelConfig.codeFontPx +
                              2 +
                              lineH +
                              pxOff(bulkLabelConfig.offsetsMm.location.y);

                            const xWarehouse =
                              rightX + pxOff(bulkLabelConfig.offsetsMm.warehouse.x);
                            const yWarehouse =
                              paddingPx +
                              bulkLabelConfig.codeFontPx +
                              2 +
                              lineH +
                              lineH +
                              pxOff(bulkLabelConfig.offsetsMm.warehouse.y);

                            const xName =
                              rightX + pxOff(bulkLabelConfig.offsetsMm.name.x);
                            const yName =
                              heightPx -
                              paddingPx -
                              bulkLabelConfig.nameFontPx +
                              pxOff(bulkLabelConfig.offsetsMm.name.y);

                            return (
                              <>
                                {bulkLabelConfig.showCode && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xCode}px`,
                                      top: `${yCode}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: bulkLabelConfig.codeFontPx,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {bulkPreviewProduct.code}
                                  </div>
                                )}

                                {bulkLabelConfig.showBarcode && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xBarcode}px`,
                                      top: `${yBarcode}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: bulkLabelConfig.barcodeFontPx,
                                      fontWeight: bulkLabelConfig.barcodeBold ? 700 : 400,
                                    }}
                                  >
                                    {bulkPreviewProduct.barcode ?? ''}
                                  </div>
                                )}

                                {bulkLabelConfig.showLocation && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xLocation}px`,
                                      top: `${yLocation}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: bulkLabelConfig.locationFontPx,
                                      fontWeight: bulkLabelConfig.locationBold
                                        ? 700
                                        : 400,
                                    }}
                                  >
                                    {bulkPreviewProduct.aisle}-{bulkPreviewProduct.shelf}
                                  </div>
                                )}

                                {bulkLabelConfig.showWarehouse &&
                                  bulkPreviewProduct.warehouse && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: `${xWarehouse}px`,
                                        top: `${yWarehouse}px`,
                                        right: `${paddingPx}px`,
                                        fontSize: bulkLabelConfig.warehouseFontPx,
                                        fontWeight: bulkLabelConfig.warehouseBold
                                          ? 700
                                          : 400,
                                      }}
                                    >
                                      {bulkPreviewProduct.warehouse}
                                    </div>
                                  )}

                                {bulkLabelConfig.showName && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xName}px`,
                                      top: `${yName}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: bulkLabelConfig.nameFontPx,
                                      fontWeight: bulkLabelConfig.nameBold ? 700 : 600,
                                      lineHeight: `${bulkLabelConfig.nameFontPx + 2}px`,
                                      overflow: 'hidden',
                                      display: '-webkit-box',
                                      WebkitBoxOrient: 'vertical',
                                      WebkitLineClamp: bulkLabelConfig.nameMaxLines,
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {bulkPreviewProduct.name}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkZipDialogOpen(false)}>
              {tt(t, 'common.cancel', 'Cancelar')}
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
                  const labelScale = qualityScale(bulkLabelQuality, labelCfg.dpi);

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
                        qrBlob = await QrCodeService.generateQrPngBlob(
                          buildQrPayload(p),
                          {
                            sizePx: 1024,
                          },
                        );
                      }

                      folderQr?.file(withQrPrefix(p.code), qrBlob);
                    }

                    // Etiquetas
                    if (needLabels) {
                      let qrDataUrl: string | null = null;

                      if (labelCfg.showQr) {
                        const payload = buildQrPayload(p);
                        if (barcodeQrCache.has(payload)) {
                          qrDataUrl = barcodeQrCache.get(payload)!;
                        } else {
                          qrDataUrl = await QRCode.toDataURL(payload, {
                            type: 'image/png',
                            width: 512 * labelScale,
                            margin: 4,
                            errorCorrectionLevel: 'M',
                            color: { dark: '#000000', light: '#FFFFFF' },
                          });
                          barcodeQrCache.set(payload, qrDataUrl);
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
                      const labelBlob = await svgToPngBlob(
                        svg,
                        widthPx,
                        heightPx,
                        labelScale,
                      );
                      folderLabels?.file(withEtPrefix(p.code), labelBlob);

                      // Guardar etiqueta en Storage/DB (best-effort)
                      try {
                        // Borrar etiqueta anterior si existe
                        const existingLabel = labelAssetsByProductId.get(p.id);
                        if (existingLabel?.labelPath) {
                          try {
                            await deleteProductLabel(existingLabel.labelPath);
                          } catch {
                            // No crítico si falla el borrado
                          }
                        }

                        const locKey =
                          loc?.id ??
                          `legacy:${labelProduct.aisle ?? ''}-${labelProduct.shelf ?? ''}:${labelProduct.warehouse ?? ''}`;
                        const configJson = {
                          cfg: labelCfg,
                          locationId: loc?.id ?? null,
                          locationKey: locKey,
                        } as const;
                        const configHash = hashStringToBase36(
                          stableStringify(configJson),
                        );
                        const labelPath = await uploadProductLabel({
                          productId: p.id,
                          configHash,
                          pngBlob: labelBlob,
                        });
                        const asset = await labelRepo.upsert({
                          productId: p.id,
                          labelPath,
                          configHash,
                          configJson: configJson as unknown as Record<string, unknown>,
                        });
                        setLabelAssetsByProductId((prev) => {
                          const next = new Map(prev);
                          next.set(p.id, asset);
                          return next;
                        });
                      } catch {
                        // no-op: no rompemos el ZIP
                      }
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
              {tt(t, 'labelsQr.zip.download', 'Descargar ZIP')}
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
                <h2 className="font-semibold">
                  {tt(t, 'labelsQr.products.title', 'Productos')}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({filtered.length})
                </span>
              </div>
              <div className="w-full sm:w-96">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder={tt(
                    t,
                    'labelsQr.products.searchPlaceholder',
                    'Buscar por código, nombre o barcode…',
                  )}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-600 dark:text-gray-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {tt(t, 'labelsQr.loading', 'Cargando…')}
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
                      <th className="py-2 pr-4">
                        {tt(t, 'labelsQr.table.code', 'Código')}
                      </th>
                      <th className="py-2 pr-4">
                        {tt(t, 'labelsQr.table.name', 'Nombre')}
                      </th>
                      <th className="py-2 pr-4">
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 font-normal',
                            qrFilter !== 'all' &&
                              'rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200',
                          )}
                          onClick={() => setQrFilter((cur) => cycleStatusFilter(cur))}
                          title={statusFilterTitle('qr', qrFilter)}
                        >
                          {tt(t, 'labelsQr.table.qr', 'QR')}
                          {(() => {
                            const Icon = statusFilterIcon(qrFilter);
                            return <Icon className="h-3.5 w-3.5 opacity-80" />;
                          })()}
                        </button>
                      </th>
                      <th className="py-2 pr-4">
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 font-normal',
                            labelFilter !== 'all' &&
                              'rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200',
                          )}
                          onClick={() => setLabelFilter((cur) => cycleStatusFilter(cur))}
                          title={statusFilterTitle('label', labelFilter)}
                        >
                          {tt(t, 'labelsQr.table.label', 'Etiqueta')}
                          {(() => {
                            const Icon = statusFilterIcon(labelFilter);
                            return <Icon className="h-3.5 w-3.5 opacity-80" />;
                          })()}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const asset = assetsByProductId.get(p.id);
                      const hasQr = !!asset;
                      const labelAsset = labelAssetsByProductId.get(p.id);
                      const hasLabel = !!labelAsset;
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
                          <td className="py-2 pr-4">
                            {hasQr ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                {tt(t, 'labelsQr.products.qrStatus.ok', 'OK')}
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                {tt(t, 'labelsQr.products.qrStatus.no', 'No')}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {hasLabel ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                {tt(t, 'labelsQr.products.labelStatus.ok', 'OK')}
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                {tt(t, 'labelsQr.products.labelStatus.no', 'No')}
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
            {/* QR */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-50">
                <QrCode className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h2 className="font-semibold">{tt(t, 'labelsQr.qr.title', 'QR')}</h2>
              </div>

              {!selectedProduct ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">—</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleGenerateQr}
                      disabled={generatingQr}
                    >
                      {generatingQr ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generando…
                        </>
                      ) : (
                        <>
                          <QrCode className="mr-2 h-4 w-4" />
                          {selectedAsset
                            ? tt(t, 'labelsQr.qr.replace', 'Reemplazar QR')
                            : tt(t, 'labelsQr.qr.generate', 'Generar QR')}
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleDownloadQr}
                      disabled={!selectedAsset || !selectedProduct}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {tt(t, 'labelsQr.qr.download', 'Descargar')}
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={handleDeleteQr}
                      disabled={!selectedAsset || generatingQr}
                    >
                      {tt(t, 'labelsQr.qr.delete', 'Eliminar')}
                    </Button>
                  </div>

                  {selectedAsset && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (qrPreviewUrl) {
                          setQrPreviewUrl(null);
                          return;
                        }
                        void loadQrPreview();
                      }}
                    >
                      {qrPreviewUrl
                        ? tt(t, 'labelsQr.qr.hidePreview', 'Ocultar vista previa')
                        : tt(t, 'labelsQr.qr.loadPreview', 'Cargar preview')}
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
                        {(() => {
                          const content = buildQrPayload(selectedProduct);
                          return tt(t, 'labelsQr.qr.content', 'Contenido QR: {{content}}')
                            .replace('{{content}}', content)
                            .replace('{{barcode}}', content);
                        })()}
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
                <h2 className="font-semibold">
                  {tt(t, 'labelsQr.label.title', 'Etiqueta')}
                </h2>
              </div>

              {!selectedProduct ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">—</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {!labelEnabled ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setLabelDialogConfig(labelConfig);
                          setLabelDialogQuality(labelQuality);
                          setLabelDialogOpen(true);
                        }}
                      >
                        <Tag className="mr-2 h-4 w-4" />
                        {tt(t, 'labelsQr.label.create', 'Crear etiqueta')}
                      </Button>
                    ) : (
                      <>
                        <Button onClick={handleDownloadLabelPng} variant="secondary">
                          <Download className="mr-2 h-4 w-4" />
                          {tt(t, 'labelsQr.label.downloadPng', 'Descargar etiqueta PNG')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setLabelDialogConfig(labelConfig);
                            setLabelDialogQuality(labelQuality);
                            setLabelDialogOpen(true);
                          }}
                        >
                          {tt(t, 'labelsQr.label.edit', 'Modificar')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setLabelPreviewOpen((p) => !p)}
                        >
                          {labelPreviewOpen
                            ? tt(t, 'labelsQr.label.hidePreview', 'Ocultar vista previa')
                            : tt(t, 'labelsQr.label.showPreview', 'Ver vista previa')}
                        </Button>
                      </>
                    )}
                  </div>

                  {labelEnabled && labelPreviewOpen && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                      <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                        {tt(t, 'labelsQr.label.preview', 'Preview')} (
                        {labelConfig.widthMm}×{labelConfig.heightMm}mm @ {labelConfig.dpi}
                        dpi)
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
                          {labelConfig.showQr && !!labelQrDataUrl && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${paddingPx + pxOff(labelConfig.offsetsMm.qr.x)}px`,
                                top: `${paddingPx + pxOff(labelConfig.offsetsMm.qr.y)}px`,
                                width: `${qrSizePx}px`,
                                height: `${qrSizePx}px`,
                                background: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <img
                                src={labelQrDataUrl}
                                alt="QR"
                                style={{ width: '100%', height: '100%' }}
                              />
                            </div>
                          )}

                          {(() => {
                            const rightX =
                              paddingPx + (labelConfig.showQr ? qrSizePx + paddingPx : 0);
                            const lineH = Math.max(10, labelConfig.nameFontPx);

                            const xCode = rightX + pxOff(labelConfig.offsetsMm.code.x);
                            const yCode = paddingPx + pxOff(labelConfig.offsetsMm.code.y);

                            const xBarcode =
                              rightX + pxOff(labelConfig.offsetsMm.barcode.x);
                            const yBarcode =
                              paddingPx +
                              labelConfig.codeFontPx +
                              2 +
                              pxOff(labelConfig.offsetsMm.barcode.y);

                            const xLocation =
                              rightX + pxOff(labelConfig.offsetsMm.location.x);
                            const yLocation =
                              paddingPx +
                              labelConfig.codeFontPx +
                              2 +
                              lineH +
                              pxOff(labelConfig.offsetsMm.location.y);

                            const xWarehouse =
                              rightX + pxOff(labelConfig.offsetsMm.warehouse.x);
                            const yWarehouse =
                              paddingPx +
                              labelConfig.codeFontPx +
                              2 +
                              lineH +
                              lineH +
                              pxOff(labelConfig.offsetsMm.warehouse.y);

                            const xName = rightX + pxOff(labelConfig.offsetsMm.name.x);
                            const yName =
                              labelHeightPx -
                              paddingPx -
                              labelConfig.nameFontPx +
                              pxOff(labelConfig.offsetsMm.name.y);

                            return (
                              <>
                                {labelConfig.showCode && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xCode}px`,
                                      top: `${yCode}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: labelConfig.codeFontPx,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {selectedProduct.code}
                                  </div>
                                )}

                                {labelConfig.showBarcode && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xBarcode}px`,
                                      top: `${yBarcode}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: labelConfig.barcodeFontPx,
                                      fontWeight: labelConfig.barcodeBold ? 700 : 400,
                                    }}
                                  >
                                    {selectedProduct.barcode ?? ''}
                                  </div>
                                )}

                                {labelConfig.showLocation && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xLocation}px`,
                                      top: `${yLocation}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: labelConfig.locationFontPx,
                                      fontWeight: labelConfig.locationBold ? 700 : 400,
                                    }}
                                  >
                                    {locationText}
                                  </div>
                                )}

                                {labelConfig.showWarehouse && warehouseText && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xWarehouse}px`,
                                      top: `${yWarehouse}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: labelConfig.warehouseFontPx,
                                      fontWeight: labelConfig.warehouseBold ? 700 : 400,
                                    }}
                                  >
                                    {warehouseText}
                                  </div>
                                )}

                                {labelConfig.showName && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xName}px`,
                                      top: `${yName}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: labelConfig.nameFontPx,
                                      fontWeight: labelConfig.nameBold ? 700 : 600,
                                      lineHeight: `${labelConfig.nameFontPx + 2}px`,
                                      overflow: 'hidden',
                                      display: '-webkit-box',
                                      WebkitBoxOrient: 'vertical',
                                      WebkitLineClamp: labelConfig.nameMaxLines,
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {selectedProduct.name}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
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
        title={tt(t, 'labelsQr.confirmReplaceQr.title', 'Reemplazar QR')}
        message={tt(
          t,
          'labelsQr.confirmReplaceQr.message',
          'Este producto ya tiene un QR generado. ¿Quieres reemplazarlo?',
        )}
        confirmText={tt(t, 'labelsQr.confirmReplaceQr.confirm', 'Reemplazar')}
        cancelText={tt(t, 'labelsQr.confirmReplaceQr.cancel', 'Cancelar')}
        variant="destructive"
      />

      {/* Diálogo de edición de etiqueta (individual) */}
      <Dialog
        isOpen={labelDialogOpen}
        onClose={() => setLabelDialogOpen(false)}
        title={tt(t, 'labelsQr.labelDialog.title', 'Configurar etiqueta')}
        size="lg"
      >
        <div className="space-y-4">
          {selectedProduct && (
            <>
              {productLocations.length > 1 && (
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    {tt(t, 'labelsQr.label.locationToPrint', 'Ubicación a imprimir')}
                  </label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    {productLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.warehouse}: {loc.aisle}-{loc.shelf}
                        {loc.isPrimary
                          ? tt(t, 'labelsQr.location.primarySuffix', ' (principal)')
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {tt(t, 'labelsQr.labelDialog.section.config', 'Configuración')}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      {tt(t, 'labelsQr.label.widthMm', 'Ancho (mm)')}
                    </label>
                    <Input
                      type="number"
                      min={10}
                      step={1}
                      value={(labelDialogConfig ?? labelConfig).widthMm}
                      onChange={(e) =>
                        setLabelDialogConfig((p) => ({
                          ...(p ?? labelConfig),
                          widthMm: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      {tt(t, 'labelsQr.label.heightMm', 'Alto (mm)')}
                    </label>
                    <Input
                      type="number"
                      min={10}
                      step={1}
                      value={(labelDialogConfig ?? labelConfig).heightMm}
                      onChange={(e) =>
                        setLabelDialogConfig((p) => ({
                          ...(p ?? labelConfig),
                          heightMm: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      {tt(t, 'labelsQr.label.dpi', 'DPI')}
                    </label>
                    <select
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      value={(labelDialogConfig ?? labelConfig).dpi}
                      onChange={(e) =>
                        setLabelDialogConfig((p) => ({
                          ...(p ?? labelConfig),
                          dpi: Number(e.target.value) as 203 | 300 | 600,
                        }))
                      }
                    >
                      <option value={203}>203</option>
                      <option value={300}>300</option>
                      <option value={600}>600</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      {tt(t, 'labelsQr.label.qrMm', 'QR (mm)')}
                    </label>
                    <Input
                      type="number"
                      min={6}
                      step={1}
                      value={(labelDialogConfig ?? labelConfig).qrSizeMm}
                      onChange={(e) =>
                        setLabelDialogConfig((p) => ({
                          ...(p ?? labelConfig),
                          qrSizeMm: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      {tt(t, 'labelsQr.quality.label', 'Calidad PNG')}
                    </label>
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      value={labelDialogQuality}
                      onChange={(e) =>
                        setLabelDialogQuality(e.target.value as PngQuality)
                      }
                    >
                      <option value="auto">
                        {tt(t, 'labelsQr.quality.auto', 'Auto (recomendado)')}
                      </option>
                      <option value="default">
                        {tt(t, 'labelsQr.quality.default', 'Por defecto (x1)')}
                      </option>
                      <option value="better">
                        {tt(t, 'labelsQr.quality.better', 'Mejor calidad (x2)')}
                      </option>
                      <option value="max">
                        {tt(t, 'labelsQr.quality.max', 'Máxima calidad (x3)')}
                      </option>
                    </select>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div className="mt-6">
                      {tt(
                        t,
                        'labelsQr.quality.hint',
                        'DPI define el tamaño/escala de la etiqueta. La calidad PNG aumenta la resolución del archivo (puede tardar más).',
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {(
                    [
                      ['showQr', tt(t, 'labelsQr.toggles.qr', 'QR')],
                      ['showCode', tt(t, 'labelsQr.toggles.code', 'Código')],
                      ['showBarcode', tt(t, 'labelsQr.toggles.barcode', 'Barcode')],
                      ['showName', tt(t, 'labelsQr.toggles.name', 'Nombre')],
                      ['showLocation', tt(t, 'labelsQr.toggles.location', 'Ubicación')],
                      ['showWarehouse', tt(t, 'labelsQr.toggles.warehouse', 'Almacén')],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-gray-700 dark:text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={(labelDialogConfig ?? labelConfig)[key]}
                        onChange={(e) =>
                          setLabelDialogConfig((p) => ({
                            ...(p ?? labelConfig),
                            [key]: e.target.checked,
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {/* Tipografía */}
                {(() => {
                  const cfg = labelDialogConfig ?? labelConfig;
                  const any =
                    cfg.showCode ||
                    cfg.showBarcode ||
                    cfg.showLocation ||
                    cfg.showWarehouse ||
                    cfg.showName;
                  if (!any) return null;
                  return (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {tt(t, 'labelsQr.typography.title', 'Tipografía')}
                      </div>

                      {(() => {
                        return (
                          <div className="grid grid-cols-1 gap-3 text-sm">
                            {cfg.showCode && (
                              <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                                <div className="text-gray-700 dark:text-gray-200">
                                  {tt(t, 'labelsQr.typography.code', 'Código')}
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400">
                                    {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                                  </label>
                                  <Input
                                    type="number"
                                    min={8}
                                    step={1}
                                    value={cfg.codeFontPx}
                                    onChange={(e) =>
                                      setLabelDialogConfig((p) => ({
                                        ...(p ?? labelConfig),
                                        codeFontPx: Number(e.target.value),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {tt(t, 'labelsQr.typography.bold', 'Negrita')}: ✓
                                </div>
                              </div>
                            )}

                            {cfg.showBarcode && (
                              <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                                <div className="text-gray-700 dark:text-gray-200">
                                  {tt(t, 'labelsQr.typography.barcode', 'Barcode')}
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400">
                                    {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                                  </label>
                                  <Input
                                    type="number"
                                    min={8}
                                    step={1}
                                    value={cfg.barcodeFontPx}
                                    onChange={(e) =>
                                      setLabelDialogConfig((p) => ({
                                        ...(p ?? labelConfig),
                                        barcodeFontPx: Number(e.target.value),
                                      }))
                                    }
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                  <input
                                    type="checkbox"
                                    checked={cfg.barcodeBold}
                                    onChange={(e) =>
                                      setLabelDialogConfig((p) => ({
                                        ...(p ?? labelConfig),
                                        barcodeBold: e.target.checked,
                                      }))
                                    }
                                  />
                                  {tt(t, 'labelsQr.typography.bold', 'Negrita')}
                                </label>
                              </div>
                            )}

                            {cfg.showLocation && (
                              <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                                <div className="text-gray-700 dark:text-gray-200">
                                  {tt(t, 'labelsQr.typography.location', 'Ubicación')}
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400">
                                    {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                                  </label>
                                  <Input
                                    type="number"
                                    min={8}
                                    step={1}
                                    value={cfg.locationFontPx}
                                    onChange={(e) =>
                                      setLabelDialogConfig((p) => ({
                                        ...(p ?? labelConfig),
                                        locationFontPx: Number(e.target.value),
                                      }))
                                    }
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                  <input
                                    type="checkbox"
                                    checked={cfg.locationBold}
                                    onChange={(e) =>
                                      setLabelDialogConfig((p) => ({
                                        ...(p ?? labelConfig),
                                        locationBold: e.target.checked,
                                      }))
                                    }
                                  />
                                  {tt(t, 'labelsQr.typography.bold', 'Negrita')}
                                </label>
                              </div>
                            )}

                            {cfg.showWarehouse && (
                              <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                                <div className="text-gray-700 dark:text-gray-200">
                                  {tt(t, 'labelsQr.typography.warehouse', 'Almacén')}
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400">
                                    {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                                  </label>
                                  <Input
                                    type="number"
                                    min={8}
                                    step={1}
                                    value={cfg.warehouseFontPx}
                                    onChange={(e) =>
                                      setLabelDialogConfig((p) => ({
                                        ...(p ?? labelConfig),
                                        warehouseFontPx: Number(e.target.value),
                                      }))
                                    }
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                  <input
                                    type="checkbox"
                                    checked={cfg.warehouseBold}
                                    onChange={(e) =>
                                      setLabelDialogConfig((p) => ({
                                        ...(p ?? labelConfig),
                                        warehouseBold: e.target.checked,
                                      }))
                                    }
                                  />
                                  {tt(t, 'labelsQr.typography.bold', 'Negrita')}
                                </label>
                              </div>
                            )}

                            {cfg.showName && (
                              <div className="grid grid-cols-[1fr,1fr,1fr] items-end gap-2">
                                <div className="text-gray-700 dark:text-gray-200">
                                  {tt(t, 'labelsQr.typography.name', 'Nombre')}
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400">
                                    {tt(t, 'labelsQr.typography.fontSize', 'Tamaño (px)')}
                                  </label>
                                  <Input
                                    type="number"
                                    min={8}
                                    step={1}
                                    value={cfg.nameFontPx}
                                    onChange={(e) =>
                                      setLabelDialogConfig((p) => ({
                                        ...(p ?? labelConfig),
                                        nameFontPx: Number(e.target.value),
                                      }))
                                    }
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                  <input
                                    type="checkbox"
                                    checked={cfg.nameBold}
                                    onChange={(e) =>
                                      setLabelDialogConfig((p) => ({
                                        ...(p ?? labelConfig),
                                        nameBold: e.target.checked,
                                      }))
                                    }
                                  />
                                  {tt(t, 'labelsQr.typography.bold', 'Negrita')}
                                </label>
                              </div>
                            )}

                            {cfg.showName && (
                              <div className="grid grid-cols-[1fr,1fr] items-end gap-2">
                                <div className="text-gray-700 dark:text-gray-200">
                                  {tt(t, 'labelsQr.typography.lines', 'Líneas')} (
                                  {tt(t, 'labelsQr.typography.name', 'Nombre')})
                                </div>
                                <Input
                                  type="number"
                                  min={1}
                                  max={5}
                                  step={1}
                                  value={cfg.nameMaxLines}
                                  onChange={(e) =>
                                    setLabelDialogConfig((p) => ({
                                      ...(p ?? labelConfig),
                                      nameMaxLines: Number(e.target.value),
                                    }))
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* Posición solo para campos activos */}
                {(() => {
                  const cfg = labelDialogConfig ?? labelConfig;
                  const any =
                    cfg.showQr ||
                    cfg.showCode ||
                    cfg.showBarcode ||
                    cfg.showLocation ||
                    cfg.showWarehouse ||
                    cfg.showName;
                  if (!any) return null;

                  const items = (
                    [
                      ['qr', tt(t, 'labelsQr.toggles.qr', 'QR')],
                      ['code', tt(t, 'labelsQr.toggles.code', 'Código')],
                      ['barcode', tt(t, 'labelsQr.toggles.barcode', 'Barcode')],
                      ['location', tt(t, 'labelsQr.toggles.location', 'Ubicación')],
                      ['warehouse', tt(t, 'labelsQr.toggles.warehouse', 'Almacén')],
                      ['name', tt(t, 'labelsQr.toggles.name', 'Nombre')],
                    ] as const
                  ).filter(([k]) => {
                    if (k === 'qr') return cfg.showQr;
                    if (k === 'code') return cfg.showCode;
                    if (k === 'barcode') return cfg.showBarcode;
                    if (k === 'location') return cfg.showLocation;
                    if (k === 'warehouse') return cfg.showWarehouse;
                    if (k === 'name') return cfg.showName;
                    return false;
                  });

                  return (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {tt(t, 'labelsQr.position.title', 'Posición (mm)')}
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        {items.map(([key, label]) => (
                          <div
                            key={key}
                            className="grid grid-cols-[1fr,1fr,1fr] items-center gap-2"
                          >
                            <div className="text-gray-700 dark:text-gray-200">
                              {label}
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400">
                                {tt(t, 'labelsQr.position.x', 'X')}
                              </label>
                              <Input
                                type="number"
                                step={0.5}
                                value={cfg.offsetsMm[key].x}
                                onChange={(e) =>
                                  setLabelDialogConfig((p) => ({
                                    ...(p ?? labelConfig),
                                    offsetsMm: {
                                      ...(p ?? labelConfig).offsetsMm,
                                      [key]: {
                                        ...(p ?? labelConfig).offsetsMm[key],
                                        x: Number(e.target.value),
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400">
                                {tt(t, 'labelsQr.position.y', 'Y')}
                              </label>
                              <Input
                                type="number"
                                step={0.5}
                                value={cfg.offsetsMm[key].y}
                                onChange={(e) =>
                                  setLabelDialogConfig((p) => ({
                                    ...(p ?? labelConfig),
                                    offsetsMm: {
                                      ...(p ?? labelConfig).offsetsMm,
                                      [key]: {
                                        ...(p ?? labelConfig).offsetsMm[key],
                                        y: Number(e.target.value),
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Preview dentro del diálogo */}
                {(() => {
                  const cfg = labelDialogConfig ?? labelConfig;
                  const widthPx = mmToPx(cfg.widthMm, cfg.dpi);
                  const heightPx = mmToPx(cfg.heightMm, cfg.dpi);
                  const qrSizePx = mmToPx(cfg.qrSizeMm, cfg.dpi);
                  const paddingPx = mmToPx(cfg.paddingMm, cfg.dpi);
                  const pxOff = (mm: number) => mmToPx(mm, cfg.dpi);

                  return (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                      <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                        {tt(t, 'labelsQr.label.preview', 'Preview')} ({cfg.widthMm}×
                        {cfg.heightMm}mm @ {cfg.dpi}dpi)
                      </div>
                      <div className="overflow-auto">
                        <div
                          style={{
                            width: `${widthPx}px`,
                            height: `${heightPx}px`,
                            background: '#ffffff',
                            color: '#000000',
                            position: 'relative',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                          }}
                        >
                          {cfg.showQr && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${paddingPx + pxOff(cfg.offsetsMm.qr.x)}px`,
                                top: `${paddingPx + pxOff(cfg.offsetsMm.qr.y)}px`,
                                width: `${qrSizePx}px`,
                                height: `${qrSizePx}px`,
                                background: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {labelDialogQrDataUrl ? (
                                <img
                                  src={labelDialogQrDataUrl}
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

                          {(() => {
                            const rightX =
                              paddingPx + (cfg.showQr ? qrSizePx + paddingPx : 0);
                            const lineH = Math.max(10, cfg.nameFontPx);

                            const xCode = rightX + pxOff(cfg.offsetsMm.code.x);
                            const yCode = paddingPx + pxOff(cfg.offsetsMm.code.y);

                            const xBarcode = rightX + pxOff(cfg.offsetsMm.barcode.x);
                            const yBarcode =
                              paddingPx +
                              cfg.codeFontPx +
                              2 +
                              pxOff(cfg.offsetsMm.barcode.y);

                            const xLocation = rightX + pxOff(cfg.offsetsMm.location.x);
                            const yLocation =
                              paddingPx +
                              cfg.codeFontPx +
                              2 +
                              lineH +
                              pxOff(cfg.offsetsMm.location.y);

                            const xWarehouse = rightX + pxOff(cfg.offsetsMm.warehouse.x);
                            const yWarehouse =
                              paddingPx +
                              cfg.codeFontPx +
                              2 +
                              lineH +
                              lineH +
                              pxOff(cfg.offsetsMm.warehouse.y);

                            const xName = rightX + pxOff(cfg.offsetsMm.name.x);
                            const yName =
                              heightPx -
                              paddingPx -
                              cfg.nameFontPx +
                              pxOff(cfg.offsetsMm.name.y);

                            return (
                              <>
                                {cfg.showCode && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xCode}px`,
                                      top: `${yCode}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: cfg.codeFontPx,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {selectedProduct.code}
                                  </div>
                                )}
                                {cfg.showBarcode && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xBarcode}px`,
                                      top: `${yBarcode}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: cfg.barcodeFontPx,
                                      fontWeight: cfg.barcodeBold ? 700 : 400,
                                    }}
                                  >
                                    {selectedProduct.barcode ?? ''}
                                  </div>
                                )}
                                {cfg.showLocation && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xLocation}px`,
                                      top: `${yLocation}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: cfg.locationFontPx,
                                      fontWeight: cfg.locationBold ? 700 : 400,
                                    }}
                                  >
                                    {locationText}
                                  </div>
                                )}
                                {cfg.showWarehouse && warehouseText && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xWarehouse}px`,
                                      top: `${yWarehouse}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: cfg.warehouseFontPx,
                                      fontWeight: cfg.warehouseBold ? 700 : 400,
                                    }}
                                  >
                                    {warehouseText}
                                  </div>
                                )}
                                {cfg.showName && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${xName}px`,
                                      top: `${yName}px`,
                                      right: `${paddingPx}px`,
                                      fontSize: cfg.nameFontPx,
                                      fontWeight: cfg.nameBold ? 700 : 600,
                                      lineHeight: `${cfg.nameFontPx + 2}px`,
                                      overflow: 'hidden',
                                      display: '-webkit-box',
                                      WebkitBoxOrient: 'vertical',
                                      WebkitLineClamp: cfg.nameMaxLines,
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {selectedProduct.name}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setLabelDialogOpen(false)}>
            {tt(t, 'common.cancel', 'Cancelar')}
          </Button>
          <Button
            onClick={async () => {
              if (!selectedProduct) return;

              const cfg = labelDialogConfig ?? labelConfig;
              setLabelConfig(cfg);
              setLabelQuality(labelDialogQuality);
              setLabelEnabled(true);
              setLabelPreviewOpen(true);

              // Guardar etiqueta en Storage/DB (best-effort)
              try {
                // Borrar etiqueta anterior si existe
                const existingLabel = labelAssetsByProductId.get(selectedProduct.id);
                if (existingLabel?.labelPath) {
                  try {
                    await deleteProductLabel(existingLabel.labelPath);
                  } catch (err) {
                    // No crítico si falla el borrado (puede que ya no exista)
                    // eslint-disable-next-line no-console
                    console.warn(
                      '[LabelsQrPage] No se pudo borrar etiqueta anterior:',
                      err,
                    );
                  }
                }

                let qrDataUrl: string | null = null;
                if (cfg.showQr) {
                  const s = qualityScale(labelDialogQuality, cfg.dpi);
                  qrDataUrl = await QRCode.toDataURL(buildQrPayload(selectedProduct), {
                    type: 'image/png',
                    width: 512 * s,
                    margin: 4,
                    errorCorrectionLevel: 'M',
                    color: { dark: '#000000', light: '#FFFFFF' },
                  });
                }

                const labelProduct: Product = {
                  ...selectedProduct,
                  aisle: selectedLocation?.aisle ?? selectedProduct.aisle,
                  shelf: selectedLocation?.shelf ?? selectedProduct.shelf,
                  warehouse: selectedLocation?.warehouse ?? selectedProduct.warehouse,
                };

                const widthPx = mmToPx(cfg.widthMm, cfg.dpi);
                const heightPx = mmToPx(cfg.heightMm, cfg.dpi);
                const scale = qualityScale(labelDialogQuality, cfg.dpi);
                const svg = buildLabelSvg(labelProduct, qrDataUrl, cfg);
                const pngBlob = await svgToPngBlob(svg, widthPx, heightPx, scale);

                const locKey =
                  selectedLocation?.id ??
                  `legacy:${labelProduct.aisle ?? ''}-${labelProduct.shelf ?? ''}:${labelProduct.warehouse ?? ''}`;
                const configJson = {
                  cfg,
                  locationId: selectedLocation?.id ?? null,
                  locationKey: locKey,
                } as const;
                const configHash = hashStringToBase36(stableStringify(configJson));
                const labelPath = await uploadProductLabel({
                  productId: selectedProduct.id,
                  configHash,
                  pngBlob,
                });
                const asset = await labelRepo.upsert({
                  productId: selectedProduct.id,
                  labelPath,
                  configHash,
                  configJson: configJson as unknown as Record<string, unknown>,
                });
                setLabelAssetsByProductId((prev) => {
                  const next = new Map(prev);
                  next.set(selectedProduct.id, asset);
                  return next;
                });
              } catch (err) {
                toast.error(
                  tt(t, 'labelsQr.toast.label.title', 'Etiqueta'),
                  tt(
                    t,
                    'labelsQr.toast.label.saveError',
                    'No se pudo guardar en Supabase: {{error}}',
                  ).replace(
                    '{{error}}',
                    err instanceof Error ? err.message : 'sin detalle',
                  ),
                );
              } finally {
                setLabelDialogOpen(false);
                setLabelDialogConfig(null);
              }
            }}
          >
            {tt(t, 'common.confirm', 'Confirmar')}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
