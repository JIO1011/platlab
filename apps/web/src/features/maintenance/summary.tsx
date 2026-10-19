import type { MaintenanceIndicators, MaintenanceSummary } from '@platlab/contracts';
import { Skeleton } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { BadgeCheck, CalendarClock, CircleAlert, ClipboardCheck, ScanLine, Wrench } from 'lucide-react';
import { QuickActions, quickActionPrimary, quickActionSecondary } from '../../app/quick-actions';
import { StatLink } from '../../app/stat-link';
import { QueryErrorState } from '../../app/states';
import { useMaintenance } from './context';
import { compliancePercent, onTimeText, periodText } from './indicator-text';
import { Panel } from './panel';
import { useDue, useIndicators, useMaintenanceSummary } from './queries';
import { useRecordLauncher } from './record-launcher';
import { ReplacementSection } from './replacement-section';
import { ScheduleChart } from './schedule-chart';
import { SectionHeader } from './section-header';
import { CostCard, NoPlanNotice, RequirementsCard } from './summary-cards';
import { UpcomingCard } from './upcoming-card';

const countText = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Las cuatro cifras, como en Equipos y Reactivos (ADR 0021): el color cuenta un estado y solo si hay algo que
 * atender (Atrasados en rojo, Próximos 30 días en ámbar). Atrasados y Próximos llevan a Por hacer; el cumplimiento,
 * al Historial; las calibraciones, a Por hacer, donde se renuevan.
 */
function Figures({ summary, indicators }: { summary: MaintenanceSummary; indicators: MaintenanceIndicators }) {
  const { base } = useMaintenance();
  const todo = `${base}/por-hacer`;
  const { overdue, next30, nonconforming } = summary;
  const { compliance, calibrations } = indicators;
  const percent = compliancePercent(compliance);
  // Una calibración sin vigencia pide atención; todas vigentes (o ninguna), no (ADR 0021).
  const calibrationsTone = calibrations.current < calibrations.total ? 'warning' : 'neutral';
  return (
    <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
      <StatLink
        to={todo}
        label="Atrasados"
        value={overdue}
        hint={overdue === 0 ? 'Ninguno' : nonconforming > 0 ? countText(nonconforming, 'no conforme', 'no conformes') : 'Requieren atención'}
        hintTone={overdue === 0 ? 'neutral' : 'danger'}
        icon={CircleAlert}
        tone={overdue === 0 ? 'neutral' : 'danger'}
        compact
      />
      <StatLink
        to={todo}
        label="Próximos 30 días"
        value={next30}
        hint={next30 === 0 ? 'Nada en 30 días' : 'Por programar'}
        hintTone={next30 === 0 ? 'neutral' : 'warning'}
        icon={CalendarClock}
        tone={next30 === 0 ? 'neutral' : 'warning'}
        compact
      />
      <StatLink
        to={`${base}/historial`}
        label="Cumplimiento del plan"
        value={percent === null ? '—' : `${percent}\u00A0%`}
        hint={onTimeText(compliance)}
        icon={ClipboardCheck}
        tone="neutral"
        compact
      />
      <StatLink
        to={todo}
        label="Calibraciones vigentes"
        value={calibrations.total === 0 ? '—' : `${calibrations.current} de ${calibrations.total}`}
        hint={calibrations.total === 0 ? 'Sin planes de calibración' : calibrations.current === calibrations.total ? 'Todas vigentes' : `${calibrations.total - calibrations.current} sin vigencia`}
        hintTone={calibrationsTone}
        icon={BadgeCheck}
        tone={calibrationsTone}
        compact
      />
    </section>
  );
}

/** Esqueleto quieto con la forma real: cuatro cifras, la banda y las tarjetas de las dos columnas. */
function SummarySkeleton({ withActions }: { withActions: boolean }) {
  return (
    <div className="grid gap-5 sm:gap-6" role="status" aria-busy="true" aria-label="Cargando">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-28 rounded-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-7">
          {withActions ? <Skeleton className="h-40 rounded-card" /> : null}
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-44 rounded-card" />
        </div>
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-5">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-52 rounded-card" />
        </div>
      </div>
    </div>
  );
}

/** El error de una consulta, en una tarjeta, con su «Reintentar». */
function ErrorCard({ query }: { query: UseQueryResult<unknown> }) {
  return (
    <div className="rounded-card bg-surface shadow-raised">
      <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
    </div>
  );
}

/**
 * Resumen de Mantenimiento, la portada (ADR 0021): como los de Equipos y Reactivos, cuatro cifras, «Gestión rápida»
 * para registrar o escanear, los próximos trabajos (los primeros de Por hacer), lo programado frente a lo realizado de
 * los últimos 12 meses, el costo, el cumplimiento por requisito y los avisos (equipos sin plan y «Evaluar reemplazo»).
 * Todo se calcula en el servidor al consultar; la lista de trabajo y el registro viven en Por hacer.
 */
export function MaintenanceSummaryPage() {
  const { workspaceId, me, canRecord } = useMaintenance();
  const summary = useMaintenanceSummary(workspaceId);
  const indicators = useIndicators(workspaceId);
  const due = useDue(workspaceId);
  const launcher = useRecordLauncher({ fromUrl: false });
  const title = me.modules.find((entry) => entry.code === 'maintenance')?.name ?? 'Mantenimiento';
  // «Actualizado hace…»: la marca más antigua de lo que se ve.
  const stamps = [summary.dataUpdatedAt, indicators.dataUpdatedAt, due.dataUpdatedAt];
  const updatedAt = stamps.every((stamp) => stamp > 0) ? Math.min(...stamps) : 0;

  return (
    <>
      <SectionHeader title={title} updatedAt={updatedAt} />
      <div className="mt-6">
        {summary.isPending || indicators.isPending ? (
          <SummarySkeleton withActions={canRecord} />
        ) : summary.isError || indicators.isError ? (
          <ErrorCard query={summary.isError ? summary : indicators} />
        ) : (
          <div className="grid gap-5 sm:gap-6">
            <Figures summary={summary.data} indicators={indicators.data} />
            <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-12">
              <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-7">
                {canRecord ? (
                  <QuickActions
                    moduleCode="maintenance"
                    title="Registrar un trabajo"
                    badge={{ icon: Wrench, label: 'Gestión rápida' }}
                    description="Anota lo que se hizo en un equipo, o escanea su etiqueta para empezar por él. Lo que toca está en Por hacer."
                    className="xl:py-9"
                  >
                    <button type="button" className={quickActionPrimary} aria-haspopup="dialog" onClick={() => launcher.open()}>
                      <ClipboardCheck className="size-[18px]" aria-hidden />
                      Registrar mantenimiento
                    </button>
                    <button type="button" className={quickActionSecondary} aria-haspopup="dialog" onClick={() => launcher.open({ scan: true })}>
                      <ScanLine className="size-[18px]" aria-hidden />
                      Escanear
                    </button>
                  </QuickActions>
                ) : null}
                <Panel title="Programado frente a realizado" description={periodText(indicators.data.period)}>
                  <ScheduleChart months={indicators.data.months} />
                </Panel>
                <CostCard costs={indicators.data.costs} />
              </div>
              <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-5">
                <UpcomingCard due={due} />
                <RequirementsCard items={indicators.data.requirements} compliance={indicators.data.compliance} />
              </div>
            </div>
            {summary.data.uncovered > 0 ? <NoPlanNotice count={summary.data.uncovered} /> : null}
            <ReplacementSection candidates={indicators.data.replacement} />
          </div>
        )}
      </div>
      {launcher.sheet}
    </>
  );
}
