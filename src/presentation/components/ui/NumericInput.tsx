/**
 * Componente de input numérico con edición natural.
 *
 * Permite editar números de forma natural, incluyendo valores negativos y decimales.
 * Valida y aplica límites solo cuando el usuario termina de editar (onBlur).
 *
 * @module @presentation/components/ui/NumericInput
 */

import * as React from 'react';
import { Input, type InputProps } from './Input';

export interface NumericInputProps extends Omit<
  InputProps,
  'type' | 'value' | 'onChange' | 'onBlur'
> {
  /** Valor numérico actual */
  value: number;
  /** Callback cuando cambia el valor (recibe el número validado) */
  onChange: (value: number) => void;
  /** Valor mínimo permitido */
  min?: number;
  /** Valor máximo permitido */
  max?: number;
  /** Paso para incremento/decremento (por defecto: 1) */
  step?: number;
}

/**
 * Input numérico con edición natural.
 *
 * Permite valores temporales inválidos durante la edición y valida al perder el foco.
 * Soporta números negativos y decimales.
 *
 * @example
 * <NumericInput
 *   value={qrSize}
 *   onChange={(v) => setQrSize(v)}
 *   min={6}
 *   max={25}
 *   step={1}
 * />
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, min, max, ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState<string>(String(value));
    const inputRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    // Función para formatear número con máximo 2 decimales
    const formatNumber = React.useCallback((num: number): string => {
      // Si es un número entero, mostrar sin decimales
      if (Number.isInteger(num)) {
        return String(num);
      }
      // Si tiene decimales, limitar a 2
      return num.toFixed(2).replace(/\.?0+$/, '');
    }, []);

    // Sincronizar cuando cambia el valor externo
    React.useEffect(() => {
      setInputValue(formatNumber(value));
    }, [value, formatNumber]);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Permitir campo vacío, solo "-", o números (incluyendo negativos y decimales)
        // Permitir valores parciales durante la edición para facilitar el borrado
        if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
          // Actualizar el valor del input inmediatamente para permitir edición natural
          setInputValue(newValue);

          // Solo actualizar el valor numérico si es completamente válido
          // Esto evita actualizaciones prematuras durante la edición
          const num = Number(newValue);
          if (newValue !== '' && newValue !== '-' && !isNaN(num) && isFinite(num)) {
            // Actualizar el valor sin límites durante la edición
            // Los límites se aplicarán en onBlur
            onChange(num);
          }
        }
      },
      [onChange],
    );

    const handleBlur = React.useCallback(() => {
      // Al perder el foco, validar y aplicar límites
      const num = Number(inputValue);

      if (inputValue === '' || inputValue === '-' || isNaN(num)) {
        // Si está vacío o inválido, restaurar el último valor válido
        setInputValue(formatNumber(value));
        return;
      }

      // Aplicar límites
      let finalValue = num;
      if (min !== undefined && finalValue < min) {
        finalValue = min;
      }
      if (max !== undefined && finalValue > max) {
        finalValue = max;
      }

      // Redondear a 2 decimales máximo
      finalValue = Math.round(finalValue * 100) / 100;

      // Actualizar el valor final formateado
      setInputValue(formatNumber(finalValue));
      onChange(finalValue);
    }, [inputValue, value, onChange, min, max, formatNumber]);

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Permitir teclas de navegación y edición
        if (
          e.key === 'Backspace' ||
          e.key === 'Delete' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'Tab' ||
          e.key === 'Enter' ||
          e.ctrlKey ||
          e.metaKey
        ) {
          return;
        }

        // Permitir números, punto decimal y signo negativo
        if (!/[\d.-]/.test(e.key) && !e.key.startsWith('Arrow')) {
          e.preventDefault();
        }
      },
      [],
    );

    return (
      <Input
        ref={combinedRef}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);

NumericInput.displayName = 'NumericInput';
