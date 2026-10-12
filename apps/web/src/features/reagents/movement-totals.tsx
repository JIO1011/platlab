import type { OperationGroupBy, OperationTotals } from '@platlab/contracts';
import { Quantity, Skeleton, StatePanel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { ChevronRight, Sigma } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { serializeMovementFilters, type MovementFilters } from './movement-filters';
import { countFormat, monthBounds, monthHeading, movementsText, noName, tight } from './movement-text';

type Group = OperationTotals['groups'][number];
type Row = Group['rows'][number];

/** Lo que cada tipo filtrado muestra: sin filtro de tipo, todas las columnas. */
function shownColumns(filters: MovementFilters) {
  const has = (type: MovementFilters['types'][number]) => filters.types.length === 0 || filters.types.includes(type);
  const receipts = has('receipt');
  const issues = has('issue');
  const adjustments = has('adjustment');
  // Con una sola columna de cantidad, Neto repetiría la misma cifra.
  const quantityColumns = [receipts, issues, adjustments].filter(Boolean).length;
  return { receipts, issues, adjustments, net: quantityColumns > 1, transfers: has('transfer') };
}

/**
 * Los filtros que abren Detalle con las filas de un renglón: los actuales, más ese reactivo y el
 * filtro del grupo. «Sin destino» no es un filtro que exista: esa fila no es un enlace.
 */
function detailFilters(filters: MovementFilters, groupBy: OperationGroupBy, group: Group, row: Row): MovementFilters | null {
  const next: MovementFilters = { ...filters, view: 'detail', productIds: [row.product.id] };
  if (groupBy === 'product') return next;
  if (group.key === null) return null;
  if (groupBy === 'responsible') return { ...next, responsibleIds: [group.key] };
  if (groupBy === 'destination') return { ...next, destinations: [group.key] };
  return { ...next, period: { kind: 'range', ...monthBounds(group.key) } };
}

function groupName(groupBy: OperationGroupBy, group: Group): string {
  if (groupBy === 'month') return monthHeading(group.key ?? '');
  if (groupBy === 'destination') return group.label ?? 'Sin destino';
  return group.label ?? noName;
}

/** Cifra con signo en tinta neutra: el color por tipo solo existe en el libro (Voz única). */
function Amount({ value, unit, signed = true }: { value: string | null; unit: string; signed?: boolean }) {
  if (value === null) {
    return (
      <>
        <span aria-hidden className="text-ink-subtle">—</span>
        <span className="sr-only">Ninguno</span>
      </>
    );
  }
  // Un neto en cero no lleva signo: «+0» sugiere una ganancia que no hubo.
  return <Quantity value={value} unit={unit} signed={signed && !/^-?0([.,]0+)?$/.test(value)} />;
}

/**
 * Totales del libro filtrado (R-01C, ADR 0014): una fila por reactivo y unidad, agrupadas por reactivo,
 * responsable, destino o mes. Cada fila abre Detalle con esos filtros. Tabla desde 42 rem de ancho de
 * la lista; por debajo, cada fila es una tarjeta apilada.
 */
export function MovementTotals({
  totals,
  filters,
  base,
}: {
  totals: UseQueryResult<OperationTotals>;
  filters: MovementFilters;
  base: string;
}) {
  if (totals.isPending) return <TotalsSkeleton />;
  if (totals.isError) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <QueryErrorState error={totals.error} onRetry={() => void totals.refetch()} />
      </div>
    );
  }
  const { groups, groupBy, truncated } = totals.data;
  if (groups.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel icon={Sigma} title="Sin movimientos para totalizar" description="Cambia o quita algún filtro para ver totales." />
      </div>
    );
  }
  const columns = shownColumns(filters);
  const hrefOf = (group: Group, row: Row) => {
    const next = detailFilters(filters, groupBy, group, row);
    return next ? `${base}/movimientos?${serializeMovementFilters(next)}` : null;
  };
  // Por reactivo, los renglones son una sola lista; en los demás, cada grupo lleva su encabezado.
  const sections: Array<{ key: string; heading: string | null; count: number; group: Group }> =
    groupBy === 'product'
      ? [{ key: 'todos', heading: null, count: 0, group: { key: null, label: null, count: 0, rows: groups.flatMap((group) => group.rows) } }]
      : groups.map((group, index) => ({ key: `${group.key ?? 'sin'}-${index}`, heading: groupName(groupBy, group), count: group.count, group }));
  return (
    <div className="grid gap-6">
      {sections.map((section) => (
        <section key={section.key} aria-label={section.heading ?? 'Totales por reactivo'} className="@container">
          {section.heading ? (
            <h2 className="mb-2 flex items-baseline gap-2 px-1 py-1 text-sm">
              <span className="font-bold text-ink">{section.heading}</span>
              <span className="ml-auto text-[13px] font-normal tabular-nums text-ink-muted">{movementsText(section.count)}</span>
            </h2>
          ) : null}
          <div className="overflow-hidden rounded-card bg-surface shadow-raised">
            <div className="hidden @2xl:block">
              <Table>
                <caption className="sr-only">{section.heading ?? 'Totales por reactivo'}</caption>
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TableHeader>Reactivo</TableHeader>
                    {columns.receipts ? <TableHeader numeric>Ingresos</TableHeader> : null}
                    {columns.issues ? <TableHeader numeric>Salidas</TableHeader> : null}
                    {columns.adjustments ? <TableHeader numeric>Ajustes</TableHeader> : null}
                    {columns.net ? <TableHeader numeric>Neto</TableHeader> : null}
                    {columns.transfers ? <TableHeader numeric>Traslados</TableHeader> : null}
                    <TableHeader numeric>Movimientos</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {section.group.rows.map((row) => {
                    const href = hrefOf(section.group, row);
                    return (
                      <TableRow key={`${row.product.id}-${row.unit}`} className={cn('group relative', href && 'hover:bg-surface-sunken/60')}>
                        <TableCell>
                          <ProductName row={row} href={href} stretched />
                        </TableCell>
                        {columns.receipts ? <TableCell numeric><Amount value={row.receipts} unit={row.unit} /></TableCell> : null}
                        {columns.issues ? <TableCell numeric><Amount value={row.issues} unit={row.unit} /></TableCell> : null}
                        {columns.adjustments ? <TableCell numeric><Amount value={row.adjustments} unit={row.unit} /></TableCell> : null}
                        {columns.net ? <TableCell numeric className="font-semibold"><Amount value={row.net} unit={row.unit} /></TableCell> : null}
                        {columns.transfers ? <TableCell numeric><Count value={row.transfers} /></TableCell> : null}
                        <TableCell numeric>
                          <span className="inline-flex items-center justify-end gap-2">
                            {countFormat.format(row.count)}
                            {/* El chevron dice que la fila abre Detalle; sin enlace, un hueco mantiene la columna alineada. */}
                            {href ? <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden /> : <span className="size-4 shrink-0" aria-hidden />}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y divide-line @2xl:hidden">
              {section.group.rows.map((row) => {
                const href = hrefOf(section.group, row);
                const cells: Array<[string, ReactNode]> = [];
                if (columns.receipts) cells.push(['Ingresos', <Amount key="r" value={row.receipts} unit={row.unit} />]);
                if (columns.issues) cells.push(['Salidas', <Amount key="i" value={row.issues} unit={row.unit} />]);
                if (columns.adjustments) cells.push(['Ajustes', <Amount key="a" value={row.adjustments} unit={row.unit} />]);
                if (columns.net) cells.push(['Neto', <Amount key="n" value={row.net} unit={row.unit} />]);
                if (columns.transfers) cells.push(['Traslados', <Count key="t" value={row.transfers} />]);
                cells.push(['Movimientos', countFormat.format(row.count)]);
                const content = (
                  <>
                    <p className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-bold text-ink">{tight(row.product.name)}</span>
                      {href ? <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden /> : null}
                    </p>
                    <p className="text-[13px] text-ink-muted">{row.product.code}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      {cells.map(([label, value]) => (
                        <div key={label} className="flex items-baseline justify-between gap-2">
                          <dt className="text-[13px] text-ink-muted">{label}</dt>
                          <dd className={cn('text-right tabular-nums text-ink', label === 'Neto' && 'font-semibold')}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                );
                return (
                  <li key={`${row.product.id}-${row.unit}`}>
                    {href ? (
                      <Link to={href} className="block px-4 py-3.5 transition-colors hover:bg-surface-sunken/60 focus-visible:-outline-offset-2">
                        {content}
                        <span className="sr-only">Ver movimientos en Detalle</span>
                      </Link>
                    ) : (
                      <div className="px-4 py-3.5">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ))}
      {truncated ? <p className="text-center text-[13px] text-ink-muted">Se muestran los primeros 1000 grupos; acota el periodo.</p> : null}
    </div>
  );
}

function ProductName({ row, href, stretched = false }: { row: Row; href: string | null; stretched?: boolean }) {
  const name = (
    <>
      <span className="block font-semibold decoration-ink-muted underline-offset-2 group-hover:underline group-focus-within:underline">{tight(row.product.name)}</span>
      <span className="block text-[13px] text-ink-muted">{row.product.code}</span>
    </>
  );
  if (!href) return <div>{name}</div>;
  return (
    <Link
      to={href}
      className={cn(
        'block rounded-sm focus-visible:outline-none',
        stretched && 'after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-action',
      )}
    >
      {name}
      <span className="sr-only">Ver movimientos en Detalle</span>
    </Link>
  );
}

/** Conteo de traslados: «—» cuando no hubo, como las demás columnas. */
function Count({ value }: { value: number }) {
  if (value === 0) {
    return (
      <>
        <span aria-hidden className="text-ink-subtle">—</span>
        <span className="sr-only">Ninguno</span>
      </>
    );
  }
  return <>{countFormat.format(value)}</>;
}

function TotalsSkeleton() {
  return (
    <div className="grid gap-3" role="status" aria-busy="true" aria-label="Cargando">
      <div className="rounded-card bg-surface shadow-raised">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-6 px-4 py-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="ml-auto h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
