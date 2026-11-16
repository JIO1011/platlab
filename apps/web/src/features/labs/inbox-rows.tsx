import type { RequestExceptions, RequestSummary } from '@platlab/contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { PracticeCode, RequestBadges } from './request-status';
import { exceptionsText, titleText, whenText } from './request-summary';

/** Lo que las filas de Recibidas necesitan de su pantalla: adónde abre cada una. */
interface InboxRowsProps {
  requests: readonly RequestSummary[];
  /** Cada solicitud abre su hoja. */
  hrefOf: (request: RequestSummary) => string;
}

/** Lo común de las filas: tinte al pasar y un anillo de foco que ocupa toda la fila. */
const rowStyle = 'relative transition-colors hover:bg-action-soft/60 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-action';

/** El título de la práctica: el enlace que se extiende a toda la fila. */
function RequestName({ request, href }: { request: RequestSummary; href: string }) {
  return (
    <p>
      <Link to={href} className={cn('min-w-0 break-words after:absolute after:inset-0 focus-visible:outline-none', request.title ? 'text-[15px] font-semibold text-ink' : 'text-ink-muted')}>
        {titleText(request)}
      </Link>
    </p>
  );
}

/** Solicitante · carrera · código de práctica (en mono, si ya está programada; decisión del usuario, 15-11-2026). */
function RequestFacts({ request }: { request: RequestSummary }) {
  return (
    <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 break-words text-sm text-ink-muted">
      <span>{request.requesterName}</span>
      {request.group ? (
        <>
          <span aria-hidden>·</span>
          <span>{request.group}</span>
        </>
      ) : null}
      {request.blockCodes.length > 0 ? (
        <>
          <span aria-hidden>·</span>
          <PracticeCode codes={request.blockCodes} />
        </>
      ) : null}
    </p>
  );
}

/** La primera fecha, su horario en mono y, si pide más días, «y 1 fecha más» debajo. */
function RequestWhen({ request }: { request: RequestSummary }) {
  const { date, time, more } = whenText(request);
  return (
    <span className="grid gap-0.5 tabular-nums">
      <span className="text-sm font-medium text-ink">{date}</span>
      {time ? <span className="font-mono text-xs text-ink-muted">{time}</span> : null}
      {more ? <span className="text-xs text-ink-muted">{more}</span> : null}
    </span>
  );
}

/** Los recursos que aún hay que mirar, por tipo («3 equipos por revisar»), en ámbar con su ícono, o «Sin pendientes». */
function RequestResources({ exceptions }: { exceptions: RequestExceptions }) {
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
export function InboxTable({ requests, hrefOf }: InboxRowsProps) {
  return (
    <Table>
        <TableHead>
          <tr>
            <TableHeader className="pl-5 pr-3">Solicitud</TableHeader>
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
              <TableCell className="pl-5 pr-3">
                <div className="grid min-w-0 gap-0.5">
                  <RequestName request={request} href={hrefOf(request)} />
                  <RequestFacts request={request} />
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

/** Debajo de `lg`: una fila apilada por solicitud con los mismos datos y el chevron a la derecha. */
export function InboxStack({ requests, hrefOf }: InboxRowsProps) {
  return (
    <ul className="divide-y divide-line border-t border-line">
      {requests.map((request) => (
          <li key={request.id} className={cn(rowStyle, 'flex items-start gap-3 px-4 py-4')}>
            <div className="grid min-w-0 flex-1 gap-2">
              <div className="grid gap-0.5">
                <RequestName request={request} href={hrefOf(request)} />
                <RequestFacts request={request} />
              </div>
              <RequestWhen request={request} />
              <RequestResources exceptions={request.exceptions} />
              <div className="flex flex-wrap items-center gap-1.5">
                <RequestBadges status={request.status} late={request.late} />
              </div>
            </div>
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
          </li>
      ))}
    </ul>
  );
}
