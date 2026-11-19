import type { HomeTask } from '@platlab/contracts';
import { IconChip, Skeleton, cn } from '@platlab/ui';
import { ChevronRight, CircleCheck } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { useShell } from '../../app/app-shell';
import { useHomeTasks } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { moduleIcon, panel, taskLink } from './shared';

/**
 * Por atender (ADR 0026): una fila por tipo de tarea, lo rojo antes que lo ámbar (el servidor ya las ordena), y cada fila
 * abre la lista ya filtrada de su módulo. Sin nada pendiente, «Todo al día».
 */
export function TasksPanel({ className }: { className?: string }) {
  const { workspaceId } = useShell();
  const tasks = useHomeTasks(workspaceId);
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cn(panel, className)}>
      <h2 id={titleId} className="text-lg font-bold text-ink">
        Por atender
      </h2>
      {tasks.isPending ? (
        <div className="mt-4 grid gap-2">
          <Skeleton className="h-14 rounded-panel" />
          <Skeleton className="h-14 rounded-panel" />
        </div>
      ) : tasks.isError ? (
        <div className="mt-4">
          <QueryErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
        </div>
      ) : tasks.data.tasks.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-panel bg-success-soft p-4">
          <IconChip icon={CircleCheck} tone="success" size="sm" />
          <div>
            <p className="font-semibold text-ink">Todo al día</p>
            <p className="text-sm text-ink-muted">No hay nada pendiente en tus módulos.</p>
          </div>
        </div>
      ) : (
        <ul className="mt-3 grid gap-1">
          {tasks.data.tasks.map((task) => (
            <TaskRow key={`${task.moduleCode}:${task.kind}`} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Una fila: el icono del módulo en el tono de la tarea, la cifra con su texto, y «Urgente» o «Pendiente» en palabras. */
function TaskRow({ task }: { task: HomeTask }) {
  const { workspaceId, me } = useShell();
  const link = taskLink(workspaceId, task);
  if (!link) return null;
  const moduleName = me.modules.find((module) => module.code === task.moduleCode)?.name;
  return (
    <li>
      <Link
        to={link.path}
        className="group -mx-2 flex min-h-14 items-center gap-3 rounded-panel px-2 py-2 transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-action"
      >
        <IconChip icon={moduleIcon(task.moduleCode)} tone={task.tone} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold tabular-nums text-ink">{link.text}</span>
          <span className="block text-[13px] text-ink-muted">
            {task.tone === 'danger' ? 'Urgente' : 'Pendiente'}
            {moduleName ? ` · ${moduleName}` : ''}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}
