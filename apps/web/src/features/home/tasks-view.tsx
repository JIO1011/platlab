import { useState } from 'react';
import { useShell } from '../../app/app-shell';
import { todayInZone } from '../../app/format';
import { AgendaPanel } from './agenda-panel';
import { CalendarPanel } from './calendar-panel';
import { TasksPanel } from './tasks-panel';

/**
 * La vista «Tareas» del Inicio (ADR 0026, revisión de IN-02). Desde escritorio, a la izquierda Actividad y debajo Por
 * atender; a la derecha, el Calendario. En el móvil, el mismo orden en una columna. Actividad es siempre hoy: los otros
 * días se ven en el Calendario, y «Ver en el calendario» de lo próximo lo elige ahí.
 */
export function TasksView() {
  const { me } = useShell();
  const today = todayInZone(me.workspace.timeZone);
  /** El día elegido en el Calendario; null es hoy, que avanza solo al cambiar la fecha. */
  const [picked, setPicked] = useState<string | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const selected = picked ?? today;

  const pick = (day: string) => {
    setPicked(day === today ? null : day);
    setMonth(day.slice(0, 7));
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:col-span-8">
        <AgendaPanel onPickDay={pick} />
        <TasksPanel />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:col-span-4">
        <CalendarPanel month={month} onMonth={setMonth} selected={selected} onPick={pick} />
      </div>
    </div>
  );
}
