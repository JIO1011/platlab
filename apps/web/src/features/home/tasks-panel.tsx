import type { HomeTask } from '@platlab/contracts';
import { IconChip, Skeleton, cn } from '@platlab/ui';
import { ChevronDown, ChevronRight, CircleCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { useShell } from '../../app/app-shell';
import { formatDate } from '../../app/format';
import { useHomeTasks } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { moduleIcon, panel, taskLink } from './shared';

const keyOf = (task: HomeTask) => `${task.moduleCode}:${task.kind}`;

/**
 * Por atender (ADR 0026): una fila por tipo de tarea, lo rojo antes que lo ámbar (el servidor ya las ordena). Cada fila
 * se despliega y muestra sus primeros casos, cada uno con su enlace, y «Ver todos» abre la lista filtrada de su módulo
 * (revisión de IN-02). La primera llega abierta. Sin nada pendiente, «Todo al día».
 */
export function TasksPanel({ className }: { className?: string }) {
  const { workspaceId } = useShell();
  const tasks = useHomeTasks(workspaceId);
  const titleId = useId();
  // Hasta que la persona abre o cierra alguna, la primera fila va abierta.
  const [opened, setOpened] = useState<ReadonlySet<string> | null>(null);
  const rows = tasks.data?.tasks ?? [];
  const open = opened ?? new Set(rows.slice(0, 1).map(keyOf));
  const toggle = (key: string) => {
    const next = new Set(open);
    if (!next.delete(key)) next.add(key);
    setOpened(next);
  };
  return (
    <section aria-labelledby={titleId} className={cn(panel, className)}>
      <div className="flex items-baseline gap-3">
        <h2 id={titleId} className="text-lg font-bold text-ink">
          Por atender
        </h2>
        {rows.length > 0 ? <p className="text-sm tabular-nums text-ink-muted">{rows.length === 1 ? '1 tipo de tarea' : `${rows.length} tipos de tarea`}</p> : null}
      </div>
      {tasks.isPending ? (
        <div className="mt-4 grid gap-2">
          <Skeleton className="h-14 rounded-panel" />
          <Skeleton className="h-14 rounded-panel" />
        </div>
      ) : tasks.isError ? (
        <div className="mt-4">
          <QueryErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-panel bg-success-soft p-4">
          <IconChip icon={CircleCheck} tone="success" size="sm" />
          <div>
            <p className="font-semibold text-ink">Todo al día</p>
            <p className="text-sm text-ink-muted">No hay nada pendiente en tus módulos.</p>
          </div>
        </div>
      ) : (
        <ul className="mt-3 grid divide-y divide-line">
          {rows.map((task) => (
            <TaskRow key={keyOf(task)} task={task} open={open.has(keyOf(task))} onToggle={() => toggle(keyOf(task))} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Una fila: el icono del módulo en el tono de la tarea, la cifra con su texto y «Urgente» o «Pendiente» en palabras. Al
 * desplegarse, sus casos y el paso a la lista completa.
 */
function TaskRow({ task, open, onToggle }: { task: HomeTask; open: boolean; onToggle: () => void }) {
  const { workspaceId, me } = useShell();
  const casesId = useId();
  const link = taskLink(workspaceId, task);
  if (!link) return null;
  const moduleName = me.modules.find((module) => module.code === task.moduleCode)?.name;
  const rest = task.count - task.cases.length;
  return (
    <li className="py-1">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={casesId}
          onClick={onToggle}
          className="group flex min-h-14 w-full items-center gap-3 rounded-panel px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-action"
        >
          <IconChip icon={moduleIcon(task.moduleCode)} tone={task.tone} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold tabular-nums text-ink">{link.text}</span>
            <span className="block text-[13px] text-ink-muted">
              {task.tone === 'danger' ? 'Urgente' : 'Pendiente'}
              {moduleName ? ` · ${moduleName}` : ''}
            </span>
          </span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-ink-subtle transition-transform duration-200 ease-out-expo motion-reduce:transition-none', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </h3>
      {/* Se abre por la altura de su contenido, sin saltos; cerrada, queda fuera del foco y del lector de pantalla. */}
      <div
        id={casesId}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out-expo motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="grid gap-0.5 pb-2 pl-12 pr-2">
            {task.cases.map((taskCase, index) => (
              <li key={`${taskCase.ref}:${index}`}>
                <Link
                  to={link.caseHref(taskCase)}
                  className="group/case flex min-h-11 items-center gap-2 rounded-control px-2 py-1.5 transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-action"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{taskCase.title}</span>
                    <span className="block truncate text-[12px] text-ink-muted">
                      {[taskCase.detail, taskCase.date && link.when ? link.when(formatDate(taskCase.date)) : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-transform duration-150 group-hover/case:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
            <li>
              <Link
                to={link.path}
                className="inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-sm font-semibold text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-action"
              >
                {rest > 0 ? `Ver los ${task.count}` : 'Abrir la lista'}
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </li>
  );
}
