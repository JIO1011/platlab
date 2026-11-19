import { Segmented } from '@platlab/ui';
import { useState } from 'react';
import { useShell } from '../../app/app-shell';
import { upperFirst } from '../../app/format';
import { useUserKey } from '../../app/queries';
import { ModuleCards } from './module-cards';
import { QuickActions } from './quick-actions';
import { TasksView } from './tasks-view';

/** Fecha de hoy en la zona del espacio, con mayúscula inicial: «Jueves, 2 de octubre». */
function formatToday(timeZone: string): string {
  return upperFirst(new Intl.DateTimeFormat('es-EC', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()));
}

/** Saludo según la hora en la zona del espacio, la misma que usan fechas y movimientos. */
function greeting(timeZone: string): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

type HomeView = 'tasks' | 'modules';

const views: ReadonlyArray<{ value: HomeView; label: string }> = [
  { value: 'tasks', label: 'Tareas' },
  { value: 'modules', label: 'Módulos' },
];

/** La última vista de cada persona, en su navegador (ADR 0026); sin almacenamiento, abre en «Tareas». */
const viewKey = (user: string) => `platlab:inicio:vista:${user}`;

function readView(key: string): HomeView {
  try {
    return window.localStorage.getItem(key) === 'modules' ? 'modules' : 'tasks';
  } catch {
    return 'tasks';
  }
}

function rememberView(key: string, view: HomeView) {
  try {
    window.localStorage.setItem(key, view);
  } catch {
    // Sin almacenamiento (ventana privada o bloqueado), la vista vale solo mientras dura la página.
  }
}

/**
 * Inicio (ADR 0011 y 0026): bajo el saludo, los accesos rápidos; «Tareas» muestra lo de hoy (Actividad), lo que toca
 * (Por atender) y el mes (Calendario); «Módulos», una tarjeta por módulo. Sin módulos para el rol, solo el aviso de las
 * tarjetas.
 */
export function HomePage() {
  const { me } = useShell();
  const key = viewKey(useUserKey());
  const [view, setView] = useState<HomeView>(() => readView(key));
  const firstName = me.member.displayName.split(' ')[0];
  const hasModules = me.modules.length > 0;
  const shown: HomeView = hasModules ? view : 'modules';

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-display text-ink">
            {greeting(me.workspace.timeZone)}, {firstName}
          </h1>
          <p className="mt-2 text-body-lg font-medium text-ink-muted">
            Estás en <span className="text-ink">{me.workspace.name}</span>.{' '}
            {shown === 'tasks' ? 'Esto es lo que toca hoy.' : 'Elige un módulo para empezar a trabajar.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="w-fit rounded-full bg-surface-sunken px-3 py-1 text-sm text-ink-muted">{formatToday(me.workspace.timeZone)}</p>
          {hasModules ? (
            <Segmented
              label="Vista del Inicio"
              value={view}
              options={views}
              onValueChange={(next) => {
                setView(next);
                rememberView(key, next);
              }}
            />
          ) : null}
        </div>
      </div>

      <QuickActions />

      <div className="mt-6">{shown === 'tasks' ? <TasksView /> : <ModuleCards />}</div>
    </div>
  );
}
