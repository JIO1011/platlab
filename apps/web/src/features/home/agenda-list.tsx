import type { AgendaItem, AgendaStatus } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { CircleCheck, CircleDot, Clock, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { useShell } from '../../app/app-shell';
import { statusOrder, statusText, timeLabel } from './agenda';
import { agendaPath } from './shared';

export const statusIcon: Record<AgendaStatus, LucideIcon> = { in_progress: CircleDot, upcoming: Clock, done: CircleCheck };

/** En curso, relleno con la acción; por iniciar, contorno de la acción; finalizada, apagada. El icono y el texto lo dicen también. */
export const statusTone: Record<AgendaStatus, string> = {
  in_progress: 'bg-action text-on-action',
  upcoming: 'bg-surface text-ink ring-1 ring-inset ring-action/45',
  done: 'bg-surface-sunken text-ink-muted',
};

/** «Lab. de Química · P1-S12-QUI01 · Ing. Química»: dónde y qué, para la lista. */
const placeText = (item: AgendaItem) => [item.area?.name, item.detail].filter(Boolean).join(' · ');

/** «Laboratorios · Titulación ácido-base (Lab. de Química · P1-S12), 08:00–10:00, en proceso»: lo que lee un lector de pantalla. */
function itemLabel(item: AgendaItem, moduleName: string | undefined): string {
  const place = placeText(item);
  return [moduleName, `${item.title}${place ? ` (${place})` : ''}`, timeLabel(item), statusText[item.status].one.toLowerCase()]
    .filter(Boolean)
    .join(', ');
}

/** Una actividad como enlace a su módulo, o como texto si el módulo no dice dónde se abre. */
export function ItemLink({ item, date, className, style, children }: { item: AgendaItem; date: string; className: string; style?: CSSProperties; children: ReactNode }) {
  const { workspaceId, me } = useShell();
  const path = agendaPath(workspaceId, item, date);
  const label = itemLabel(item, me.modules.find((module) => module.code === item.moduleCode)?.name);
  return path ? (
    <Link to={path} aria-label={label} title={label} className={cn(className, 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action')} style={style}>
      {children}
    </Link>
  ) : (
    <div aria-label={label} title={label} role="group" className={className} style={style}>
      {children}
    </div>
  );
}

function Entry({ item, date }: { item: AgendaItem; date: string }) {
  const Icon = statusIcon[item.status];
  const place = placeText(item);
  return (
    <ItemLink item={item} date={date} className={cn('flex min-h-14 items-center gap-3 rounded-control px-3 py-2 transition-shadow duration-150 hover:shadow-raised', statusTone[item.status])}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{item.title}</span>
        <span className="block truncate text-[12px] tabular-nums opacity-80">
          {timeLabel(item)}
          {place ? ` · ${place}` : ''}
        </span>
      </span>
    </ItemLink>
  );
}

/**
 * Las actividades de un día en lista: por hora, o agrupadas por estado (en proceso, por iniciar, finalizadas) en la
 * Actividad del móvil. Cada una abre en su módulo.
 */
export function AgendaList({ items, date, grouped = false }: { items: AgendaItem[]; date: string; grouped?: boolean }) {
  const list = (entries: AgendaItem[]) => (
    <ul className="grid gap-1.5">
      {entries.map((item, index) => (
        <li key={`${item.moduleCode}:${item.ref}:${index}`}>
          <Entry item={item} date={date} />
        </li>
      ))}
    </ul>
  );
  if (!grouped) return list(items);
  return (
    <div className="grid gap-4">
      {statusOrder.map((status) => {
        const group = items.filter((item) => item.status === status);
        if (group.length === 0) return null;
        return (
          <div key={status}>
            <h3 className="mb-1.5 text-[13px] font-semibold text-ink-muted">
              {statusText[status].group} <span className="tabular-nums">({group.length})</span>
            </h3>
            {list(group)}
          </div>
        );
      })}
    </div>
  );
}
