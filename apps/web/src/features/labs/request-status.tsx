import type { RequestStatus } from '@platlab/contracts';
import { Badge } from '@platlab/ui';
import type { ReactNode } from 'react';
import { CodeTag } from '../../app/code-tag';
import type { RequestView } from './request-draft';

export type Tone = 'neutral' | 'info' | 'strong' | 'success' | 'warning' | 'danger';

const statuses: Record<RequestStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  submitted: { label: 'Enviada', tone: 'info' },
  changes_requested: { label: 'Cambios solicitados', tone: 'warning' },
  scheduled: { label: 'Programada', tone: 'success' },
  completed: { label: 'Finalizada', tone: 'success' },
  rejected: { label: 'Rechazada', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
};

/**
 * Una pastilla de estado al modo de la Propuesta: un punto del color del estado y su texto (el color nunca va solo), con
 * aire y letra de 13 px. Con `icon`, el ícono ocupa el lugar del punto.
 */
export function Pill({ tone, icon, children }: { tone: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <Badge tone={tone} className="gap-1.5 px-2.5 py-1 text-[13px]">
      {icon ?? <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </Badge>
  );
}

/**
 * El estado de una solicitud con su nombre en español y, si entró fuera de la anticipación, «Fuera de plazo». Con
 * `hideStatus` (una lista que ya es de un solo estado) solo queda lo que no repite el título.
 */
export function RequestBadges({ status, late, hideStatus = false }: { status: RequestStatus; late: boolean; hideStatus?: boolean }) {
  const { label, tone } = statuses[status];
  return (
    <>
      {hideStatus ? null : <Pill tone={tone}>{label}</Pill>}
      {late ? <Pill tone="warning">Fuera de plazo</Pill> : null}
    </>
  );
}

/** La solicitud abierta: su código, su estado y el formato con que se llenó; `children` son lo que va a su lado (quién la pide, acciones). */
export function RequestHeading({ request, children }: { request: RequestView; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <CodeTag>{request.code}</CodeTag>
      <RequestBadges status={request.status} late={request.late} />
      <span className="min-w-0 break-words text-sm text-ink-muted">
        {request.formName} · revisión {request.formRevision}
      </span>
      {children}
    </div>
  );
}
