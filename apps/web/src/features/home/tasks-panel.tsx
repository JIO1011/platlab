import type { HomeTask } from '@platlab/contracts';
import { IconChip, Skeleton, cn } from '@platlab/ui';
import { ChevronDown, ChevronRight, CircleCheck, Clock, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { useShell } from '../../app/app-shell';
import { countText, formatDate } from '../../app/format';
import { useHomeTasks } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { moduleIcon, panel, taskLink } from './shared';

const keyOf = (task: HomeTask) => `${task.moduleCode}:${task.kind}`;

/** Las filas agrupadas por módulo, en el orden en que llegan: el servidor pone lo rojo primero. */
function byModule(tasks: readonly HomeTask[]): Array<{ moduleCode: string; tasks: HomeTask[] }> {
  const groups = new Map<string, HomeTask[]>();
  for (const task of tasks) groups.set(task.moduleCode, [...(groups.get(task.moduleCode) ?? []), task]);
  return [...groups].map(([moduleCode, own]) => ({ moduleCode, tasks: own }));
}

/**
 * Por atender (ADR 0026, segunda revisión de IN-02): una tarjeta por módulo con algo pendiente, la de algo rojo primero.
 * Dentro, una fila por tipo de tarea que se despliega con sus primeros casos; «Ver los N» abre la lista filtrada de su
 * módulo. Sin nada pendiente, «Todo al día».
 */
export function TasksPanel({ className }: { className?: string }) {
  const { workspaceId } = useShell();
  const tasks = useHomeTasks(workspaceId);
  const titleId = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) => {
    const next = new Set(open);
    if (!next.delete(key)) next.add(key);
    setOpen(next);
  };
  const rows = tasks.data?.tasks ?? [];
  const urgent = rows.filter((task) => task.tone === 'danger').length;
  return (
    <section aria-labelledby={titleId} className={className}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
        <h2 id={titleId} className="text-lg font-bold text-ink">
          Por atender
        </h2>
        {rows.length > 0 ? (
          <p className="text-sm tabular-nums text-ink-muted">
            {urgent > 0 ? `${countText(urgent, 'urgente', 'urgentes')} · ` : ''}
            {countText(rows.length - urgent, 'pendiente', 'pendientes')}
          </p>
        ) : null}
      </div>
      <div className="mt-3">
        {tasks.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-36 rounded-card" />
            <Skeleton className="h-36 rounded-card" />
          </div>
        ) : tasks.isError ? (
          <div className={panel}>
            <QueryErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <div className={cn(panel, 'flex items-center gap-3')}>
            <IconChip icon={CircleCheck} tone="success" size="sm" />
            <div>
              <p className="font-semibold text-ink">Todo al día</p>
              <p className="text-sm text-ink-muted">No hay nada pendiente en tus módulos.</p>
            </div>
          </div>
        ) : (
          // Cada tarjeta crece sola al desplegar sus filas: las de al lado no se estiran.
          <ul className="grid items-start gap-4 sm:grid-cols-2">
            {byModule(rows).map((group) => (
              <li key={group.moduleCode}>
                <ModuleTasks moduleCode={group.moduleCode} tasks={group.tasks} open={open} onToggle={toggle} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** La tarjeta de un módulo: su icono y su nombre, y una fila por tipo de tarea. */
function ModuleTasks({ moduleCode, tasks, open, onToggle }: { moduleCode: string; tasks: HomeTask[]; open: ReadonlySet<string>; onToggle: (key: string) => void }) {
  const { me } = useShell();
  const titleId = useId();
  const name = me.modules.find((module) => module.code === moduleCode)?.name ?? moduleCode;
  return (
    <article aria-labelledby={titleId} className="rounded-card bg-surface p-4 shadow-raised sm:p-5">
      <div className="flex items-center gap-3">
        <IconChip icon={moduleIcon(moduleCode)} tone="accent" size="sm" />
        <h3 id={titleId} className="min-w-0 truncate font-bold text-ink">
          {name}
        </h3>
      </div>
      <ul className="mt-2 grid divide-y divide-line">
        {tasks.map((task) => (
          <TaskRow key={keyOf(task)} task={task} open={open.has(keyOf(task))} onToggle={() => onToggle(keyOf(task))} />
        ))}
      </ul>
    </article>
  );
}

/**
 * Una fila: el tono en icono y en palabra («Urgente» o «Pendiente») y la cifra con su texto. Al desplegarse, sus casos y
 * el paso a la lista completa.
 */
function TaskRow({ task, open, onToggle }: { task: HomeTask; open: boolean; onToggle: () => void }) {
  const { workspaceId } = useShell();
  const casesId = useId();
  const link = taskLink(workspaceId, task);
  if (!link) return null;
  const rest = task.count - task.cases.length;
  const danger = task.tone === 'danger';
  return (
    <li className="py-1">
      <h4>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={casesId}
          onClick={onToggle}
          className="flex min-h-12 w-full items-center gap-3 rounded-panel px-1.5 py-1.5 text-left transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-action"
        >
          <IconChip icon={danger ? TriangleAlert : Clock} tone={task.tone} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold tabular-nums text-ink">{link.text}</span>
            <span className="block text-[12px] text-ink-muted">{danger ? 'Urgente' : 'Pendiente'}</span>
          </span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-ink-subtle transition-transform duration-200 ease-out-expo motion-reduce:transition-none', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </h4>
      {/* Se abre por la altura de su contenido, sin saltos; cerrada, queda fuera del foco y del lector de pantalla. */}
      <div
        id={casesId}
        inert={!open}
        className={cn('grid transition-[grid-template-rows] duration-300 ease-out-expo motion-reduce:transition-none', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="grid gap-0.5 pb-2 pl-10">
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
