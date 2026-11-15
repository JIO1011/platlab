import type { RequestSummary } from '@platlab/contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PracticeCode, RequestBadges } from './request-status';
import { exceptionsText, whenText } from './request-summary';

/** Lo que las filas de Recibidas necesitan de su pantalla: adónde abre cada una, su sigla y su casilla de elegir. */
interface InboxRowsProps {
  requests: readonly RequestSummary[];
  /** Cada solicitud abre su hoja. */
  hrefOf: (request: RequestSummary) => string;
  /** La sigla del área de la solicitud; sin área o sin espacio, ninguna. */
  abbreviationOf: (request: RequestSummary) => string | undefined;
  /** La casilla de elegir la fila, o nada si no se puede aprobar; con `selectable`, la tabla le reserva su columna. */
  leading: (request: RequestSummary) => ReactNode;
  selectable: boolean;
}

/** Lo común de las filas: tinte al pasar y un anillo de foco que ocupa toda la fila. */
const rowStyle = 'relative transition-colors hover:bg-action-soft/60 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-action';

/** El código de la solicitud y el de su práctica en mono, sin caja, y su título: el enlace que se extiende a toda la fila. */
function RequestName({ request, href }: { request: RequestSummary; href: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-mono text-xs font-medium tabular-nums text-ink-muted">{request.code}</span>
      <PracticeCode codes={request.blockCodes} />
      <Link to={href} className={cn('min-w-0 break-words after:absolute after:inset-0 focus-visible:outline-none', request.title ? 'text-[15px] font-semibold text-ink' : 'text-ink-muted')}>
        {request.title ?? 'Sin título'}
      </Link>
    </p>
  );
}

/** Solicitante · formato · sigla del área (esta, en mono); sin área o sin espacio, la sigla se omite. */
function RequestFacts({ request, abbreviation }: { request: RequestSummary; abbreviation: string | undefined }) {
  return (
    <p className="min-w-0 break-words text-sm text-ink-muted">
      {request.requesterName} <span aria-hidden>·</span> {request.formName}
      {abbreviation ? (
        <>
          {' '}
          <span aria-hidden>·</span> <span className="font-mono text-xs font-medium">{abbreviation}</span>
        </>
      ) : null}
    </p>
  );
}

/** Fecha, horario en mono y, si pide más días, cuántos más. */
function RequestWhen({ request }: { request: RequestSummary }) {
  const { date, time, more } = whenText(request);
  return (
    <span className="grid gap-0.5 tabular-nums">
      <span className="text-sm font-medium text-ink">
        {date}
        {more ? <span className="font-normal text-ink-muted"> {more}</span> : null}
      </span>
      {time ? <span className="font-mono text-xs text-ink-muted">{time}</span> : null}
    </span>
  );
}

/** Los recursos que aún hay que mirar, en ámbar con su ícono, o «Sin pendientes». */
function RequestResources({ exceptions }: { exceptions: number }) {
  const pending = exceptionsText(exceptions);
  return pending ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warning">
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      {pending}
    </span>
  ) : (
    <span className="text-sm text-ink-muted">Sin pendientes</span>
  );
}

/** Desde `lg`: Solicitud, Fecha y hora, Recursos y Estado en columnas; la fila entera abre la solicitud. */
export function InboxTable({ requests, hrefOf, abbreviationOf, leading, selectable }: InboxRowsProps) {
  return (
    <Table>
        <TableHead>
          <tr>
            {selectable ? (
              <TableHeader className="w-12 px-0">
                <span className="sr-only">Elegir</span>
              </TableHeader>
            ) : null}
            <TableHeader className={cn('pl-5 pr-3', selectable && 'pl-0')}>Solicitud</TableHeader>
            <TableHeader className="w-36 px-3">Fecha y hora</TableHeader>
            <TableHeader className="w-44 px-3">Recursos</TableHeader>
            <TableHeader className="w-40 px-3 text-right">Estado</TableHeader>
            <TableHeader className="w-8 px-0 pr-3">
              <span className="sr-only">Abrir</span>
            </TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id} className={rowStyle}>
              {selectable ? (
                // La casilla va sobre el enlace de la fila para que pulsarla no abra la solicitud.
                <TableCell className="w-12 px-0">
                  <span className="relative z-10 mx-auto block w-fit">{leading(request)}</span>
                </TableCell>
              ) : null}
              <TableCell className={cn('pl-5 pr-3', selectable && 'pl-0')}>
                <div className="grid min-w-0 gap-0.5">
                  <RequestName request={request} href={hrefOf(request)} />
                  <RequestFacts request={request} abbreviation={abbreviationOf(request)} />
                </div>
              </TableCell>
              <TableCell className="px-3">
                <RequestWhen request={request} />
              </TableCell>
              <TableCell className="px-3">
                <RequestResources exceptions={request.exceptions} />
              </TableCell>
              <TableCell className="px-3">
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <RequestBadges status={request.status} late={request.late} />
                </div>
              </TableCell>
              <TableCell className="w-8 px-0 pr-3 text-ink-subtle">
                <ChevronRight className="size-4" aria-hidden />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
    </Table>
  );
}

/** Debajo de `lg`: una fila apilada por solicitud con los mismos datos, la casilla a la izquierda y el chevron a la derecha. */
export function InboxStack({ requests, hrefOf, abbreviationOf, leading }: InboxRowsProps) {
  return (
    <ul className="divide-y divide-line border-t border-line">
      {requests.map((request) => {
        const checkbox = leading(request);
        return (
          <li key={request.id} className={cn(rowStyle, 'flex items-start gap-3 px-4 py-4')}>
            {checkbox ? <span className="relative z-10 -my-2.5 -ml-2.5 shrink-0">{checkbox}</span> : null}
            <div className="grid min-w-0 flex-1 gap-2">
              <div className="grid gap-0.5">
                <RequestName request={request} href={hrefOf(request)} />
                <RequestFacts request={request} abbreviation={abbreviationOf(request)} />
              </div>
              <RequestWhen request={request} />
              <RequestResources exceptions={request.exceptions} />
              <div className="flex flex-wrap items-center gap-1.5">
                <RequestBadges status={request.status} late={request.late} />
              </div>
            </div>
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
          </li>
        );
      })}
    </ul>
  );
}
