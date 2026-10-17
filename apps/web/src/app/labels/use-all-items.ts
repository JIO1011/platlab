import { useEffect, useMemo } from 'react';

/** Lo mínimo de una consulta por páginas que hace falta para traerlas todas. */
interface PagedQuery<T> {
  data: { pages: Array<{ items: T[] }> } | undefined;
  isPending: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

/**
 * Trae, una tras otra, todas las páginas de una consulta: una hoja de etiquetas debe ofrecer todas, no las
 * primeras. `loading` dura hasta tener la última.
 */
export function useAllItems<T>(query: PagedQuery<T>): { items: T[]; loading: boolean } {
  const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  return { items, loading: isPending || hasNextPage };
}
