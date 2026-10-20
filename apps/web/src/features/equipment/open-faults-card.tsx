import { Badge, Skeleton, StatePanel } from '@platlab/ui';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { Link } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { QueryErrorState } from '../../app/states';
import { useNow } from '../../app/use-now';
import { placeLines } from './asset-text';
import { useEquipment } from './context';
import { faultStepParts, faultTypeLabel } from './fault-text';
import { useFaults } from './queries';

/** Cuántos incidentes muestra el Resumen: los primeros que esperan atención. */
const LIMIT = 5;
const PENDING = { statuses: ['open' as const, 'in_progress' as const] };

/**
 * «Incidentes por atender» del Resumen de Equipos (ADR 0021): los primeros cinco incidentes reportados o en
 * reparación, a quien los ve (quien atiende, todos; quien solo reporta, los suyos). Cada fila dice el equipo (enlace
 * a la hoja del incidente), dónde está y de qué tipo es, si no se puede usar y en qué paso va, con su tiempo. «Ver
 * incidentes» lleva a la lista entera.
 */
export function OpenFaultsCard() {
  const { workspaceId, base } = useEquipment();
  const faults = useFaults(workspaceId, PENDING, LIMIT);
  const now = useNow(30_000);
  const items = faults.data?.pages[0]?.items.slice(0, LIMIT) ?? [];

  return (
    <article aria-labelledby="incidentes-por-atender" className="flex min-w-0 flex-col rounded-card bg-surface p-5 shadow-raised sm:p-6">
      <h2 id="incidentes-por-atender" className="text-lg font-bold text-ink">
        Incidentes por atender
      </h2>
      {faults.isPending ? (
        <div role="status" aria-busy="true" aria-label="Cargando" className="mt-4 grid gap-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-20 rounded-panel" />
          ))}
        </div>
      ) : faults.isError ? (
        <QueryErrorState error={faults.error} onRetry={() => void faults.refetch()} />
      ) : (
        <>
          {items.length === 0 ? (
            <StatePanel
              icon={CircleCheck}
              title="No hay incidentes por atender"
              description="Cuando alguien reporte un incidente de un equipo, aparecerá aquí."
              className="py-8"
            />
          ) : (
            // Las filas llegan al borde de la tarjeta: el divisor y el foco ocupan todo el ancho.
            <ul aria-label="Incidentes por atender" className="-mx-5 mt-3 divide-y divide-line sm:-mx-6">
              {items.map((fault) => (
                <li
                  key={fault.id}
                  className="relative px-5 py-3.5 transition-colors hover:bg-surface-sunken/40 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-action sm:px-6"
                >
                  <p className="flex min-w-0 items-center gap-2 font-semibold text-ink">
                    <CodeTag>{fault.asset.code}</CodeTag>
                    <Link
                      to={`${base}/incidentes?falla=${fault.id}`}
                      className="min-w-0 truncate after:absolute after:inset-0 focus-visible:outline-none"
                    >
                      {fault.asset.name}
                    </Link>
                  </p>
                  <p className="mt-0.5 break-words text-[13px] text-ink-muted">
                    {placeLines(fault.asset.location).full} · {faultTypeLabel[fault.faultType]}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                    {fault.usable ? null : <Badge tone="danger">No se puede usar</Badge>}
                    <span className="text-ink">{faultStepParts(fault, now).when}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`${base}/incidentes`}
            className="mt-4 inline-flex min-h-11 items-center gap-1 self-start rounded-control text-sm font-medium text-action transition-colors hover:text-action-hover sm:min-h-0"
          >
            Ver incidentes
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </>
      )}
    </article>
  );
}
