import type { RequestStatus } from '@platlab/contracts';
import { Badge } from '@platlab/ui';
import type { ReactNode } from 'react';
import { CodeTag } from '../../app/code-tag';
import type { RequestView } from './request-draft';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const statuses: Record<RequestStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  submitted: { label: 'Enviada', tone: 'info' },
  changes_requested: { label: 'Cambios solicitados', tone: 'warning' },
  scheduled: { label: 'Programada', tone: 'success' },
  rejected: { label: 'Rechazada', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
};

/**
 * El estado de una solicitud con su nombre en español y, si entró fuera de la anticipación, «Fuera de plazo». Con
 * `hideStatus` (una lista que ya es de un solo estado) solo queda lo que no repite el título.
 */
export function RequestBadges({ status, late, hideStatus = false }: { status: RequestStatus; late: boolean; hideStatus?: boolean }) {
  const { label, tone } = statuses[status];
  return (
    <>
      {hideStatus ? null : <Badge tone={tone}>{label}</Badge>}
      {late ? <Badge tone="warning">Fuera de plazo</Badge> : null}
    </>
  );
}

/** La solicitud abierta: su código, su estado y el formato con que se llenó; `children` son lo que va a su lado (quién la pide, acciones). */
export function RequestHeading({ request, children }: { request: RequestView; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      <CodeTag>{request.code}</CodeTag>
      <RequestBadges status={request.status} late={request.late} />
      <span className="min-w-0 break-words text-sm text-ink-muted">
        {request.formName} · revisión {request.formRevision}
      </span>
      {children}
    </div>
  );
}
