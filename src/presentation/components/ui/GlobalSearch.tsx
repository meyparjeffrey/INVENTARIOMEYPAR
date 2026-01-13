import { Search, Clock, X } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { Input } from './Input';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/cn';
import { highlightText } from '../../utils/highlightText';

interface SearchResult {
  id: string;
  type: 'product' | 'batch';
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
 *
 * Permite búsqueda por código completo, primeros 3+ caracteres del código, o nombre.
 * Busca en productos y lotes activos, mostrando hasta 10 resultados de productos y 5 de lotes.
 *
 * @component
 * @param {GlobalSearchProps} props - Propiedades del componente
 * @param {string} [props.placeholder] - Texto placeholder
 * @param {string} [props.className] - Clases CSS adicionales
 */
export function GlobalSearch({
  placeholder = 'Buscar productos, lotes... (mín. 3 caracteres)',
  className,
}: GlobalSearchProps) {
  const { t } = useLanguage();
  const [value, setValue] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const navigate = useNavigate();
  const debounceRef = React.useRef<NodeJS.Timeout>();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Cargar búsquedas recientes desde localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        // Ignorar errores de parseo
      }
    }
  }, []);

  // Atajo de teclado Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        if (results.length > 0) {
          setIsOpen(true);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results.length]);

  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Permitir búsqueda con 3+ caracteres para mejor rendimiento
    if (value.length < 3) {
      setResults([]);
      setIsOpen(value.length > 0 && recentSearches.length > 0);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const searchTerm = value.trim();
        const term = `%${searchTerm}%`;

        // Buscar productos: código completo, código parcial (3+ caracteres), nombre, barcode
        // Priorizar coincidencias exactas primero
        const { data: products, error: productsError } = await supabaseClient
          .from('products')
          .select('id, code, name, description, barcode')
          .or(
            `code.ilike.${term},name.ilike.${term},barcode.ilike.${term},code.eq.${searchTerm},barcode.eq.${searchTerm}`,
          )
          .eq('is_active', true)
          .order('code', { ascending: true })
          .limit(10); // Aumentar a 10 resultados

        if (productsError) {
          // eslint-disable-next-line no-console
          console.error('[GlobalSearch] Error buscando productos:', productsError);
        }

        // Buscar lotes
        const { data: batches, error: batchesError } = await supabaseClient
          .from('product_batches')
          .select('id, batch_code, product_id, batch_barcode, products:product_id(name)')
          .or(
            `batch_code.ilike.${term},batch_barcode.ilike.${term},batch_code.eq.${searchTerm},batch_barcode.eq.${searchTerm}`,
          )
          .limit(5);

        if (batchesError) {
          // eslint-disable-next-line no-console
          console.error('[GlobalSearch] Error buscando lotes:', batchesError);
        }

        const searchResults: SearchResult[] = [];

        // Agregar productos
        products?.forEach((p) => {
          searchResults.push({
            id: p.id,
            type: 'product',
            code: p.code,
            name: p.name,
            description: p.description ?? undefined,
          });
        });

        // Agregar lotes
        batches?.forEach((b) => {
          const productRaw = b.products;
          const product = Array.isArray(productRaw)
            ? productRaw[0]
            : productRaw as { name: string } | null;
          searchResults.push({
            id: b.id,
            type: 'batch',
            code: b.batch_code,
            name: product?.name ?? 'Lote',
            description: `Lote: ${b.batch_code}`,
          });
        });

        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error en búsqueda:', error);
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
    // Guardar en búsquedas recientes
    if (value.trim()) {
      const updated = [
        value.trim(),
        ...recentSearches.filter((s) => s !== value.trim()),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }

    if (result.type === 'product') {
      // Navegar directamente al detalle del producto
      navigate(`/products/${result.id}`);
    } else {
      // Para lotes, navegar a la página de lotes con highlight
      navigate(`/batches?highlight=${result.id}`);
    }
    setValue('');
    setIsOpen(false);
  };

  const handleRecentSearch = (search: string) => {
    setValue(search);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative flex-1 max-w-md', className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmedValue = value.trim();
          // Si hay un término de búsqueda válido (3+ caracteres), navegar a la página de resultados
          if (trimmedValue.length >= 3) {
            // Guardar en búsquedas recientes
            const updated = [
              trimmedValue,
              ...recentSearches.filter((s) => s !== trimmedValue),
            ].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem('recentSearches', JSON.stringify(updated));

            // Navegar a la página de resultados de búsqueda
            navigate(`/products/search?q=${encodeURIComponent(trimmedValue)}`);
            setValue('');
            setIsOpen(false);
          } else if (results.length > 0) {
            // Si no hay término válido pero hay resultados, ir al primero
            handleResultClick(results[0]);
          }
        }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl+Z o Cmd+Z: Limpiar el campo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
              e.preventDefault();
              setValue('');
              setIsOpen(false);
              return;
            }
            // Ctrl+X o Cmd+X: Cortar texto seleccionado (comportamiento por defecto)
            // No necesitamos hacer nada especial, el navegador lo maneja automáticamente
          }}
          onPaste={(e) => {
            // Permitir el comportamiento por defecto del navegador
            // React actualizará el valor automáticamente a través de onChange
            const pastedText = e.clipboardData.getData('text');
            if (pastedText) {
              // Prevenir el comportamiento por defecto y establecer el valor manualmente
              e.preventDefault();
              setValue(pastedText);
            }
          }}
          onFocus={() => {
            if (results.length > 0 || recentSearches.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            // Delay para permitir click en resultados
            setTimeout(() => setIsOpen(false), 200);
          }}
          className="pl-9 pr-20"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800 sm:flex">
          <kbd className="font-mono">Ctrl</kbd>
          <span>+</span>
          <kbd className="font-mono">K</kbd>
        </div>
      </form>

      {/* Dropdown de resultados */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {loading ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {t('search.loading') || 'Buscando...'}
              </div>
            ) : value.length < 3 ? (
              recentSearches.length > 0 ? (
                <div>
                  <div className="border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    {t('search.recent') || 'Búsquedas recientes'}
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {recentSearches.map((search, idx) => (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => handleRecentSearch(search)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {search}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            ) : results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('search.noResults') || 'No se encontraron resultados'}
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto py-1">
                {results.map((result) => (
                  <li key={`${result.type}-${result.id}`}>
                    <motion.button
                      type="button"
                      whileHover={{ x: 4 }}
                      onClick={() => handleResultClick(result)}
                      className="flex w-full items-start gap-3 px-4 py-2 text-left text-sm transition hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-50">
                          {highlightText(result.name, value)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {result.type === 'product'
                            ? t('search.product') || 'Producto'
                            : t('search.batch') || 'Lote'}
                          : {highlightText(result.code, value)}
                        </div>
                        {result.description && (
                          <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                            {highlightText(result.description, value)}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
