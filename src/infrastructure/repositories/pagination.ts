import type {
  PaginatedResult,
  PaginationParams
} from "@domain/repositories/types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

export const buildPagination = (params?: PaginationParams) => {
  const page = params?.page && params.page > 0 ? params.page : DEFAULT_PAGE;
  const pageSize =
    params?.pageSize && params.pageSize > 0
      ? params.pageSize
      : DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { page, pageSize, from, to };
};

export const toPaginatedResult = <T>(
  data: T[],
  total: number | null,
  page: number,
  pageSize: number
): PaginatedResult<T> => ({
  data,
  total: total ?? data.length,
  page,
  pageSize
});

