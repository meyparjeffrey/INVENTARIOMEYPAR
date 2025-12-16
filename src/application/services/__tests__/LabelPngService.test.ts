import { describe, expect, it } from 'vitest';
import type { Product } from '@domain/entities';
import { buildLabelSvg, mmToPx } from '../LabelPngService';

describe('LabelPngService', () => {
  it('convierte mm a px con DPI', () => {
    // 25.4mm = 1 inch -> 203 px a 203 dpi
    expect(mmToPx(25.4, 203)).toBe(203);
  });

  it('genera SVG con dimensiones correctas y texto básico', () => {
    const product: Product = {
      id: '00000000-0000-0000-0000-000000000000',
      code: 'PROD-001',
      barcode: '8421234567890',
      name: 'Tornillo M6x20',
      description: null,
      category: null,
      stockCurrent: 0,
      stockMin: 0,
      stockMax: null,
      aisle: '1',
      shelf: 'A',
      locations: [],
      locationExtra: null,
      warehouse: 'MEYPAR',
      costPrice: 0,
      salePrice: null,
      purchaseUrl: null,
      imageUrl: null,
      supplierCode: null,
      isActive: true,
      isBatchTracked: false,
      unitOfMeasure: null,
      weightKg: null,
      dimensionsCm: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: null,
      updatedBy: null,
    };

    const cfg = {
      widthMm: 30,
      heightMm: 20,
      dpi: 203 as const,
      showQr: true,
      showCode: true,
      showBarcode: false,
      showName: true,
      showWarehouse: false,
      showLocation: true,
      qrSizeMm: 10,
      paddingMm: 1,
      codeFontPx: 12,
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
        code: { x: 0, y: 0 },
        barcode: { x: 0, y: 0 },
        location: { x: 0, y: 0 },
        warehouse: { x: 0, y: 0 },
        name: { x: 0, y: 0 },
      },
    };

    const svg = buildLabelSvg(product, 'data:image/png;base64,AAAA', cfg);
    const w = mmToPx(cfg.widthMm, cfg.dpi);
    const h = mmToPx(cfg.heightMm, cfg.dpi);

    expect(svg).toContain(`width="${w}"`);
    expect(svg).toContain(`height="${h}"`);
    expect(svg).toContain('PROD-001');
    expect(svg).toContain('Tornillo');
  });
});
