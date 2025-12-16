import { describe, expect, it } from 'vitest';
import { parseScannedValue } from '@presentation/utils/parseScannedValue';

describe('parseScannedValue', () => {
  it('extrae el código antes del separador |', () => {
    expect(parseScannedValue('TEST-CODI|TEST-NOM')).toEqual({
      raw: 'TEST-CODI|TEST-NOM',
      lookupKey: 'TEST-CODI',
    });
  });

  it('acepta el separador º (teclado ES / algunos escáneres)', () => {
    expect(parseScannedValue('MPE50-30124ºADPATADOR CARRIL DIN para MTX-T')).toEqual({
      raw: 'MPE50-30124ºADPATADOR CARRIL DIN para MTX-T',
      lookupKey: 'MPE50-30124',
    });
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
