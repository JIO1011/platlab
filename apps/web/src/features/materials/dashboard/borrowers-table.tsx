import type { MaterialsDashboard } from '@platlab/contracts';
import { Quantity, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@platlab/ui';
import { dayInZone, relativeDays } from '../../../app/format';
import { initialsOf } from '../../../app/initials';

/**
 * Quién presta más en el periodo (ADR 0025), solo para quien administra el catálogo: nombre, vales, unidades y cuándo
 * fue el último. Sirve para dar seguimiento, no para calificar a nadie.
 */
export function BorrowersTable({ rows, today, timeZone }: { rows: NonNullable<MaterialsDashboard['topBorrowers']>; today: string; timeZone: string }) {
  if (rows.length === 0) return <p className="py-4 text-sm text-ink-muted">Nadie pidió material prestado en este periodo.</p>;
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>Nombre</TableHeader>
          <TableHeader numeric>Vales</TableHeader>
          <TableHeader numeric>Unidades</TableHeader>
          <TableHeader>Último préstamo</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>
              <span className="flex items-center gap-3">
                <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-action-soft text-xs font-bold text-action">
                  {initialsOf(row.name)}
                </span>
                <span className="font-medium text-ink">{row.name}</span>
              </span>
            </TableCell>
            <TableCell numeric>{row.loans}</TableCell>
            <TableCell numeric>
              <Quantity value={row.units} unit="u" />
            </TableCell>
            <TableCell className="text-ink-muted first-letter:uppercase">{relativeDays(dayInZone(row.lastAt, timeZone), today)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
