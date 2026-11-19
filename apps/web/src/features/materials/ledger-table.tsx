import { materialMovementKindLabel, type MaterialMovement } from '@platlab/contracts';
import { Quantity, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import { Link } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { formatShortDateTime } from '../../app/format';
import { kindTone, movementNote, movementReference } from './ledger-text';

const signTone = (quantity: string) => (quantity.startsWith('-') ? 'text-ink' : 'text-success');

/** El material del renglón: nombre (abre su ficha en el Inventario), código y, si vence, su lote. */
function Item({ row, base }: { row: MaterialMovement; base: string }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <Link to={`${base}/inventario?material=${row.product.id}`} className="w-fit font-medium text-ink underline-offset-2 hover:text-action hover:underline">
        {row.product.name}
      </Link>
      <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-muted">
        <CodeTag>{row.product.code}</CodeTag>
        {row.lot ? <span>Lote {row.lot}</span> : null}
      </span>
    </div>
  );
}

/**
 * El libro de Materiales (MA-01d): en escritorio una tabla (fecha, movimiento, material, ubicación, cantidad con signo y
 * referencia con quién y para qué); en el móvil, cada renglón apilado. Solo se lee: no hay «deshacer» en un movimiento
 * confirmado.
 */
export function LedgerTable({ rows, timeZone, base }: { rows: MaterialMovement[]; timeZone: string; base: string }) {
  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => {
          const note = movementNote(row);
          return (
            <li key={row.id} className="grid gap-1.5 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <Item row={row} base={base} />
                <Quantity value={row.quantity} unit={row.unit} signed className={cn('shrink-0 font-semibold', signTone(row.quantity))} />
              </div>
              <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-muted">
                <span className={cn('font-semibold', kindTone[row.kind])}>{materialMovementKindLabel[row.kind]}</span>
                <span>{formatShortDateTime(row.at, timeZone)}</span>
                <span>· {row.place}</span>
              </p>
              <p className="text-[13px] text-ink">{movementReference(row)}</p>
              {note ? <p className="text-[12px] text-ink-muted">{note}</p> : null}
            </li>
          );
        })}
      </ul>
      <div className="hidden md:block">
        <Table>
          <caption className="sr-only">Libro de movimientos de Materiales</caption>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              <TableHeader>Fecha</TableHeader>
              <TableHeader>Movimiento</TableHeader>
              <TableHeader>Material</TableHeader>
              <TableHeader>Ubicación</TableHeader>
              <TableHeader numeric>Cantidad</TableHeader>
              <TableHeader>Referencia y motivo</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const note = movementNote(row);
              return (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-[13px] tabular-nums text-ink-muted">{formatShortDateTime(row.at, timeZone)}</TableCell>
                  <TableCell className={cn('whitespace-nowrap font-semibold', kindTone[row.kind])}>{materialMovementKindLabel[row.kind]}</TableCell>
                  <TableCell className="min-w-48">
                    <Item row={row} base={base} />
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">{row.place}</TableCell>
                  <TableCell numeric>
                    <Quantity value={row.quantity} unit={row.unit} signed className={cn('font-semibold', signTone(row.quantity))} />
                  </TableCell>
                  <TableCell className="min-w-56">
                    <p className="text-[13px] text-ink">{movementReference(row)}</p>
                    {note ? <p className="text-[12px] text-ink-muted">{note}</p> : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
