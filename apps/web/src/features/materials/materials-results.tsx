import type { MaterialList, StockedMaterial } from '@platlab/contracts';
import { Button, Skeleton, StatePanel } from '@platlab/ui';
import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { Package, PackageSearch } from 'lucide-react';
import type { ReactNode } from 'react';
import { QueryErrorState } from '../../app/states';
import { MaterialCard } from './material-card';
import { MaterialRow } from './material-row';

/**
 * El resultado del Inventario por material (ADR 0025): cargando, con error, vacío o la lista, ya sea en filas (con barra de
 * diez tramos y ubicaciones que se despliegan) o en tarjetas con imagen. «Ver más» pide la página siguiente.
 */
export function MaterialsResults({
  query,
  view,
  filtered,
  canManage,
  create,
  onOpen,
}: {
  query: UseInfiniteQueryResult<InfiniteData<MaterialList>>;
  view: 'list' | 'cards';
  filtered: boolean;
  canManage: boolean;
  create: ReactNode;
  onOpen: (material: StockedMaterial) => void;
}) {
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (query.isPending) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel
          icon={filtered ? PackageSearch : Package}
          title={filtered ? 'Ningún material coincide' : 'Aún no hay materiales'}
          description={
            filtered
              ? 'Prueba con otra palabra o quita los filtros.'
              : canManage
                ? 'Registra lo que el laboratorio gasta (guantes, puntas) o presta (vasos, pipetas) y luego ingresa sus existencias.'
                : 'Quien administra el espacio registra los materiales. Cuando existan, los verás aquí.'
          }
          action={filtered ? undefined : create}
        />
      </div>
    );
  }
  return (
    <>
      {view === 'list' ? (
        <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised">
          {items.map((material) => (
            <MaterialRow key={material.id} material={material} onOpen={() => onOpen(material)} />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((material) => (
            <MaterialCard key={material.id} material={material} onOpen={() => onOpen(material)} />
          ))}
        </ul>
      )}
      {query.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button className="h-11 sm:h-10" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
          </Button>
        </div>
      ) : null}
    </>
  );
}
