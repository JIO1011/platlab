import type { AreaTypeList, AssetCondition } from '@platlab/contracts';
import { Button, Skeleton, StatePanel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { Microscope, QrCode, SearchX } from 'lucide-react';
import { Fragment } from 'react';
import { LabelBack } from '../../app/labels/label-flip';
import { QueryErrorState } from '../../app/states';
import { labelFit, Tile, tileGrid, tileHeight } from './asset-list';
import { stateParts } from './asset-text';
import { PickBox } from './pick-box';

export type AreaType = AreaTypeList['items'][number];

/** El filtro de estado de las cifras del membrete (los dados de baja no entran en las cifras por tipo). */
type TypeFilter = Exclude<AssetCondition, 'retired'> | null;

/** Cuántas unidades tiene el tipo con el filtro de estado: las de ese estado o, sin filtro, todas. */
export const typeUnits = (entry: AreaType, filter: TypeFilter) => (filter ? entry[filter] : entry.total);

/** Los tipos que se ven con el filtro: con una cifra del membrete activa, solo los que tienen equipos en ese estado. */
export const visibleTypes = (items: AreaType[], filter: TypeFilter) => (filter ? items.filter((entry) => entry[filter] > 0) : items);

/**
 * El modo etiquetas en los tipos (E-01d), solo en el área: `flipped` es el modo activo (los cuadros giran y las
 * filas suman su casilla); `count` dice cuántas unidades del tipo se eligen, de las `total` que tiene con el
 * filtro, y `onPick` lo elige o lo quita entero.
 */
export interface TypePicks {
  flipped: boolean;
  count: (typeId: string, total: number) => number;
  onPick: (typeId: string, total: number) => void;
}

/** Entero, a medias o nada: lo que dice la casilla y el texto de un tipo. */
const pickState = (count: number, total: number) => (count === 0 ? false : count === total ? true : ('mixed' as const));

/** Una cifra en cero se apaga: el color es para lo que hay. */
const countTone = (count: number, tone: string) => (count > 0 ? tone : 'text-ink-muted');

const toneClass = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;

/**
 * Un tipo del área: foto o icono, «Microscopio óptico ×50» y su estado en texto y color («47 operativos · 2 uso
 * limitado · 1 fuera de servicio»). Siempre con la pila de dos capas detrás: un tipo es un grupo y el ×N dice
 * cuántos. El botón con el nombre se extiende sobre todo el cuadro y abre sus unidades.
 */
function TypeTile({
  entry,
  total,
  picks,
  order,
  onOpen,
}: {
  entry: AreaType;
  total: number;
  picks: TypePicks | undefined;
  order: number;
  onOpen: () => void;
}) {
  const parts = stateParts(entry);
  return (
    <Tile
      photoUrl={entry.photoUrl}
      stacked
      labels={picks ? { flipped: picks.flipped, order, back: <TypeBack entry={entry} total={total} picks={picks} /> } : undefined}
    >
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

/** Unas etiquetas apiladas con el nombre del tipo y «×N»: elegir el cuadro elige todas las unidades del tipo. */
function LabelStack({ name, total }: { name: string; total: number }) {
  const layer = 'absolute inset-0 rounded-[2mm] border border-dashed border-line-strong';
  return (
    <div className="relative h-[33.9mm] w-[63.5mm]">
      <span aria-hidden className={cn(layer, 'translate-x-2 translate-y-2 bg-surface-sunken')} />
      <span aria-hidden className={cn(layer, 'translate-x-1 translate-y-1 bg-white')} />
      <div className={cn(layer, 'flex items-center gap-[3mm] bg-white p-[3mm]')}>
        <QrCode className="size-[22mm] shrink-0 text-ink-muted" strokeWidth={1.25} aria-hidden />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="line-clamp-3 break-words text-[8.5pt] font-semibold text-ink">{name}</p>
          <p className="mt-[1mm] text-lg font-bold tabular-nums text-action">×{total}</p>
        </div>
      </div>
    </div>
  );
}

/** El reverso del cuadro de un tipo: las etiquetas apiladas, la casilla y cuántas se imprimen («48 de 50» si se excluyeron). */
function TypeBack({ entry, total, picks }: { entry: AreaType; total: number; picks: TypePicks }) {
  const count = picks.count(entry.type.id, total);
  const state = pickState(count, total);
  return (
    <LabelBack
      flipped={picks.flipped}
      picked={state}
      label={`Etiquetas del tipo ${entry.type.name}`}
      status={state === false ? (total === 1 ? 'No se imprime' : 'No se imprimen') : state === true ? (count === 1 ? 'Se imprime 1' : `Se imprimen ${count}`) : `Se imprimen ${count} de ${total}`}
      onPick={() => picks.onPick(entry.type.id, total)}
      className="rounded-card"
    >
      <div className={labelFit}>
        <LabelStack name={entry.type.name} total={total} />
      </div>
    </LabelBack>
  );
}

/**
 * Los tipos del área en tabla (E-01c, «Por tipo» + «Lista»): Tipo, Cantidad y las tres condiciones. Cada fila abre
 * las unidades del tipo: el nombre es el botón y se extiende sobre la fila. Las condiciones salen a su columna
 * cuando la tarjeta mide lo bastante y, si no, bajan a una línea bajo el nombre.
 */
function TypesTable({ items, filter, picks, onOpen }: { items: AreaType[]; filter: TypeFilter; picks: TypePicks | undefined; onOpen: (typeId: string) => void }) {
  return (
    <div className="@container overflow-hidden rounded-card bg-surface shadow-raised">
      <Table>
        <TableHead>
          <tr>
            {picks?.flipped ? (
              <TableHeader className="w-14 pl-3 pr-0">
                <span className="sr-only">Etiquetas</span>
              </TableHeader>
            ) : null}
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
            const total = typeUnits(entry, filter);
            return (
              <TableRow
                key={entry.type.id}
                className="relative has-[button:focus-visible]:outline-2 has-[button:focus-visible]:-outline-offset-2 has-[button:focus-visible]:outline-action"
              >
                {picks?.flipped ? (
                  <TableCell className="pl-3 pr-0">
                    <PickBox
                      checked={pickState(picks.count(entry.type.id, total), total)}
                      label={`Etiquetas del tipo ${entry.type.name}`}
                      onChange={() => picks.onPick(entry.type.id, total)}
                    />
                  </TableCell>
                ) : null}
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
 * tienen equipos en ese estado. Con `picks`, el modo etiquetas (E-01d).
 */
export function AreaTypes({
  types,
  filter,
  list,
  picks,
  onOpen,
  onClear,
}: {
  types: UseQueryResult<AreaTypeList>;
  filter: TypeFilter;
  list: boolean;
  picks?: TypePicks | undefined;
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
  const items = visibleTypes(types.data.items, filter);
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
  if (list) return <TypesTable items={items} filter={filter} picks={picks} onOpen={onOpen} />;
  return (
    <ul aria-label="Tipos de equipo" className={tileGrid}>
      {items.map((entry, order) => (
        <TypeTile key={entry.type.id} entry={entry} total={typeUnits(entry, filter)} picks={picks} order={order} onOpen={() => onOpen(entry.type.id)} />
      ))}
    </ul>
  );
}
