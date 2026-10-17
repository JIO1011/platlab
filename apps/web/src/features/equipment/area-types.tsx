import type { AreaTypeList, AssetCondition } from '@platlab/contracts';
import { Button, Skeleton, StatePanel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { Microscope, SearchX } from 'lucide-react';
import { Fragment } from 'react';
import { QueryErrorState } from '../../app/states';
import { Tile, tileGrid, tileHeight } from './asset-list';
import { stateParts } from './asset-text';

type AreaType = AreaTypeList['items'][number];

/** Una cifra en cero se apaga: el color es para lo que hay. */
const countTone = (count: number, tone: string) => (count > 0 ? tone : 'text-ink-muted');

const toneClass = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;

/**
 * Un tipo del área: foto o icono, «Microscopio óptico ×50» y su estado en texto y color («47 operativos · 2 uso
 * limitado · 1 fuera de servicio»). Siempre con la pila de dos capas detrás: un tipo es un grupo y el ×N dice
 * cuántos. El botón con el nombre se extiende sobre todo el cuadro y abre sus unidades.
 */
function TypeTile({ entry, onOpen }: { entry: AreaType; onOpen: () => void }) {
  const parts = stateParts(entry);
  return (
    <Tile photoUrl={entry.photoUrl} stacked>
      <button
        type="button"
        onClick={onOpen}
        title={entry.type.name}
        className="flex w-full items-baseline gap-1.5 text-left text-[15px] font-semibold leading-tight text-ink after:absolute after:inset-0 focus-visible:outline-none"
      >
        {/* El nombre se recorta antes que el ×N: la cantidad es lo que agrupa el cuadro. */}
        <span className="min-w-0 truncate">{entry.type.name}</span>
        <span aria-hidden className="shrink-0 font-medium tabular-nums text-ink-muted">
          ×{entry.total}
        </span>
        <span className="sr-only">, {entry.total === 1 ? '1 equipo' : `${entry.total} equipos`}</span>
      </button>
      <p className="text-[13px] font-medium leading-snug tabular-nums">
        {parts.map((part, index) => (
          <Fragment key={part.text}>
            {index > 0 ? <span className="font-normal text-ink-subtle"> · </span> : null}
            <span className={toneClass[part.tone]}>{part.text}</span>
          </Fragment>
        ))}
      </p>
    </Tile>
  );
}

/**
 * Los tipos del área en tabla (E-01c, «Por tipo» + «Lista»): Tipo, Cantidad y las tres condiciones. Cada fila abre
 * las unidades del tipo: el nombre es el botón y se extiende sobre la fila. Las condiciones salen a su columna
 * cuando la tarjeta mide lo bastante y, si no, bajan a una línea bajo el nombre.
 */
function TypesTable({ items, onOpen }: { items: AreaType[]; onOpen: (typeId: string) => void }) {
  return (
    <div className="@container overflow-hidden rounded-card bg-surface shadow-raised">
      <Table>
        <TableHead>
          <tr>
            <TableHeader className="px-3 pl-5">Tipo</TableHeader>
            <TableHeader numeric className="px-3">
              Cantidad
            </TableHeader>
            <TableHeader numeric className="hidden px-3 @3xl:table-cell">
              Operativos
            </TableHeader>
            <TableHeader numeric className="hidden px-3 @3xl:table-cell">
              Uso limitado
            </TableHeader>
            <TableHeader numeric className="hidden px-3 pr-5 @3xl:table-cell">
              Fuera de servicio
            </TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {items.map((entry) => {
            const parts = stateParts(entry);
            return (
              <TableRow
                key={entry.type.id}
                className="relative has-[button:focus-visible]:outline-2 has-[button:focus-visible]:-outline-offset-2 has-[button:focus-visible]:outline-action"
              >
                <TableCell className="min-w-[12rem] px-3 pl-5">
                  <button
                    type="button"
                    onClick={() => onOpen(entry.type.id)}
                    className="break-words text-left font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none"
                  >
                    {entry.type.name}
                  </button>
                  <p className="mt-0.5 text-[13px] font-medium leading-snug @3xl:hidden">
                    {parts.map((part, index) => (
                      <Fragment key={part.text}>
                        {index > 0 ? <span className="font-normal text-ink-subtle"> · </span> : null}
                        <span className={toneClass[part.tone]}>{part.text}</span>
                      </Fragment>
                    ))}
                  </p>
                </TableCell>
                <TableCell numeric className="px-3 font-semibold">
                  {entry.total}
                </TableCell>
                <TableCell numeric className={cn('hidden px-3 @3xl:table-cell', countTone(entry.operational, 'text-success'))}>
                  {entry.operational}
                </TableCell>
                <TableCell numeric className={cn('hidden px-3 @3xl:table-cell', countTone(entry.restricted, 'text-warning'))}>
                  {entry.restricted}
                </TableCell>
                <TableCell numeric className={cn('hidden px-3 pr-5 @3xl:table-cell', countTone(entry.faulted, 'text-danger'))}>
                  {entry.faulted}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * El área agrupada por tipo (E-01c): un cuadro por tipo, o una tabla de tipos en «Lista». Con una cifra del membrete activa, solo los tipos que
 * tienen equipos en ese estado.
 */
export function AreaTypes({
  types,
  filter,
  list,
  onOpen,
  onClear,
}: {
  types: UseQueryResult<AreaTypeList>;
  filter: Exclude<AssetCondition, 'retired'> | null;
  list: boolean;
  onOpen: (typeId: string) => void;
  onClear: () => void;
}) {
  if (types.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label="Cargando" className={tileGrid}>
        {[0, 1, 2, 3].map((tile) => (
          <Skeleton key={tile} className={`${tileHeight} rounded-card`} />
        ))}
      </div>
    );
  }
  if (types.isError) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <QueryErrorState error={types.error} onRetry={() => void types.refetch()} />
      </div>
    );
  }
  const items = filter ? types.data.items.filter((entry) => entry[filter] > 0) : types.data.items;
  if (items.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel
          icon={filter ? SearchX : Microscope}
          title={filter ? 'Sin equipos en este estado' : 'Esta área aún no tiene equipos'}
          description={filter ? 'Quita el filtro para ver todos los tipos del área.' : 'Los equipos que se registren aquí aparecerán en este lugar.'}
          action={
            filter ? (
              <Button size="sm" onClick={onClear}>
                Quitar filtro
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }
  if (list) return <TypesTable items={items} onOpen={onOpen} />;
  return (
    <ul aria-label="Tipos de equipo" className={tileGrid}>
      {items.map((entry) => (
        <TypeTile key={entry.type.id} entry={entry} onOpen={() => onOpen(entry.type.id)} />
      ))}
    </ul>
  );
}
