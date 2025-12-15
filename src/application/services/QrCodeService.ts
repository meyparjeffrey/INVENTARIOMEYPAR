import QRCode from 'qrcode';

export type QrPngOptions = {
  /**
   * Ancho/alto del PNG en píxeles (cuadrado).
   * Recomendación para imprimir: 512 o 1024.
   */
  sizePx?: number;
  /**
   * Quiet zone en módulos (margen blanco). Recomendación QR: 4.
   */
  marginModules?: number;
  /**
   * Nivel de corrección de errores. Para etiquetas pequeñas suele funcionar bien 'M'.
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
};

export class QrCodeService {
  static async generateQrPngBlob(
    text: string,
    options: QrPngOptions = {},
  ): Promise<Blob> {
    const value = text.trim();
    if (!value) {
      throw new Error('No se puede generar un QR vacío.');
    }

    const sizePx = options.sizePx ?? 512;
    const margin = options.marginModules ?? 4;
    const errorCorrectionLevel = options.errorCorrectionLevel ?? 'M';

    const dataUrl = await QRCode.toDataURL(value, {
      type: 'image/png',
      width: sizePx,
      margin,
      errorCorrectionLevel,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    const res = await fetch(dataUrl);
    return await res.blob();
  }
}
