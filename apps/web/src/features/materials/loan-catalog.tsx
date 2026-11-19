import type { StockedMaterial } from '@platlab/contracts';
import { Input, Skeleton, StatePanel, cn } from '@platlab/ui';
import { PackageSearch, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { QueryErrorState } from '../../app/states';
import { MaterialThumb } from './material-thumb';
import { useMaterialPage } from './queries';

/**
 * El catálogo del mostrador de «Nuevo préstamo» (ADR 0025): los reutilizables como mosaicos con su imagen, lo disponible y
 * un «+». Tocar uno lo suma al vale; el que ya va en el vale muestra cuántas unidades lleva. Lo agotado se ve atenuado.
 */
export function LoanCatalog({ workspaceId, inTicket, onPick }: { workspaceId: string; inTicket: ReadonlyMap<string, string>; onPick: (material: StockedMaterial) => void }) {
  const [search, setSearch] = useState('');
  const found = useMaterialPage(workspaceId, { q: search, materialClass: 'reusable_counted', areaId: null, stock: null });
  const items = found.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <Input
          type="search"
          aria-label="Buscar material para prestar"
          placeholder="Buscar vasos, probetas…"
          autoComplete="off"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 pl-9 sm:h-10"
        />
      </div>
      {found.isPending ? (
        <div aria-busy="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-36 rounded-card" />
          ))}
        </div>
      ) : found.isError ? (
        <QueryErrorState error={found.error} onRetry={() => void found.refetch()} />
      ) : items.length === 0 ? (
        <StatePanel icon={PackageSearch} title="Nada para prestar" description={search ? 'Ningún material coincide con la búsqueda.' : 'Aún no hay material para prestar registrado.'} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((material) => {
            const taken = inTicket.get(material.id);
            const out = material.available === '0';
            return (
              <li key={material.id}>
                <button
                  type="button"
                  disabled={out}
                  onClick={() => onPick(material)}
                  className={cn(
                    'group relative grid w-full gap-2 rounded-card bg-surface p-2.5 text-left shadow-raised transition-[transform,box-shadow] duration-150 enabled:hover:shadow-float enabled:motion-safe:active:scale-[0.98] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
                    taken && 'ring-2 ring-action',
                  )}
                >
                  <MaterialThumb name={material.name} materialClass={material.class} className="w-full" />
                  <span className="min-w-0">
                    <span className="line-clamp-2 break-words text-sm font-semibold leading-snug text-ink">{material.name}</span>
                    <span className="block text-[13px] text-ink-muted">{out ? 'Todo prestado' : `${material.available} ${material.baseUnit} disponibles`}</span>
                  </span>
                  {taken ? (
                    <span className="absolute right-3.5 top-3.5 inline-flex min-w-7 items-center justify-center rounded-full bg-action px-2 py-0.5 text-xs font-bold tabular-nums text-on-action">{taken}</span>
                  ) : out ? null : (
                    <span aria-hidden className="absolute right-3.5 top-3.5 inline-flex size-7 items-center justify-center rounded-full bg-surface text-action shadow-raised transition-colors group-hover:bg-action group-hover:text-on-action">
                      <Plus className="size-4" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
