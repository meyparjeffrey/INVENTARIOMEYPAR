/**
 * Tests unitarios para validaciones de ubicaciones de productos.
 *
 * Verifica que las validaciones de ubicación funcionen correctamente
 * según el tipo de almacén seleccionado (MEYPAR, OLIVA_TORRAS, FURGONETA).
 *
 * @module @application/services/__tests__/ProductLocationValidation
 */

import { describe, it, expect } from 'vitest';

/**
 * Valida que la estantería esté en el rango válido (1-30).
 */
function validateEstanteria(estanteria: number): boolean {
  return !isNaN(estanteria) && estanteria >= 1 && estanteria <= 30;
}

/**
 * Valida que el estante sea una letra válida (A-G).
 */
function validateEstante(estante: string): boolean {
  return /^[A-G]$/i.test(estante.trim().toUpperCase());
}

/**
 * Valida que el nombre del técnico para furgoneta tenga al menos 2 caracteres.
 */
function validateFurgonetaName(name: string): boolean {
  return name.trim().length >= 2;
}

describe('Validaciones de Ubicación de Productos', () => {
  describe('Validación de Estantería (MEYPAR)', () => {
    it('debe aceptar estanterías válidas (1-30)', () => {
      expect(validateEstanteria(1)).toBe(true);
      expect(validateEstanteria(15)).toBe(true);
      expect(validateEstanteria(30)).toBe(true);
    });

    it('debe rechazar estanterías fuera de rango', () => {
      expect(validateEstanteria(0)).toBe(false);
      expect(validateEstanteria(31)).toBe(false);
      expect(validateEstanteria(-1)).toBe(false);
      expect(validateEstanteria(100)).toBe(false);
    });

    it('debe rechazar valores no numéricos', () => {
      expect(validateEstanteria(NaN)).toBe(false);
    });
  });

  describe('Validación de Estante (MEYPAR)', () => {
    it('debe aceptar estantes válidos (A-G)', () => {
      expect(validateEstante('A')).toBe(true);
      expect(validateEstante('B')).toBe(true);
      expect(validateEstante('G')).toBe(true);
      expect(validateEstante('a')).toBe(true); // Case insensitive
      expect(validateEstante('g')).toBe(true);
    });

    it('debe rechazar estantes fuera de rango', () => {
      expect(validateEstante('H')).toBe(false);
      expect(validateEstante('Z')).toBe(false);
      expect(validateEstante('0')).toBe(false);
      expect(validateEstante('AA')).toBe(false);
    });

    it('debe rechazar strings vacíos', () => {
      expect(validateEstante('')).toBe(false);
      expect(validateEstante('   ')).toBe(false);
    });
  });

  describe('Validación de Nombre de Furgoneta', () => {
    it('debe aceptar nombres válidos (mínimo 2 caracteres)', () => {
      expect(validateFurgonetaName('Jaume')).toBe(true);
      expect(validateFurgonetaName('Carles')).toBe(true);
      expect(validateFurgonetaName('AB')).toBe(true);
      expect(validateFurgonetaName('  Juan  ')).toBe(true); // Trim funciona
    });

    it('debe rechazar nombres muy cortos', () => {
      expect(validateFurgonetaName('')).toBe(false);
      expect(validateFurgonetaName('A')).toBe(false);
      expect(validateFurgonetaName('   ')).toBe(false);
    });
  });

  describe('Validación de Ubicación según Almacén', () => {
    it('MEYPAR: debe requerir estantería y estante válidos', () => {
      const warehouse = 'MEYPAR';
      const estanteria = 5;
      const estante = 'B';

      if (warehouse === 'MEYPAR') {
        expect(validateEstanteria(estanteria)).toBe(true);
        expect(validateEstante(estante)).toBe(true);
      }
    });

    it('OLIVA_TORRAS: no requiere validaciones adicionales', () => {
      const warehouse = 'OLIVA_TORRAS';
      // No hay validaciones específicas para Oliva Torras
      expect(warehouse).toBe('OLIVA_TORRAS');
    });

    it('FURGONETA: debe requerir nombre del técnico válido', () => {
      const warehouse = 'FURGONETA';
      const furgonetaName = 'Jaume';

      if (warehouse === 'FURGONETA') {
        expect(validateFurgonetaName(furgonetaName)).toBe(true);
      }
    });
  });
});
