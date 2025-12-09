import { Search } from "lucide-react";
import * as React from "react";
import { Input } from "./Input";
import { cn } from "../../lib/cn";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
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
  className
}: SearchInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  // Mostrar indicador visual si el texto es muy corto
  const showHint = value.length > 0 && value.length < 3;

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("pl-9", showHint && "border-amber-300 dark:border-amber-600")}
        title={showHint ? "Escribe al menos 3 caracteres para buscar" : undefined}
      />
      {showHint && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-400">
          {3 - value.length} más
        </span>
      )}
    </form>
  );
}

