import type { RequestStatus } from '@platlab/contracts';
import { Badge } from '@platlab/ui';
import type { ReactNode } from 'react';
import type { RequestView } from './request-draft';
import { practiceCodeText } from './request-summary';

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

/** El estado de una solicitud con su nombre en español y, si entró fuera de la anticipación, «Fuera de plazo». */
export function RequestBadges({ status, late }: { status: RequestStatus; late: boolean }) {
  const { label, tone } = statuses[status];
  return (
    <>
      <Pill tone={tone}>{label}</Pill>
      {late ? <Pill tone="warning">Fuera de plazo</Pill> : null}
    </>
  );
}

/** El código de práctica de los bloques de la solicitud en mono («P1-S11-FIS01») y, si son varios, «+N»; sin bloques, nada. */
export function PracticeCode({ codes }: { codes: readonly string[] }) {
  const practice = practiceCodeText(codes);
  if (!practice) return null;
  return (
    <span className="font-mono text-xs font-medium tabular-nums text-ink-muted">
      {practice.code}
      {practice.more ? <span className="ml-1">{practice.more}</span> : null}
    </span>
  );
}

/** La solicitud abierta: su código de práctica si está programada, su estado y el formato con que se llenó; `children` son lo que va a su lado (quién la pide, acciones). */
export function RequestHeading({ request, children }: { request: RequestView; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <PracticeCode codes={request.blockCodes} />
      <RequestBadges status={request.status} late={request.late} />
      <span className="min-w-0 break-words text-sm text-ink-muted">
        {request.formName} · revisión {request.formRevision}
      </span>
      {children}
    </div>
  );
}
