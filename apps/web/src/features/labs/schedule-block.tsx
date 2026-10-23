import type { Activity, Space } from '@platlab/contracts';
import { Badge } from '@platlab/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { activityLabel, activityParts, overCapacity } from './schedule-grid';

/** Cómo se abre un bloque: la solicitud para quien puede verla y, para los demás, un panel de solo lectura con lo que el bloque muestra. */
export interface BlockOpening {
  /** Dónde está la solicitud del bloque para esta persona; nulo si no la puede ver (el Administrador y el Operador, en Recibidas; el Docente, solo la suya). */
  linkOf: (activity: Activity) => string | null;
  /** Abre el panel de solo lectura del bloque. */
  onInspect: (activity: Activity) => void;
}

/** El bloque como un solo control con su nombre completo: un enlace a la solicitud o un botón que abre el panel. */
export function BlockTarget({ activity, opening, className, children }: { activity: Activity; opening: BlockOpening; className: string; children: ReactNode }) {
  const to = opening.linkOf(activity);
  const label = activityLabel(activity);
  return to ? (
    <Link to={to} aria-label={label} className={className}>
      {children}
    </Link>
  ) : (
    <button type="button" aria-label={label} aria-haspopup="dialog" onClick={() => opening.onInspect(activity)} className={className}>
      {children}
    </button>
  );
}

/** Lo que dice un bloque: «Actividad · Solicitante · Grupo», la hora con el código, el responsable y, si se supera, el aforo. */
export function BlockBody({ activity, space }: { activity: Activity; space: Pick<Space, 'capacity'> }) {
  const [title, ...rest] = activityParts(activity);
  return (
    <>
      <span className="block text-sm leading-snug [overflow-wrap:anywhere]">
        <span className="font-semibold text-ink">{title}</span>
        {rest.length > 0 ? <span className="text-ink-muted"> · {rest.join(' · ')}</span> : null}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
        <span className="font-medium tabular-nums text-ink">
          {activity.startsAt}–{activity.endsAt}
        </span>
        <CodeTag>{activity.code}</CodeTag>
        {overCapacity(activity, space) ? (
          <Badge tone="warning">
            <span aria-hidden>⚠ </span>
            Aforo {activity.participants} / {space.capacity}
          </Badge>
        ) : null}
      </span>
      <span className="mt-0.5 block text-[13px] text-ink-muted [overflow-wrap:anywhere]">Responsable: {activity.responsibleName}</span>
    </>
  );
}
