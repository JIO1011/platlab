import { Skeleton } from '@platlab/ui';
import { CalendarClock, CircleAlert, ClipboardCheck, ClipboardList, ScanLine, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { QuickActions, quickActionPrimary, quickActionSecondary } from '../../app/quick-actions';
import { StatLink } from '../../app/stat-link';
import { QueryErrorState } from '../../app/states';
import { useMaintenance } from './context';
import { useMaintenanceSummary } from './queries';
import { RecordSheet } from './record-sheet';
import { SectionHeader } from './section-header';
import { UncoveredLink } from './uncovered-notice';

/**
 * Resumen de Mantenimiento (ADR 0020): dos cifras —vencidos (con los no conformes) y próximos 30 días— que llevan a Por
 * hacer, la banda para registrar o escanear y, siempre que haya equipos sin plan, el aviso. Sin gráfico: lo que importa es
 * cuánto hay por hacer y qué hacer ahora.
 */
export function MaintenanceSummaryPage() {
  const { workspaceId, me, base, canRecord } = useMaintenance();
  const summary = useMaintenanceSummary(workspaceId);
  const title = me.modules.find((entry) => entry.code === 'maintenance')?.name ?? 'Mantenimiento';
  // `n` monta la hoja de nuevo en cada apertura: formulario limpio y clave idempotente nueva.
  const [sheet, setSheet] = useState<{ n: number; open: boolean; scan: boolean } | null>(null);
  const openSheet = (scan: boolean) => setSheet({ n: (sheet?.n ?? 0) + 1, open: true, scan });

  return (
    <>
      <SectionHeader title={title} updatedAt={summary.dataUpdatedAt} />
      <div className="mt-6">
        {summary.isPending ? (
          <div className="grid gap-5 sm:gap-6" role="status" aria-busy="true" aria-label="Cargando">
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6">
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
            </div>
            <Skeleton className="h-40 rounded-card" />
          </div>
        ) : summary.isError ? (
          <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : (
          <div className="grid gap-5 sm:gap-6">
            <section aria-label="Indicadores" className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6">
              <StatLink
                to={`${base}/trabajos`}
                label="Vencidos"
                value={summary.data.overdue}
                hint={
                  summary.data.overdue === 0
                    ? 'Ninguno'
                    : summary.data.nonconforming > 0
                      ? `incluye ${summary.data.nonconforming} ${summary.data.nonconforming === 1 ? 'no conforme' : 'no conformes'}`
                      : 'Requieren atención'
                }
                hintTone={summary.data.overdue === 0 ? 'neutral' : 'danger'}
                icon={CircleAlert}
                tone={summary.data.overdue === 0 ? 'neutral' : 'danger'}
                compact
              />
              <StatLink
                to={`${base}/trabajos`}
                label="Próximos 30 días"
                value={summary.data.next30}
                hint={summary.data.next30 === 0 ? 'Ninguno' : 'Por hacer'}
                hintTone={summary.data.next30 === 0 ? 'neutral' : 'warning'}
                icon={CalendarClock}
                tone={summary.data.next30 === 0 ? 'neutral' : 'warning'}
                compact
              />
            </section>
            <QuickActions
              moduleCode="maintenance"
              title="Registrar mantenimiento"
              badge={{ icon: Wrench, label: 'Gestión rápida' }}
              description={
                canRecord
                  ? 'Anota lo que se hizo en un equipo: su plan avanza solo, o queda en el historial si no tiene plan. Escanea su etiqueta para elegirlo al instante.'
                  : 'Consulta lo que vence, lo que quedó No conforme y lo que ya se hizo. Para registrar un mantenimiento se necesita otro rol.'
              }
              className="xl:py-9"
            >
              {canRecord ? (
                <>
                  <button type="button" className={quickActionPrimary} onClick={() => openSheet(false)}>
                    <ClipboardCheck className="size-[18px]" aria-hidden />
                    Registrar mantenimiento
                  </button>
                  <button type="button" className={quickActionSecondary} onClick={() => openSheet(true)}>
                    <ScanLine className="size-[18px]" aria-hidden />
                    Escanear
                  </button>
                </>
              ) : (
                <Link to={`${base}/trabajos`} className={quickActionPrimary}>
                  <ClipboardList className="size-[18px]" aria-hidden />
                  Ver trabajos por hacer
                </Link>
              )}
            </QuickActions>
            <UncoveredLink workspaceId={workspaceId} base={base} />
          </div>
        )}
      </div>
      {sheet ? (
        <RecordSheet
          key={sheet.n}
          workspaceId={workspaceId}
          me={me}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          scan={sheet.scan}
        />
      ) : null}
    </>
  );
}
