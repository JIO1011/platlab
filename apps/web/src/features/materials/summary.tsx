import type { MaterialsSummary } from '@platlab/contracts';
import { Skeleton } from '@platlab/ui';
import { AlertTriangle, ArrowRight, HandHelping, Package, PackageSearch, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { countText } from '../../app/format';
import { NoticeCard } from '../../app/notice-card';
import { QuickActions, quickActionPrimary, quickActionSecondary } from '../../app/quick-actions';
import { SectionHeader } from '../../app/section-header';
import { StatLink } from '../../app/stat-link';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import { useMaterialsSummary } from './queries';

/**
 * Las cuatro cifras, como en Equipos y Reactivos: el color cuenta un estado y solo si hay algo que atender (atrasados en
 * rojo, bajo mínimo en ámbar). Cada una lleva a la lista que la explica.
 */
function Figures({ summary }: { summary: MaterialsSummary }) {
  const { base } = useMaterials();
  const { materials, belowMinimum, openLoans, overdueLoans } = summary;
  return (
    <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
      <StatLink to={`${base}/inventario`} label="Materiales" value={materials} hint={materials === 0 ? 'Sin registrar' : 'En el catálogo'} icon={Package} compact />
      <StatLink
        to={`${base}/inventario`}
        label="Bajo mínimo"
        value={belowMinimum}
        hint={belowMinimum === 0 ? 'Ninguno' : 'Conviene reponerlos'}
        hintTone={belowMinimum === 0 ? 'neutral' : 'warning'}
        icon={PackageSearch}
        tone={belowMinimum === 0 ? 'neutral' : 'warning'}
        compact
      />
      <StatLink
        to={`${base}/prestamos`}
        label="Préstamos abiertos"
        value={openLoans}
        hint={openLoans === 0 ? 'Nada prestado' : 'Por devolver'}
        icon={HandHelping}
        compact
      />
      <StatLink
        to={`${base}/prestamos?filtro=overdue`}
        label="Atrasados"
        value={overdueLoans}
        hint={overdueLoans === 0 ? 'Ninguno' : 'Pasaron su fecha'}
        hintTone={overdueLoans === 0 ? 'neutral' : 'danger'}
        icon={AlertTriangle}
        tone={overdueLoans === 0 ? 'neutral' : 'danger'}
        compact
      />
    </section>
  );
}

/**
 * Resumen de Materiales (ADR 0025): las cifras, los avisos de lo que pide atención (préstamos atrasados y materiales
 * bajo su mínimo) y las acciones de cada día.
 */
export function MaterialsSummaryPage() {
  const { workspaceId, base, canLend } = useMaterials();
  const summary = useMaterialsSummary(workspaceId);
  const data = summary.data;
  return (
    <>
      <SectionHeader title="Resumen" updatedAt={summary.dataUpdatedAt} />
      <div className="mt-6 grid gap-4 sm:gap-6">
        {summary.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-72 rounded-card" />
          </div>
        ) : summary.isError || !data ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
          </div>
        ) : (
          <>
            <Figures summary={data} />
            {data.overdueLoans > 0 ? (
              <NoticeCard
                icon={AlertTriangle}
                tone="danger"
                title={countText(data.overdueLoans, 'préstamo atrasado', 'préstamos atrasados')}
                text="Pasó la fecha prevista y aún falta material por devolver."
                action="Ver atrasados"
                to={`${base}/prestamos?filtro=overdue`}
              />
            ) : null}
            {data.belowMinimum > 0 ? (
              <NoticeCard
                icon={PackageSearch}
                title={countText(data.belowMinimum, 'material bajo su mínimo', 'materiales bajo su mínimo')}
                text="Su existencia total bajó de lo que el espacio definió como mínimo."
                action="Ver inventario"
                to={`${base}/inventario`}
              />
            ) : null}
            <QuickActions
              moduleCode="materials"
              title="Material del laboratorio"
              description="Presta material, recibe devoluciones y mantén al día lo que se gasta."
            >
              {canLend ? (
                <Link to={`${base}/prestamos?nuevo=1`} className={quickActionPrimary}>
                  <Plus className="size-4" aria-hidden />
                  Nuevo préstamo
                </Link>
              ) : null}
              <Link to={`${base}/inventario`} className={quickActionSecondary}>
                Ver inventario
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </QuickActions>
          </>
        )}
      </div>
    </>
  );
}
