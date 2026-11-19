import type { DashboardPeriod } from '@platlab/contracts';
import { Button, Segmented, Skeleton } from '@platlab/ui';
import { HandHelping, PackageMinus, Plus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { todayInZone } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import { AttentionList } from './dashboard/attention-list';
import { BorrowersTable } from './dashboard/borrowers-table';
import { ClassSplit } from './dashboard/class-split';
import { DashCard } from './dashboard/dash-card';
import { FlowChart } from './dashboard/flow-chart';
import { KpiTile } from './dashboard/kpi-tile';
import { RunningLow } from './dashboard/running-low';
import { ShelfMeter } from './dashboard/shelf-meter';
import { TopUsed } from './dashboard/top-used';
import { useMaterialsDashboard } from './queries';

const periods: ReadonlyArray<{ value: `${DashboardPeriod}`; label: string }> = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
];
const toPeriod = (value: `${DashboardPeriod}`): DashboardPeriod => (value === '7' ? 7 : value === '90' ? 90 : 30);

/**
 * Resumen de Materiales como tablero (ADR 0025): el periodo se elige arriba y gobierna todo lo de abajo. Primero las cifras
 * con su cambio, luego los movimientos por semana junto al reparto del catálogo y los reutilizables en el estante; después lo
 * más usado, lo que se acaba pronto y lo que pide atención, y, para quien administra, quién presta más. Al cambiar de
 * periodo el tablero conserva lo anterior (atenuado) hasta que llega lo nuevo.
 */
export function MaterialsSummaryPage() {
  const { workspaceId, base, canLend, me } = useMaterials();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<`${DashboardPeriod}`>('30');
  const days = toPeriod(period);
  const query = useMaterialsDashboard(workspaceId, days);
  const data = query.data;
  const timeZone = me.workspace.timeZone;

  const lend = canLend ? (
    <Button variant="primary" className="h-12 sm:h-10" onClick={() => navigate(`${base}/prestamos?nuevo=1`)}>
      <Plus aria-hidden />
      Nuevo préstamo
    </Button>
  ) : null;

  return (
    <>
      <SectionHeader title="Resumen" updatedAt={query.dataUpdatedAt} actions={lend} />
      <div className="mt-6 grid gap-4 sm:gap-6">
        <Segmented label="Periodo del resumen" value={period} onValueChange={setPeriod} options={periods} />
        {query.isPending ? (
          <div aria-busy="true" className="grid gap-4">
            <Skeleton className="h-32 rounded-card" />
            <Skeleton className="h-72 rounded-card" />
          </div>
        ) : query.isError || !data ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
          </div>
        ) : (
          <div className={`grid gap-4 transition-opacity duration-200 sm:gap-6 ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
            <section aria-label="Cifras del periodo" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <KpiTile
                label="Salidas"
                icon={PackageMinus}
                {...data.figures.issues}
                good="neutral"
                days={data.days}
                spark={data.weekly.map((week) => ({ date: week.week, value: week.issued }))}
              />
              <KpiTile
                label="Vales de préstamo"
                icon={HandHelping}
                {...data.figures.loans}
                good="neutral"
                days={data.days}
                spark={data.weekly.map((week) => ({ date: week.week, value: week.lent }))}
              />
              <KpiTile label="Bajas por daño o pérdida" icon={TriangleAlert} {...data.figures.writtenOff} good="down" days={data.days} />
              <div className="flex min-w-0 flex-col justify-between gap-2 rounded-card bg-surface p-4 shadow-raised">
                <p className="text-[13px] font-medium text-ink-muted">Ahora mismo</p>
                <dl className="grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-[12px] text-ink-muted">Abiertos</dt>
                    <dd className="text-metric-sm tabular-nums text-ink">{data.figures.openLoans}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-ink-muted">Atrasados</dt>
                    <dd className={`text-metric-sm tabular-nums ${data.figures.overdueLoans > 0 ? 'text-danger' : 'text-ink'}`}>{data.figures.overdueLoans}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-ink-muted">Bajo mínimo</dt>
                    <dd className={`text-metric-sm tabular-nums ${data.figures.belowMinimum > 0 ? 'text-warning' : 'text-ink'}`}>{data.figures.belowMinimum}</dd>
                  </div>
                </dl>
              </div>
            </section>
            <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <DashCard title="Movimientos por semana" hint="Salidas, vales e ingresos de las últimas 8 semanas.">
                <FlowChart weeks={data.weekly} />
              </DashCard>
              <div className="grid content-start gap-4 sm:gap-6">
                <DashCard title="Reutilizables en el estante" hint="Lo que está en su sitio frente a lo que posee el espacio.">
                  <ShelfMeter shelf={data.shelf} />
                </DashCard>
                <DashCard title="Catálogo por clase">
                  <ClassSplit parts={data.byClass} />
                </DashCard>
              </div>
            </div>
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <DashCard title="Lo más usado" hint={`En los últimos ${data.days} días.`}>
                <TopUsed dashboard={data} />
              </DashCard>
              <DashCard title="Se acaban pronto" hint="Existencia entre el gasto diario de 30 días.">
                <RunningLow rows={data.runningLow} />
              </DashCard>
              <DashCard title="Hay que atender" className="lg:col-span-2 xl:col-span-1">
                <AttentionList attention={data.attention} base={base} today={todayInZone(timeZone)} />
              </DashCard>
            </div>
            {data.topBorrowers ? (
              <DashCard title="Quién presta más" hint={`Vales en los últimos ${data.days} días.`}>
                <BorrowersTable rows={data.topBorrowers} today={todayInZone(timeZone)} timeZone={timeZone} />
              </DashCard>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
