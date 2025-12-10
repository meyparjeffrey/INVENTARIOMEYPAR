/**
 * Componente de slider para seleccionar rangos de fecha.
 *
 * Permite seleccionar períodos predefinidos mediante una barra deslizante:
 * 1 semana, 15 días, 1 mes, 3 meses, 6 meses, 1 año, más de 1 año
 *
 * @module @presentation/components/ui/DateRangeSlider
 */

import * as React from 'react';
import { Label } from './Label';
import { cn } from '../../lib/cn';

export interface DateRangeOption {
  label: string;
  days: number;
  value: number; // Valor para el slider (0-6)
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { label: '1 semana', days: 7, value: 0 },
  { label: '15 días', days: 15, value: 1 },
  { label: '1 mes', days: 30, value: 2 },
  { label: '3 meses', days: 90, value: 3 },
  { label: '6 meses', days: 180, value: 4 },
  { label: '1 año', days: 365, value: 5 },
  { label: 'Más de 1 año', days: 730, value: 6 }, // 2 años como "más de 1 año"
];

interface DateRangeSliderProps {
  value: number | undefined; // Valor del slider (0-6) o undefined si no hay selección
  onChange: (value: number | undefined) => void;
  label?: string;
  className?: string;
}

/**
 * Slider para seleccionar rango de fechas.
 *
 * @param {DateRangeSliderProps} props - Propiedades del componente
 * @param {number | undefined} props.value - Valor actual del slider (0-6)
 * @param {(value: number | undefined) => void} props.onChange - Callback al cambiar el valor
 * @param {string} [props.label] - Etiqueta del slider
 * @param {string} [props.className] - Clases CSS adicionales
 */
export function DateRangeSlider({
  value,
  onChange,
  label,
  className,
}: DateRangeSliderProps) {
  // No inicializar con 0 si value es undefined - mantener undefined hasta que el usuario seleccione
  const [localValue, setLocalValue] = React.useState<number | undefined>(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number.parseInt(e.target.value, 10);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleClear = () => {
    setLocalValue(undefined);
    onChange(undefined);
  };

  // Si no hay valor seleccionado, usar 0 como valor visual pero no aplicarlo
  const displayValue = localValue ?? 0;
  const selectedOption =
    DATE_RANGE_OPTIONS.find((opt) => opt.value === displayValue) || DATE_RANGE_OPTIONS[0];

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}

      <div className="relative">
        {/* Slider */}
        <input
          type="range"
          min="0"
          max="6"
          step="1"
          value={displayValue}
          onChange={handleChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-500"
          style={{
            background: `linear-gradient(to right, 
              rgb(59 130 246) 0%, 
              rgb(59 130 246) ${(displayValue / 6) * 100}%, 
              rgb(229 231 235) ${(displayValue / 6) * 100}%, 
              rgb(229 231 235) 100%)`,
          }}
        />

        {/* Etiquetas de valores */}
        <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
          {DATE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'cursor-pointer transition-colors hover:text-primary-600 dark:hover:text-primary-400 px-1 py-0.5 rounded',
                localValue === option.value &&
                  'font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30',
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newValue = option.value;
                setLocalValue(newValue);
                onChange(newValue);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Valor seleccionado y botón limpiar */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-sm font-medium',
            localValue === undefined
              ? 'text-gray-400 dark:text-gray-500 italic'
              : 'text-gray-700 dark:text-gray-300',
          )}
        >
          {localValue === undefined ? 'No seleccionado' : selectedOption.label}
        </span>
        {localValue !== undefined && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Obtiene la fecha desde (hace N días) basada en el valor del slider.
 *
 * @param {number} sliderValue - Valor del slider (0-6)
 * @returns {string} Fecha en formato ISO (YYYY-MM-DD)
 */
export function getDateFromSliderValue(sliderValue: number): string {
  const option = DATE_RANGE_OPTIONS.find((opt) => opt.value === sliderValue);
  if (!option) return new Date().toISOString().split('T')[0];

  const date = new Date();
  date.setDate(date.getDate() - option.days);
  return date.toISOString().split('T')[0];
}

/**
 * Determina si un período es "corto" (para mostrar productos recientes) o "largo" (para mostrar productos antiguos).
 * Períodos cortos: 1 semana, 15 días → productos recientes
 * Períodos largos: 1 mes o más → productos antiguos/no modificados
 *
 * @param {number} sliderValue - Valor del slider (0-6)
 * @returns {boolean} true si es período corto (recientes), false si es largo (antiguos)
 */
export function isShortPeriod(sliderValue: number): boolean {
  // Períodos cortos: 0 (1 semana) y 1 (15 días)
  return sliderValue <= 1;
}

/**
 * Obtiene el valor del slider basado en una fecha.
 *
 * @param {string} dateFrom - Fecha en formato ISO (YYYY-MM-DD)
 * @returns {number | undefined} Valor del slider o undefined si no coincide
 */
export function getSliderValueFromDate(
  dateFrom: string | undefined,
  dateTo?: string | undefined,
): number | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Si hay dateTo y dateFrom, es un período corto (recientes)
  // dateFrom es la fecha de inicio del período, dateTo es hoy
  if (dateTo && dateFrom) {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const daysDiff = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Buscar la opción que más se acerque a la duración del período
    // Para períodos cortos, comparamos la duración del período
    for (let i = 0; i <= 1; i++) {
      // Solo períodos cortos: 1 semana (7 días) y 15 días
      if (Math.abs(daysDiff - DATE_RANGE_OPTIONS[i].days) <= 1) {
        return DATE_RANGE_OPTIONS[i].value;
      }
    }
    // Si no coincide exactamente, usar el más cercano
    if (daysDiff <= DATE_RANGE_OPTIONS[0].days) return 0; // 1 semana
    if (daysDiff <= DATE_RANGE_OPTIONS[1].days) return 1; // 15 días
  }

  // Si solo hay dateTo (sin dateFrom), es un período largo (antiguos)
  // dateTo es la fecha límite (hasta cuándo no se ha modificado)
  if (dateTo && !dateFrom) {
    const endDate = new Date(dateTo);
    const daysDiff = Math.floor(
      (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Encontrar la opción más cercana para períodos largos
    for (let i = DATE_RANGE_OPTIONS.length - 1; i >= 2; i--) {
      // Solo períodos largos: desde 1 mes en adelante
      if (daysDiff >= DATE_RANGE_OPTIONS[i].days) {
        return DATE_RANGE_OPTIONS[i].value;
      }
    }
  }

  return undefined;
}
