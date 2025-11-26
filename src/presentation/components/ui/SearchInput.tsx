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
 */
export function SearchInput({
  placeholder = "Buscar...",
  value,
  onChange,
  onSearch,
  className
}: SearchInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </form>
  );
}

