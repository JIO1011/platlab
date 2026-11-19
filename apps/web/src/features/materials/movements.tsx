import { issuePurposeLabel, materialMovementKind, materialMovementKindLabel, type IssuePurpose, type MaterialMovementFilters, type MaterialMovementKind } from '@platlab/contracts';
import { Button, Field, Input, Skeleton, StatePanel, toast } from '@platlab/ui';
import { Package, ScrollText, Search, SearchX, X } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ExportMenu } from '../../app/export-menu';
import { FilterPill } from '../../app/filter-pill';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { materialsErrorMessage, useExportMovements } from './commands';
import { useMaterials } from './context';
import { LedgerPrint } from './ledger-print';
import { LedgerTable } from './ledger-table';
import { useMaterial, useMovementPage } from './queries';

const purposes: IssuePurpose[] = ['practice', 'clinic', 'general'];

/** El material al que se limita el libro («Material: Guantes»): se quita con un toque. */
function MaterialChip({ name, onRemove }: { name: string | undefined; onRemove: () => void }) {
  const text = name ? `Material: ${name}` : 'Material';
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Quitar filtro ${text}`}
      className="inline-flex h-9 w-fit max-w-full items-center gap-1.5 rounded-full border border-action/40 bg-surface px-3.5 text-sm font-medium text-action transition-colors hover:bg-action-soft"
    >
      <Package className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{text}</span>
      <X className="size-3.5 shrink-0" aria-hidden />
    </button>
  );
}

/**
 * Movimientos de Materiales (MA-01d, ADR 0025): el libro completo (ingreso, salida, préstamo, devolución, baja y ajuste)
 * con su cantidad con signo, filtrado por movimiento, tipo de salida, periodo y búsqueda. `?material=` lo limita a un
 * material (el enlace de su ficha); cada renglón abre la ficha del suyo. «Exportar» imprime lo filtrado o, para quien
 * administra, lo baja en Excel.
 */
export function MaterialsMovementsPage() {
  const { workspaceId, me, base, canReport } = useMaterials();
  const [params, setParams] = useSearchParams();
  const productId = params.get('material');
  const material = useMaterial(workspaceId, productId);
  const [kind, setKind] = useState<MaterialMovementKind | null>(null);
  const [purpose, setPurpose] = useState<IssuePurpose | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const q = search.trim();
  const backwards = from !== '' && to !== '' && from > to;
  const filters: MaterialMovementFilters = {
    ...(productId ? { productId } : {}),
    ...(kind ? { kind } : {}),
    ...(kind === 'issue' && purpose ? { purpose } : {}),
    ...(from ? { from } : {}),
    ...(to && !backwards ? { to } : {}),
    ...(q.length >= 2 ? { q } : {}),
  };
  const filtered = Object.keys(filters).length > 0;
  const movements = useMovementPage(workspaceId, filters);
  const exportMovements = useExportMovements(workspaceId);
  const rows = movements.data?.pages.flatMap((page) => page.items) ?? [];

  const exportMenu = (
    <ExportMenu
      compact
      disabled={movements.isPending}
      pending={exportMovements.isPending}
      onExcel={canReport ? () => exportMovements.mutate(filters, { onError: (error) => toast.error(materialsErrorMessage(error)) }) : null}
      renderPrint={(onClose) => <LedgerPrint movements={movements} filters={filters} materialName={material.data?.name} onClose={onClose} />}
    />
  );

  return (
    <>
      <SectionHeader title="Movimientos" updatedAt={movements.dataUpdatedAt} actions={exportMenu} />
      <div className="mt-6">
        <section aria-label="Libro de movimientos" className="overflow-hidden rounded-card bg-surface shadow-raised">
          <div className="grid gap-3 border-b border-line p-4 sm:p-5">
            {productId ? <MaterialChip name={material.data?.name} onRemove={() => setParams({}, { replace: true })} /> : null}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Movimiento">
              <FilterPill label="Todos" active={kind === null} onToggle={() => setKind(null)} />
              {materialMovementKind.options.map((value) => (
                <FilterPill key={value} label={materialMovementKindLabel[value]} active={kind === value} onToggle={() => setKind(kind === value ? null : value)} />
              ))}
            </div>
            {kind === 'issue' ? (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tipo de salida">
                <FilterPill label="Todas las salidas" active={purpose === null} onToggle={() => setPurpose(null)} />
                {purposes.map((value) => (
                  <FilterPill key={value} label={issuePurposeLabel[value]} active={purpose === value} onToggle={() => setPurpose(purpose === value ? null : value)} />
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,11rem))_minmax(0,1fr)] sm:items-end">
              <Field label="Desde">
                <Input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="h-11 sm:h-10" />
              </Field>
              <Field label="Hasta" error={backwards ? 'Termina antes de empezar' : undefined}>
                <Input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="h-11 sm:h-10" />
              </Field>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
                <Input
                  type="search"
                  aria-label="Buscar material, vale, referencia o persona"
                  placeholder="Buscar material, vale, referencia o persona"
                  autoComplete="off"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 pl-9 sm:h-10"
                />
              </div>
            </div>
          </div>
          {movements.isPending ? (
            <div aria-busy="true" className="p-4">
              <Skeleton className="h-48 rounded-panel" />
            </div>
          ) : movements.isError ? (
            <QueryErrorState error={movements.error} onRetry={() => void movements.refetch()} />
          ) : rows.length === 0 ? (
            <StatePanel
              icon={filtered ? SearchX : ScrollText}
              title={filtered ? 'Ningún movimiento coincide' : 'Aún no hay movimientos'}
              description={filtered ? 'Prueba con otro periodo o quita los filtros.' : 'Cada ingreso, salida, préstamo y devolución queda aquí.'}
            />
          ) : (
            <div className={`transition-opacity duration-200 ${movements.isPlaceholderData ? 'opacity-60' : ''}`}>
              <LedgerTable rows={rows} timeZone={me.workspace.timeZone} base={base} />
              {movements.hasNextPage ? (
                <div className="flex justify-center border-t border-line p-4">
                  <Button className="h-11 sm:h-10" onClick={() => void movements.fetchNextPage()} disabled={movements.isFetchingNextPage}>
                    {movements.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
