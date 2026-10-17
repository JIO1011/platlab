import { Skeleton, StatePanel } from '@platlab/ui';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { Link } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { useEquipment } from './context';
import { FaultChart } from './fault-chart';
import { faultCountsText, faultTotals, hasFaultActivity } from './fault-series';
import { durationText, outOfServiceText } from './fault-text';
import { useFaultStats } from './queries';

/**
 * «Incidentes en 12 meses» del Resumen de Equipos (ADR 0019), solo para quien atiende fallas: el total del período,
 * el gráfico mes a mes y dos cifras (reparación promedio y días fuera de servicio). Sin un solo incidente en el período,
 * lo dice en lugar de dibujar un gráfico vacío.
 */
export function IncidentsCard() {
  const { workspaceId, base } = useEquipment();
  const stats = useFaultStats(workspaceId);
  const totals = stats.data ? faultTotals(stats.data.months) : null;

  return (
    <article aria-labelledby="incidentes-12-meses" className="flex min-w-0 flex-col rounded-card bg-surface p-6 shadow-raised">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="incidentes-12-meses" className="text-lg font-bold text-ink">
          Incidentes en 12 meses
        </h2>
        {totals ? <p className="text-sm font-medium tabular-nums text-ink-muted">{faultCountsText(totals.reported, totals.resolved)}</p> : null}
      </div>
      {stats.isPending ? (
        <div role="status" aria-busy="true" aria-label="Cargando" className="mt-5">
          <Skeleton className="h-64 rounded-panel" />
        </div>
      ) : stats.isError ? (
        <QueryErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <>
          <div className="mt-5">
            {hasFaultActivity(stats.data.months) ? (
              <FaultChart months={stats.data.months} />
            ) : (
              <StatePanel
                icon={CircleCheck}
                title="Sin incidentes en los últimos 12 meses"
                description="Cuando alguien reporte uno, aparecerá aquí mes a mes."
                className="py-8"
              />
            )}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
            <div>
              <dt className="text-[13px] text-ink-muted">Reparación promedio</dt>
              <dd className="mt-0.5 break-words text-lg font-bold text-ink">
                {stats.data.meanRepairSeconds === null ? 'Sin solucionados' : durationText(stats.data.meanRepairSeconds)}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-muted">Días fuera de servicio</dt>
              <dd className="mt-0.5 break-words text-lg font-bold text-ink">{outOfServiceText(stats.data.outOfService)}</dd>
            </div>
          </dl>
          <Link
            to={`${base}/incidentes`}
            className="mt-4 inline-flex items-center gap-1 self-start rounded-control text-sm font-medium text-action transition-colors hover:text-action-hover"
          >
            Ver incidentes
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </>
      )}
    </article>
  );
}
