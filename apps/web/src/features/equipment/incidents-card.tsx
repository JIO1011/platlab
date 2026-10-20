import { Skeleton, StatePanel } from '@platlab/ui';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { Link } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { useEquipment } from './context';
import { FaultChart } from './fault-chart';
import { faultSummaryText, faultTotals, hasFaultActivity } from './fault-series';
import { durationText, outOfServiceText } from './fault-text';
import { useFaultStats } from './queries';

/**
 * «Incidentes en 12 meses» del Resumen de Equipos (ADR 0019, 0021), solo para quien atiende fallas: una frase con el
 * total del período y cuántos siguen abiertos hoy, el gráfico mes a mes y dos cifras (reparación promedio y días fuera
 * de servicio). Sin un solo incidente en el período, lo dice en lugar de dibujar un gráfico vacío.
 */
export function IncidentsCard({ openFaults }: { openFaults: number }) {
  const { workspaceId, base } = useEquipment();
  const stats = useFaultStats(workspaceId);

  return (
    <article aria-labelledby="incidentes-12-meses" className="flex min-w-0 flex-col rounded-card bg-surface p-6 shadow-raised">
      <h2 id="incidentes-12-meses" className="text-lg font-bold text-ink">
        Incidentes en 12 meses
      </h2>
      {stats.data && hasFaultActivity(stats.data.months) ? (
        <p className="mt-1 text-sm font-medium tabular-nums text-ink">{faultSummaryText(faultTotals(stats.data.months), openFaults)}</p>
      ) : null}
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
          {/* Las dos cifras cierran el gráfico: misma tarjeta, una raya arriba y otra entre ellas. */}
          <dl className="mt-5 grid grid-cols-2 divide-x divide-line border-t border-line pt-4">
            <div className="min-w-0 pr-4">
              <dt className="text-[13px] text-ink-muted">Reparación promedio</dt>
              <dd className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-ink tabular-nums">
                {stats.data.meanRepairSeconds === null ? 'Sin solucionados' : durationText(stats.data.meanRepairSeconds)}
              </dd>
            </div>
            <div className="min-w-0 pl-4 sm:pl-6">
              <dt className="text-[13px] text-ink-muted">Días fuera de servicio</dt>
              <dd className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-ink tabular-nums">
                {outOfServiceText(stats.data.outOfService)}
              </dd>
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
