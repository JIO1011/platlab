import { useEffect, useMemo } from 'react';

/** Cuántas filas imprime un informe como máximo (ADR 0014); si hay más, la hoja lo avisa. */
export const PRINT_LIMIT = 1000;

/** Lo que se usa de una consulta por páginas (la de la lista), sin atarse a sus tipos de error. */
interface PagedQuery<T> {
  data?: { pages: { items: T[] }[] } | undefined;
  isSuccess: boolean;
  isPlaceholderData: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

/**
 * Termina de cargar, página a página y hasta `PRINT_LIMIT`, la consulta que la lista ya tiene: es el mismo
 * caché, no pide nada nuevo. `enabled` en falso la deja como está. `hasMore`: hay más filas que las impresas.
 */
export function usePrintRows<T>(query: PagedQuery<T>, enabled = true) {
  const { fetchNextPage, isFetchingNextPage, isPlaceholderData, hasNextPage, isSuccess } = query;
  const loaded = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const capped = loaded.length >= PRINT_LIMIT;
  const rows = capped ? loaded.slice(0, PRINT_LIMIT) : loaded;
  const hasMore = loaded.length > PRINT_LIMIT || (capped && hasNextPage);

  const loadingMore = enabled && isSuccess && hasNextPage && !capped;
  useEffect(() => {
    if (loadingMore && !isFetchingNextPage && !isPlaceholderData) void fetchNextPage();
  }, [loadingMore, isFetchingNextPage, isPlaceholderData, fetchNextPage, loaded.length]);

  return { rows, loadedCount: loaded.length, hasMore, loadingMore };
}
