import type { AssetCondition, EquipmentSummary } from '@platlab/contracts';
import { Skeleton } from '@platlab/ui';
import { CircleCheck, CircleX, List, Microscope, Plus, ScanLine, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { QuickActions, quickActionPrimary, quickActionSecondary } from '../../app/quick-actions';
import { StatLink } from '../../app/stat-link';
import { QueryErrorState } from '../../app/states';
import { AreaStatusCard } from './area-status-card';
import { assetSearch } from './asset-filters';
import { useEquipment } from './context';
import { EquipmentScan } from './equipment-scan';
import { IncidentsCard } from './incidents-card';
import { useEquipmentSummary } from './queries';
import { SectionHeader } from './section-header';
import { RegisterAsset } from './sheets/register-asset';

/** El Informe con estas condiciones ya filtradas: lo que abre cada cifra. */
const reportLink = (base: string, conditions: AssetCondition[]) => {
  const search = assetSearch({ conditions }).toString();
  return search ? `${base}/informe?${search}` : `${base}/informe`;
};

/**
 * Resumen de Equipos (ADR 0011, 0019): cuatro cifras por estado, cada una con su lista en el
 * Informe; debajo, a la izquierda, la banda para registrar, escanear o ir al inventario y los incidentes de los
 * últimos 12 meses (solo para quien atiende fallas) y, a la derecha, el estado de las áreas.
 */
export function EquipmentSummaryPage() {
  const { workspaceId, me, base, canManage } = useEquipment();
  const canHandleFaults = me.permissions.includes('equipment.fault.manage');
  const summary = useEquipmentSummary(workspaceId);
  const title = me.modules.find((entry) => entry.code === 'equipment')?.name ?? 'Equipos';

  return (
    <>
      <SectionHeader title={title} updatedAt={summary.dataUpdatedAt} />
      <div className="mt-6">
        {summary.isPending ? (
          <SummarySkeleton withIncidents={canHandleFaults} />
        ) : summary.isError ? (
          <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : (
          <div className="grid gap-5 sm:gap-6">
            <Indicators counters={summary.data.summary} base={base} />
            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2 xl:grid-cols-12">
              <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-7">
                <QuickActions
                  moduleCode="equipment"
                  title="Inventario de equipos"
                  badge={{ icon: Microscope, label: 'Gestión rápida' }}
                  description={
                    canManage
                      ? 'Registra un equipo con su tipo, su ubicación y quién responde. Para buscar o filtrar, abre Inventario.'
                      : 'Busca por nombre, código, marca, modelo o serie, o filtra por estado, tipo y ubicación.'
                  }
                  className="xl:py-9"
                >
                  {canManage ? (
                    <RegisterAsset>
                      {(open) => (
                        <button type="button" className={quickActionPrimary} onClick={open}>
                          <Plus className="size-[18px]" aria-hidden />
                          Registrar equipo
                        </button>
                      )}
                    </RegisterAsset>
                  ) : (
                    <Link to={`${base}/inventario`} className={quickActionPrimary}>
                      <List className="size-[18px]" aria-hidden />
                      Ver inventario
                    </Link>
                  )}
                  <EquipmentScan>
                    {(open) => (
                      <button type="button" className={quickActionSecondary} onClick={open}>
                        <ScanLine className="size-[18px]" aria-hidden />
                        Escanear
                      </button>
                    )}
                  </EquipmentScan>
                </QuickActions>
                {canHandleFaults ? <IncidentsCard /> : null}
              </div>
              <div className="min-w-0 xl:col-span-5">
                <AreaStatusCard />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Las cuatro cifras: el color cuenta un estado y solo si lo hay (ámbar con uso limitado, rojo con fallas). */
function Indicators({ counters, base }: { counters: EquipmentSummary['summary']; base: string }) {
  const { assets, operational, restricted, faulted } = counters;
  const attentionHint = (n: number) => (n === 1 ? 'Requiere atención' : 'Requieren atención');
  return (
    <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
      <StatLink
        to={reportLink(base, [])}
        label="Equipos"
        value={assets}
        hint="Sin contar los dados de baja"
        icon={Microscope}
        compact
      />
      <StatLink
        to={reportLink(base, ['operational'])}
        label="Operativos"
        value={operational}
        hint={operational === 0 ? 'Ninguno' : 'Listos para usar'}
        hintTone={operational === 0 ? 'neutral' : 'success'}
        icon={CircleCheck}
        tone={operational === 0 ? 'neutral' : 'success'}
        compact
      />
      <StatLink
        to={reportLink(base, ['restricted'])}
        label="Uso limitado"
        value={restricted}
        hint={restricted === 0 ? 'Ninguno' : attentionHint(restricted)}
        hintTone={restricted === 0 ? 'neutral' : 'warning'}
        icon={TriangleAlert}
        tone={restricted === 0 ? 'neutral' : 'warning'}
        compact
      />
      <StatLink
        to={reportLink(base, ['faulted'])}
        label="Fuera de servicio"
        value={faulted}
        hint={faulted === 0 ? 'Ninguno' : attentionHint(faulted)}
        hintTone={faulted === 0 ? 'neutral' : 'danger'}
        icon={CircleX}
        tone={faulted === 0 ? 'neutral' : 'danger'}
        compact
      />
    </section>
  );
}

/** Esqueleto quieto con la forma real: cuatro cifras, la banda y las tarjetas de las dos columnas. */
function SummarySkeleton({ withIncidents }: { withIncidents: boolean }) {
  return (
    <div className="grid gap-5 sm:gap-6" role="status" aria-busy="true" aria-label="Cargando">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-28 rounded-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-7">
          <Skeleton className="h-40 rounded-card" />
          {withIncidents ? <Skeleton className="h-96 rounded-card" /> : null}
        </div>
        <Skeleton className="h-96 rounded-card xl:col-span-5" />
      </div>
    </div>
  );
}
