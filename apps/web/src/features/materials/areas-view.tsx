import type { MaterialAreaList } from '@platlab/contracts';
import { Skeleton, StatePanel } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { QueryErrorState } from '../../app/states';
import { AreaCard } from './area-card';

/** El Inventario «Por ubicación» (ADR 0025): las áreas con material en existencia; tocar una abre su lista. */
export function AreasView({ areas, onOpen }: { areas: UseQueryResult<MaterialAreaList>; onOpen: (areaId: string) => void }) {
  if (areas.isPending) {
    return (
      <div aria-busy="true" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-40 rounded-card" />
        ))}
      </div>
    );
  }
  if (areas.isError) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <QueryErrorState error={areas.error} onRetry={() => void areas.refetch()} />
      </div>
    );
  }
  if (areas.data.items.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel icon={MapPin} title="Aún no hay material en ninguna ubicación" description="Al ingresar existencias de un material, su área aparece aquí." />
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {areas.data.items.map((area) => (
        <AreaCard key={area.id} area={area} onOpen={() => onOpen(area.id)} />
      ))}
    </ul>
  );
}
