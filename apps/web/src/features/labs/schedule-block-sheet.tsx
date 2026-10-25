import type { Activity, Space } from '@platlab/contracts';
import { Badge, Sheet } from '@platlab/ui';
import { CalendarClock } from 'lucide-react';
import type { ReactNode } from 'react';
import { CodeTag } from '../../app/code-tag';
import { formatFullDate } from '../../app/format';
import { blockText, overCapacity } from './schedule-grid';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[8rem_1fr] sm:gap-3">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-sm text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/**
 * Un bloque de solo lectura (ADR 0023): para quien no puede abrir su solicitud (un Docente ante el bloque de otro), la
 * materia, la carrera y el docente del bloque con su fecha, hora, área, responsable y aforo. Quien programa o recibe
 * abre la solicitud con un clic y mueve el bloque con «Mover…».
 */
export function ActivitySheet({
  activity,
  space,
  open,
  onOpenChange,
}: {
  activity: Activity;
  space: Pick<Space, 'areaName' | 'abbreviation' | 'capacity'> | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={blockText(activity)} description={`${activity.code} · ${activity.requestCode}`} icon={CalendarClock}>
      <dl className="divide-y divide-line">
        <Fact label="Fecha">{formatFullDate(activity.date)}</Fact>
        <Fact label="Hora">
          <span className="tabular-nums">
            {activity.startsAt}–{activity.endsAt}
          </span>
        </Fact>
        <Fact label="Área">{space ? <>{space.areaName} <CodeTag>{space.abbreviation}</CodeTag></> : 'Área no disponible'}</Fact>
        <Fact label="Materia">{activity.subject ?? activity.title}</Fact>
        {activity.group ? <Fact label="Carrera">{activity.group}</Fact> : null}
        <Fact label="Docente">{activity.requesterName}</Fact>
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
    </Sheet>
  );
}
