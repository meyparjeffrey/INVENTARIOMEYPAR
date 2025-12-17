import { describe, expect, it } from 'vitest';
import { parseScannedValue } from '@presentation/utils/parseScannedValue';

describe('parseScannedValue', () => {
  it('extrae el código antes del separador |', () => {
    expect(parseScannedValue('TEST-CODI|TEST-NOM')).toEqual({
      raw: 'TEST-CODI|TEST-NOM',
      lookupKey: 'TEST-CODI',
    });
  });

  it('extrae el código MPE50-30124 con separador | (caso real usuario)', () => {
    // Este es el caso exacto que reporta el usuario: QR escaneado desde USB
    expect(parseScannedValue('MPE50-30124|ADPATADOR CARRIL DIN para MTX-T')).toEqual({
      raw: 'MPE50-30124|ADPATADOR CARRIL DIN para MTX-T',
      lookupKey: 'MPE50-30124',
    });
  });

  it('acepta el separador º (teclado ES / algunos escáneres)', () => {
    expect(parseScannedValue('MPE50-30124ºADPATADOR CARRIL DIN para MTX-T')).toEqual({
      raw: 'MPE50-30124ºADPATADOR CARRIL DIN para MTX-T',
      lookupKey: 'MPE50-30124',
    });
  });

  it('normaliza layout HID: "-" -> "\'" y "|" -> "Ç"', () => {
    expect(parseScannedValue("MPE50'30124ÇADPATADOR CARRIL DIN para MTX'T")).toEqual({
      raw: "MPE50'30124ÇADPATADOR CARRIL DIN para MTX'T",
      lookupKey: 'MPE50-30124',
    });
  });

  it('fallback: si no detecta separador, extrae el código inicial y lo normaliza', () => {
    // Simula el caso reportado donde el separador no se detecta por algún motivo,
    // pero la cadena empieza con el código.
    expect(
      parseScannedValue("MPE50'30124ÇADPATADOR CARRIL DIN para MTX'T").lookupKey,
    ).toBe('MPE50-30124');
  });

  it('acepta separadores similares (¦, │)', () => {
    expect(parseScannedValue('CODI¦NOM')).toEqual({ raw: 'CODI¦NOM', lookupKey: 'CODI' });
    expect(parseScannedValue('CODI│NOM')).toEqual({ raw: 'CODI│NOM', lookupKey: 'CODI' });
    expect(parseScannedValue('CODI｜NOM')).toEqual({
      raw: 'CODI｜NOM',
      lookupKey: 'CODI',
    });
  });

  it('trimea y devuelve lookupKey para formato legacy', () => {
    expect(parseScannedValue('  PLA01-30127-C:705050_22  ')).toEqual({
      raw: 'PLA01-30127-C:705050_22',
      lookupKey: 'PLA01-30127-C:705050_22',
    });
  });

  it('usa solo el primer | si hay varios', () => {
    expect(parseScannedValue('CODI|NOM|EXTRA')).toEqual({
      raw: 'CODI|NOM|EXTRA',
      lookupKey: 'CODI',
    });
  });
});
