/**
 * Parámetros genéricos para paginar resultados desde Supabase.
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Resultado estándar de una consulta paginada.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

