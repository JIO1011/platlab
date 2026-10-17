import { cn } from '@platlab/ui';
import { ChevronRight } from 'lucide-react';
import { createContext, useContext, useEffect } from 'react';
import { Link } from 'react-router';

/** Un paso del rastro que una página suma a las migas de la barra superior; sin `to`, es el lugar actual. */
export interface TrailStep {
  label: string;
  to?: string;
}

type SetTrail = (steps: TrailStep[]) => void;

/** Lo pone el shell: dónde guardar el rastro que las páginas piden. */
export const ShellTrailContext = createContext<SetTrail>(() => undefined);

/**
 * Extiende las migas de la barra superior (módulo › sección) con los pasos de la página, y las limpia al
 * desmontar. Los pasos se comparan por contenido: la página puede pasar un arreglo nuevo en cada
 * render. Sin pasos (los datos aún no llegan), la barra queda como estaba.
 */
export function useShellTrail(steps: readonly TrailStep[]) {
  const setTrail = useContext(ShellTrailContext);
  const key = JSON.stringify(steps);
  useEffect(() => {
    setTrail(JSON.parse(key) as TrailStep[]);
    return () => setTrail([]);
  }, [key, setTrail]);
}

/**
 * Las migas del escritorio: «Equipos › Inventario › Laboratorio de Química». La sección es enlace solo cuando
 * la página suma un rastro; el último paso es el lugar actual.
 */
export function ShellCrumbs({
  module,
  section,
  trail,
}: {
  module: string;
  section?: { label: string; to: string } | undefined;
  trail: readonly TrailStep[];
}) {
  const steps: TrailStep[] = [
    ...(section ? [{ label: section.label, ...(trail.length > 0 ? { to: section.to } : {}) }] : []),
    ...trail,
  ];
  return (
    <nav aria-label="Migas de pan" className="hidden min-w-0 md:block">
      <ol className="flex items-center gap-1.5 text-sm">
        <li className="shrink-0 font-semibold text-ink">{module}</li>
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          return (
            <li key={`${index}-${step.label}`} className={cn('flex items-center gap-1.5', section && index === 0 ? 'shrink-0' : 'min-w-0')}>
              <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden />
              {step.to && !last ? (
                <Link to={step.to} className="-my-2 truncate rounded-[6px] py-2 text-ink-muted hover:text-ink hover:underline">
                  {step.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last && trail.length > 0 ? 'truncate font-medium text-ink' : 'truncate text-ink-muted'}>
                  {step.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
