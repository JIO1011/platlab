import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { usePlans } from './queries';

/**
 * «N equipos sin plan» (ADR 0020): no generan trabajos por hacer, así que se avisa en el Resumen y en Trabajos, con el
 * camino a Planes. Sin plan o sin datos, no dice nada: un aviso falso sería peor que ninguno.
 */
export function UncoveredLink({ workspaceId, base }: { workspaceId: string; base: string }) {
  const plans = usePlans(workspaceId);
  const total = plans.data?.uncovered.total ?? 0;
  if (total === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-warning-soft px-4 py-3 text-sm text-warning">
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 basis-56">
        <span className="font-semibold">{total === 1 ? '1 equipo sin plan' : `${total} equipos sin plan`}.</span> No generan trabajos por hacer
        hasta que tengan uno.
      </span>
      <Link to={`${base}/planes`} className="-my-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-2 sm:min-h-0">
        Ver planes
      </Link>
    </p>
  );
}
