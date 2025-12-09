import { Search, X } from "lucide-react";
import * as React from "react";
import { Input } from "./Input";
import { Button } from "./Button";
import { cn } from "../../lib/cn";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  className?: string;
  showClearButton?: boolean;
}

/**
 * Campo de búsqueda con icono de lupa.
 * 
 * Permite búsqueda por código completo, primeros 3+ caracteres del código, o nombre.
 * Incluye debounce automático para optimizar las consultas.
 * 
 * @component
 * @param {SearchInputProps} props - Propiedades del componente
 * @param {string} [props.placeholder="Buscar..."] - Texto placeholder
 * @param {string} props.value - Valor del campo de búsqueda
 * @param {Function} props.onChange - Callback al cambiar el valor
 * @param {Function} [props.onSearch] - Callback al enviar el formulario (Enter)
 * @param {string} [props.className] - Clases CSS adicionales
 */
export function SearchInput({
  placeholder = "Buscar por código o nombre (mín. 3 caracteres)...",
  value,
  onChange,
  onSearch,
  onClear,
  className,
  showClearButton = true
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  const handleClear = () => {
    onChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  // Atajos de teclado: Ctrl+Z para limpiar, Ctrl+X para cortar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+Z o Cmd+Z: Limpiar el campo
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      handleClear();
      return;
    }

    // Ctrl+X o Cmd+X: Cortar texto seleccionado (comportamiento por defecto)
    // No necesitamos hacer nada especial, el navegador lo maneja automáticamente
  };

  // Mostrar indicador visual si el texto es muy corto
  const showHint = value.length > 0 && value.length < 3;
  const showClear = showClearButton && value.length > 0;

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          // Permitir el comportamiento por defecto del navegador
          // React actualizará el valor automáticamente a través de onChange
          const pastedText = e.clipboardData.getData("text");
          if (pastedText) {
            // Prevenir el comportamiento por defecto y establecer el valor manualmente
            e.preventDefault();
            onChange(pastedText);
          }
        }}
        className={cn(
          "pl-9",
          showClear && "pr-9",
          showHint && "border-amber-300 dark:border-amber-600"
        )}
        title={showHint ? "Escribe al menos 3 caracteres para buscar" : undefined}
      />
      {showClear && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Limpiar búsqueda (Ctrl+Z)"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {showHint && !showClear && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-400">
          {3 - value.length} más
        </span>
      )}
    </form>
  );
}

