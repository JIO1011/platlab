import type { Activity, Space } from '@platlab/contracts';
import { Badge, Button, Sheet } from '@platlab/ui';
import { CalendarClock, MoveVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { formatFullDate } from '../../app/format';
import { overCapacity } from './schedule-grid';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[8rem_1fr] sm:gap-3">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-sm text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/**
 * Un bloque (ADR 0023): lo que la tabla ya muestra, con su fecha, el área y el aforo. Para quien no puede abrir su
 * solicitud es de solo lectura. Quien programa (`onMove`) suma «Mover…» (área, hora o responsable el mismo día) y
 * «Ver solicitud»; cambiar el día no se mueve aquí: es pedir cambios al docente desde la solicitud en Recibidas.
 */
export function ActivitySheet({
  activity,
  space,
  open,
  onOpenChange,
  onMove,
  requestHref,
}: {
  activity: Activity;
  space: Pick<Space, 'areaName' | 'abbreviation' | 'capacity'> | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Abre «Mover…»; solo quien programa. */
  onMove?: (() => void) | undefined;
  /** Dónde está la solicitud en Recibidas, para quien la puede abrir. */
  requestHref?: string | undefined;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={activity.title}
      description={`${activity.code} · ${activity.requestCode}`}
      icon={CalendarClock}
      footer={
        onMove ? (
          <div className="flex w-full items-center gap-3">
            {requestHref ? (
              <Link
                to={requestHref}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-line-strong bg-surface px-5 text-sm font-medium text-ink hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
              >
                Ver solicitud
              </Link>
            ) : null}
            <Button variant="primary" className="h-12 w-full flex-1 rounded-2xl text-base font-bold" onClick={onMove}>
              <MoveVertical aria-hidden />
              Mover…
            </Button>
          </div>
        ) : undefined
      }
    >
      <dl className="divide-y divide-line">
        <Fact label="Fecha">{formatFullDate(activity.date)}</Fact>
        <Fact label="Hora">
          <span className="tabular-nums">
            {activity.startsAt}–{activity.endsAt}
          </span>
        </Fact>
        <Fact label="Área">{space ? <>{space.areaName} <CodeTag>{space.abbreviation}</CodeTag></> : 'Área no disponible'}</Fact>
        <Fact label="Solicitante">{activity.requesterName}</Fact>
        {activity.group ? <Fact label="Grupo">{activity.group}</Fact> : null}
        <Fact label="Responsable">{activity.responsibleName}</Fact>
        <Fact label="Participantes">
          <span className="tabular-nums">
            {activity.participants}
            {space ? ` de ${space.capacity} de aforo` : ''}
          </span>{' '}
          {space && overCapacity(activity, space) ? (
            <Badge tone="warning">
              <span aria-hidden>⚠ </span>
              Supera el aforo
            </Badge>
          ) : null}
        </Fact>
        <Fact label="Código">
          <CodeTag>{activity.code}</CodeTag>
        </Fact>
      </dl>
      {onMove ? (
        <p className="mt-3 text-[13px] text-ink-muted">
          «Mover…» cambia el área, la hora o el responsable ese mismo día. Para cambiar el día, pide cambios al docente desde la solicitud.
        </p>
      ) : null}
    </Sheet>
  );
}
