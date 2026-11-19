import { useState } from 'react';
import { useShell } from '../../app/app-shell';
import { todayInZone } from '../../app/format';
import { AgendaPanel } from './agenda-panel';
import { CalendarPanel } from './calendar-panel';
import { TasksPanel } from './tasks-panel';

/**
 * La vista «Tareas» del Inicio (ADR 0026). Desde `lg`, Actividad a la izquierda y, a la derecha, Por atender sobre el
 * Calendario; en el móvil, Por atender va primero. Tocar un día del Calendario lo muestra en Actividad.
 */
export function TasksView() {
  const { me } = useShell();
  const today = todayInZone(me.workspace.timeZone);
  /** El día de Actividad; null es hoy, que avanza solo al cambiar la fecha. */
  const [date, setDate] = useState<string | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7));

  const pick = (day: string | null) => {
    setDate(day === today ? null : day);
    setMonth((day ?? today).slice(0, 7));
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-12">
      <TasksPanel className="lg:col-span-5 lg:col-start-8 lg:row-start-1 xl:col-span-4 xl:col-start-9" />
      <AgendaPanel date={date} onPick={pick} className="lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1 xl:col-span-8" />
      <CalendarPanel
        month={month}
        onMonth={setMonth}
        selected={date ?? today}
        onPick={pick}
        className="lg:col-span-5 lg:col-start-8 lg:row-start-2 xl:col-span-4 xl:col-start-9"
      />
    </div>
  );
}
