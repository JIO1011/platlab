import type { AgendaItem, HomeTask } from '@platlab/contracts';
import { Boxes } from 'lucide-react';
import { webModule } from '../../app/modules';

/** La tarjeta de cada panel de «Tareas»: blanca, de esquinas amplias y elevada, como las del Inicio. */
export const panel = 'rounded-card bg-surface p-5 shadow-raised sm:p-6';

/** El icono de un módulo; el genérico si la web no lo conoce. */
export const moduleIcon = (moduleCode: string) => webModule(moduleCode)?.Icon ?? Boxes;

/** El nombre que un módulo da a un tipo de actividad, para contar los días del Calendario. */
export const agendaNoun = (moduleCode: string, type: string) => webModule(moduleCode)?.home.agenda?.[type]?.noun;

/** Dónde se abre una actividad en su módulo; null si el módulo no lo declara. */
export function agendaPath(workspaceId: string, item: AgendaItem, date: string): string | null {
  const href = webModule(item.moduleCode)?.home.agenda?.[item.type]?.href(item, date);
  return href ? `/e/${workspaceId}/${href}` : null;
}

/** El texto de una fila de «Por atender» («3 prácticas por cerrar») y la lista filtrada que abre; null si no se conoce. */
export function taskLink(workspaceId: string, task: HomeTask): { text: string; path: string } | null {
  const entry = webModule(task.moduleCode)?.home.tasks?.[task.kind];
  return entry ? { text: `${task.count} ${entry.label(task.count)}`, path: `/e/${workspaceId}/${entry.href}` } : null;
}
