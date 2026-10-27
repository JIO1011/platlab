import { IconChip } from '@platlab/ui';
import { CalendarDays, Clock, FlaskConical, Users, type LucideIcon } from 'lucide-react';
import { useSpaces } from './queries';
import { useLabs } from './context';
import { figuresOf, type Figure } from './request-detail';
import type { RequestView } from './request-draft';
import { softCard } from './style';

const icons: Record<Figure['key'], LucideIcon> = { dates: CalendarDays, time: Clock, lab: FlaskConical, people: Users };

/**
 * Las cuatro cifras de una solicitud, al modo del tablero de referencia: un ícono en un chip suave, el valor grande y su
 * rótulo. Lo que falta («Sin elegir», «Sin horario») lo dice en texto y tiñe su chip de aviso.
 */
export function RequestFigures({ request }: { request: RequestView }) {
  const { workspaceId } = useLabs();
  const spaces = useSpaces(workspaceId);
  const space = spaces.data?.items.find((item) => item.areaId === request.areaId);
  return (
    <section aria-label="Lo pedido" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 print:hidden">
      {figuresOf(request, space).map((figure) => (
        <div key={figure.key} className={`${softCard} flex min-w-0 flex-col gap-3 p-4 sm:p-5`}>
          <IconChip icon={icons[figure.key]} tone={figure.missing ? 'warning' : 'accent'} className="size-10 rounded-xl" />
          <div className="min-w-0">
            <p className="break-words text-xl font-bold leading-tight tracking-tight text-ink tabular-nums sm:text-2xl">{figure.value}</p>
            <p className="mt-0.5 text-sm font-medium text-ink-muted">{figure.label}</p>
            {figure.hints.map((hint) => (
              <p key={hint} className="mt-0.5 break-words text-[13px] text-ink-muted tabular-nums">
                {hint}
              </p>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
