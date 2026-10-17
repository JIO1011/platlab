import type { AssetList } from '@platlab/contracts';
import { Button, Skeleton, cn } from '@platlab/ui';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { QueryErrorState } from '../../app/states';
import { useMediaQuery } from '../../app/use-media-query';
import { AssetCards, AssetTable, AssetTiles, tileGrid, tileHeight } from './asset-list';
import { assetsText } from './asset-text';

/** Esqueleto quieto con la forma real: cuadros, filas de una tarjeta (tabla) o tarjetas apiladas. */
function ResultsSkeleton({ shape }: { shape: 'tiles' | 'table' | 'cards' }) {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando">
      {shape === 'tiles' ? (
        <div className={tileGrid}>
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className={`${tileHeight} rounded-card`} />
          ))}
        </div>
      ) : shape === 'table' ? (
        <div className="divide-y divide-line rounded-card bg-surface shadow-raised">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-4 w-20" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {[0, 1, 2].map((card) => (
            <Skeleton key={card} className="h-36 rounded-card" />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Los equipos de una consulta del Inventario con todos sus estados: carga, error con «Reintentar», vacío (lo
 * dibuja quien lo usa, que sabe por qué), la cuenta (salvo con `count={false}`) y «Ver más». Con `tilesIn` (el nombre del área) salen
 * en cuadros; sin él, en tabla desde 1024 px y en tarjetas apiladas por debajo.
 */
export function AssetResults({
  assets,
  base,
  tilesIn,
  count = true,
  empty,
}: {
  assets: UseInfiniteQueryResult<InfiniteData<AssetList>>;
  base: string;
  tilesIn?: string | undefined;
  count?: boolean;
  empty: ReactNode;
}) {
  const table = useMediaQuery('(min-width: 64rem)');
  const items = assets.data?.pages.flatMap((page) => page.items) ?? [];
  if (assets.isPending) return <ResultsSkeleton shape={tilesIn ? 'tiles' : table ? 'table' : 'cards'} />;
  if (assets.isError) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <QueryErrorState error={assets.error} onRetry={() => void assets.refetch()} />
      </div>
    );
  }
  if (items.length === 0) return <div className="rounded-card bg-surface shadow-raised">{empty}</div>;
  return (
    <div aria-busy={assets.isPlaceholderData} className={cn('transition-opacity duration-150', assets.isPlaceholderData && 'opacity-60')}>
      {count ? (
        <p aria-live="polite" className="mb-3 text-sm font-semibold tabular-nums text-ink">
          {assetsText(items.length, assets.hasNextPage)}
        </p>
      ) : null}
      {tilesIn ? (
        <AssetTiles assets={items} base={base} areaName={tilesIn} />
      ) : table ? (
        <AssetTable assets={items} base={base} />
      ) : (
        <AssetCards assets={items} base={base} />
      )}
      {assets.hasNextPage ? (
        <div className="mt-5 text-center">
          <Button className="h-[44px] sm:h-10" loading={assets.isFetchingNextPage} onClick={() => void assets.fetchNextPage()}>
            Ver más
          </Button>
        </div>
      ) : null}
    </div>
  );
}
