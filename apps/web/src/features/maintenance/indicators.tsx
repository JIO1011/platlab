import type { MaintenanceIndicators } from '@platlab/contracts';
import { Skeleton, formatDecimal } from '@platlab/ui';
import { Link } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { useMaintenance } from './context';
import { compliancePercent, complianceDetail, onTimeText, periodText, withoutRequirementText } from './indicator-text';
import { Panel } from './panel';
import { useIndicators } from './queries';
import { ReplacementSection } from './replacement-section';
import { ScheduleChart } from './schedule-chart';
import { SectionHeader } from './section-header';
import { Tile } from './tile';

/** Una cantidad de dinero de Indicadores: la cadena decimal tal cual llega, con su signo de moneda. */
const money = (value: string) => `$\u00A0${formatDecimal(value)}`;

/** El costo del periodo: preventivo frente a correctivo, en el tamaño de una línea de texto. */
function CostValue({ costs }: { costs: MaintenanceIndicators['costs'] }) {
  return (
    <span className="grid gap-1.5">
      {(
        [
          ['preventivo', costs.preventive],
          ['correctivo', costs.corrective],
        ] as const
      ).map(([name, value]) => (
        <span key={name} className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xl font-bold tabular-nums leading-tight">{money(value)}</span>
          <span className="text-[13px] font-normal text-ink-muted">{name}</span>
        </span>
      ))}
    </span>
  );
}

/** «Cumplimiento por requisito»: por cada requisito de los planes, el % a tiempo y cuántos trabajos fueron. */
function Requirements({ items, compliance }: { items: MaintenanceIndicators['requirements']; compliance: MaintenanceIndicators['compliance'] }) {
  const { base, canManagePlans } = useMaintenance();
  const without = withoutRequirementText(compliance, items);
  return (
    <Panel title="Cumplimiento por requisito" description="Los trabajos programados hasta hoy, agrupados por el requisito que dice su plan.">
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Ningún plan tiene requisito todavía. Se agrega en el plan, en el campo «Requisito».
          {canManagePlans ? (
            <>
              {' '}
              <Link to={`${base}/planes`} className="inline-flex min-h-11 items-center font-medium text-action underline-offset-2 hover:underline sm:min-h-0">
                Ir a Planes
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const percent = compliancePercent(item);
            return (
              <li key={item.requirement} className="grid gap-x-4 gap-y-0.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
                <span className="min-w-0 break-words font-medium text-ink">{item.requirement}</span>
                <span className="text-sm tabular-nums text-ink-muted">
                  {percent === null ? null : <strong className="font-semibold text-ink">{percent}{'\u00A0'}% · </strong>}
                  {onTimeText(item)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && without ? <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">{without}</p> : null}
    </Panel>
  );
}

/** Las cifras, el gráfico y las listas, ya cargados. */
function IndicatorsContent({ data }: { data: MaintenanceIndicators }) {
  const { base } = useMaintenance();
  const percent = compliancePercent(data.compliance);
  const { calibrations, costs } = data;
  return (
    <div className="mt-6 grid gap-5">
      <p className="text-sm text-ink-muted">{periodText(data.period)}</p>
      <section aria-label="Cifras" className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Tile
          label="Cumplimiento del plan"
          value={percent === null ? '—' : `${percent}\u00A0%`}
          hint={complianceDetail(data.compliance)}
          cta="Ver historial"
          to={`${base}/historial`}
        />
        <Tile
          label="Atrasados"
          value={data.overdue}
          tone={data.overdue > 0 ? 'danger' : 'neutral'}
          cta={data.overdue > 0 ? 'Ver lista' : undefined}
          to={base}
        />
        <Tile
          label="Calibraciones vigentes"
          value={calibrations.total === 0 ? '—' : `${calibrations.current} de ${calibrations.total}`}
          hint={calibrations.total === 0 ? 'Sin planes de calibración' : undefined}
          cta={calibrations.total > 0 ? 'Ver en Por hacer' : undefined}
          to={base}
        />
        <Tile
          label="Costo registrado"
          value={<CostValue costs={costs} />}
          hint={costs.withoutCost > 0 ? `${costs.withoutCost} ${costs.withoutCost === 1 ? 'registro sin costo' : 'registros sin costo'}` : undefined}
          cta="Ver historial"
          to={`${base}/historial`}
        />
      </section>
      <Panel title="Programado frente a realizado">
        <ScheduleChart months={data.months} />
      </Panel>
      <Requirements items={data.requirements} compliance={data.compliance} />
      <ReplacementSection candidates={data.replacement} />
    </div>
  );
}

/**
 * Indicadores (ADR 0020, M-01c): pocas cifras, cada una con su lista, de los últimos 12 meses de calendario; el
 * programado frente a lo realizado por mes, el cumplimiento por requisito y los equipos para evaluar su reemplazo.
 * Todo se calcula en el servidor al consultar. El color acompaña siempre a un texto.
 */
export function MaintenanceIndicatorsPage() {
  const { workspaceId } = useMaintenance();
  const indicators = useIndicators(workspaceId);

  return (
    <>
      <SectionHeader title="Indicadores" updatedAt={indicators.dataUpdatedAt} />
      {indicators.isPending ? (
        <div aria-busy="true" className="mt-6 grid gap-5">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-28 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-card" />
        </div>
      ) : indicators.isError ? (
        <div className="mt-6 rounded-card bg-surface shadow-raised">
          <QueryErrorState error={indicators.error} onRetry={() => void indicators.refetch()} />
        </div>
      ) : (
        <IndicatorsContent data={indicators.data} />
      )}
    </>
  );
}
