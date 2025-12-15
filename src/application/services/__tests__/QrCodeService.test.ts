import { describe, expect, it } from 'vitest';
import { QrCodeService } from '../QrCodeService';

describe('QrCodeService', () => {
  it('genera un PNG Blob no vacío', async () => {
    const blob = await QrCodeService.generateQrPngBlob('8421234567890', { sizePx: 256 });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(100);
    expect(blob.type).toBe('image/png');
  });

  it('rechaza QR vacío', async () => {
    await expect(QrCodeService.generateQrPngBlob('   ')).rejects.toThrow(/vac[ií]o/i);
  });
});
