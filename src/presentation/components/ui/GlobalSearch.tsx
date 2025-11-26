import { Search } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { Input } from "./Input";
import { cn } from "../../lib/cn";

interface SearchResult {
  id: string;
  type: "product" | "batch";
  code: string;
  name: string;
  description?: string;
}

interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
}

/**
 * Búsqueda global con dropdown de resultados.
 */
export function GlobalSearch({ placeholder = "Buscar productos, lotes...", className }: GlobalSearchProps) {
  const [value, setValue] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const debounceRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const term = `%${value}%`;

        // Buscar productos
        const { data: products } = await supabaseClient
          .from("products")
          .select("id, code, name, description")
          .or(`code.ilike.${term},name.ilike.${term},barcode.ilike.${term}`)
          .eq("is_active", true)
          .limit(5);

        // Buscar lotes
        const { data: batches } = await supabaseClient
          .from("product_batches")
          .select("id, batch_code, product_id, products:product_id(name)")
          .or(`batch_code.ilike.${term},batch_barcode.ilike.${term}`)
          .limit(5);

        const searchResults: SearchResult[] = [];

        // Agregar productos
        products?.forEach((p) => {
          searchResults.push({
            id: p.id,
            type: "product",
            code: p.code,
            name: p.name,
            description: p.description ?? undefined
          });
        });

        // Agregar lotes
        batches?.forEach((b) => {
          const product = b.products as { name: string } | null;
          searchResults.push({
            id: b.id,
            type: "batch",
            code: b.batch_code,
            name: product?.name ?? "Lote",
            description: `Lote: ${b.batch_code}`
          });
        });

        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error en búsqueda:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "product") {
      navigate(`/products?highlight=${result.id}`);
    } else {
      navigate(`/batches?highlight=${result.id}`);
    }
    setValue("");
    setIsOpen(false);
  };

  return (
    <div className={cn("relative flex-1 max-w-md", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (results.length > 0) {
            handleResultClick(results[0]);
          }
        }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            // Delay para permitir click en resultados
            setTimeout(() => setIsOpen(false), 200);
          }}
          className="pl-9"
        />
      </form>

      {/* Dropdown de resultados */}
      {isOpen && (results.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No se encontraron resultados
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => handleResultClick(result)}
                    className="flex w-full items-start gap-3 px-4 py-2 text-left text-sm transition hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-50">{result.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {result.type === "product" ? "Producto" : "Lote"}: {result.code}
                      </div>
                      {result.description && (
                        <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          {result.description}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

