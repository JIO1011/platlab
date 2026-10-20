import type { AssetCondition, EquipmentSummary } from '@platlab/contracts';
import { Skeleton } from '@platlab/ui';
import { CircleCheck, CircleX, Hourglass, List, Microscope, Plus, ScanLine, ShieldAlert, TriangleAlert, UserX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { NoticeCard } from '../../app/notice-card';
import { QuickActions, quickActionPrimary, quickActionSecondary } from '../../app/quick-actions';
import { StatLink } from '../../app/stat-link';
import { QueryErrorState } from '../../app/states';
import { AreaStatusCard } from './area-status-card';
import { assetSearch, emptyAssetQuery, type AssetQuery } from './asset-filters';
import { NO_RESPONSIBLE } from './asset-text';
import { useEquipment } from './context';
import { EquipmentScan } from './equipment-scan';
import { IncidentsCard } from './incidents-card';
import { OpenFaultsCard } from './open-faults-card';
import { useAssetTotals, useEquipmentSummary } from './queries';
import { SectionHeader } from './section-header';
import { RegisterAsset } from './sheets/register-asset';
import { ReportFaultSheet } from './sheets/report-fault-sheet';

/** El Informe con estas condiciones ya filtradas: lo que abre cada cifra. */
const reportLink = (base: string, conditions: AssetCondition[]) => {
  const search = assetSearch({ conditions }).toString();
  return search ? `${base}/informe?${search}` : `${base}/informe`;
};

/**
 * Resumen de Equipos (ADR 0011, 0019, 0021), con la estructura del de Mantenimiento: cuatro cifras por estado, cada una
 * con su lista en el Informe; debajo, a la izquierda, «Gestión rápida» (registrar, escanear, reportar un incidente) y los
 * incidentes de los últimos 12 meses (solo para quien atiende fallas) y, a la derecha, «Incidentes por atender» (a quien
 * los ve) y el estado de las áreas; al pie, los avisos con su acción, solo si hay alguno. En el móvil, una columna: cifras,
 * gestión rápida, incidentes por atender, gráfico, áreas y avisos.
 */
export function EquipmentSummaryPage() {
  const { workspaceId, me, base, canManage, canOperate } = useEquipment();
  const canHandleFaults = me.permissions.includes('equipment.fault.manage');
  const canReport = canOperate && me.permissions.includes('equipment.fault.report');
  // Los incidentes los ve quien los reporta o los atiende.
  const seesFaults = canHandleFaults || me.permissions.includes('equipment.fault.report');
  const summary = useEquipmentSummary(workspaceId);
  // La hoja de «Reportar incidente»; `n` la monta de nuevo en cada apertura (formulario limpio, clave idempotente nueva).
  const [reporting, setReporting] = useState<{ n: number; open: boolean } | null>(null);
  const title = me.modules.find((entry) => entry.code === 'equipment')?.name ?? 'Equipos';

  return (
    <>
      <SectionHeader title={title} updatedAt={summary.dataUpdatedAt} />
      <div className="mt-6">
        {summary.isPending ? (
          <SummarySkeleton withChart={canHandleFaults} withFaults={seesFaults} />
        ) : summary.isError ? (
          <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : (
          <div className="grid gap-5 sm:gap-6">
            <Indicators counters={summary.data.summary} base={base} />
            {/* En el móvil las columnas se disuelven y `order` fija la lectura; desde xl, cada columna es la suya. */}
            <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-12">
              <div className="contents min-w-0 xl:col-span-7 xl:flex xl:flex-col xl:gap-6">
                <QuickActions
                  moduleCode="equipment"
                  title="Inventario de equipos"
                  badge={{ icon: Microscope, label: 'Gestión rápida' }}
                  description={
                    canManage
                      ? 'Registra un equipo con su tipo, su ubicación y quién responde. Para buscar o filtrar, abre Inventario.'
                      : 'Busca por nombre, código, marca, modelo o serie, o filtra por estado, tipo y ubicación.'
                  }
                  className="order-1 xl:order-none xl:py-9"
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
                  {canReport ? (
                    <button
                      type="button"
                      className={quickActionSecondary}
                      aria-haspopup="dialog"
                      onClick={() => setReporting({ n: (reporting?.n ?? 0) + 1, open: true })}
                    >
                      <TriangleAlert className="size-[18px]" aria-hidden />
                      Reportar incidente
                    </button>
                  ) : null}
                </QuickActions>
                {canHandleFaults ? (
                  <div className="order-3 min-w-0 xl:order-none">
                    <IncidentsCard openFaults={summary.data.summary.openFaults} />
                  </div>
                ) : null}
              </div>
              <div className="contents min-w-0 xl:col-span-5 xl:flex xl:flex-col xl:gap-6">
                {seesFaults ? (
                  <div className="order-2 min-w-0 xl:order-none">
                    <OpenFaultsCard />
                  </div>
                ) : null}
                <div className="order-4 min-w-0 xl:order-none">
                  <AreaStatusCard />
                </div>
              </div>
            </div>
            <Notices workspaceId={workspaceId} base={base} />
          </div>
        )}
      </div>
      {reporting ? (
        <ReportFaultSheet
          key={reporting.n}
          workspaceId={workspaceId}
          open={reporting.open}
          onOpenChange={(open) => {
            if (!open) setReporting((current) => (current ? { ...current, open: false } : current));
          }}
        />
      ) : null}
    </>
  );
}

const countText = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Los avisos del pie, en tarjeta y con su acción: garantía por vencer, vida útil cumplida y sin responsable. Cada uno
 * aparece solo si su cuenta es mayor que cero y lleva al Informe ya filtrado. Salen de los indicadores del Informe sin filtros.
 */
function Notices({ workspaceId, base }: { workspaceId: string; base: string }) {
  const totals = useAssetTotals(workspaceId, emptyAssetQuery);
  if (totals.isPending) return <Skeleton aria-busy="true" className="h-20 rounded-card" />;
  if (totals.isError) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <QueryErrorState error={totals.error} onRetry={() => void totals.refetch()} />
      </div>
    );
  }
  const { warrantyExpiring, usefulLifeReached, withoutResponsible } = totals.data;
  const to = (query: Partial<AssetQuery>) => `${base}/informe?${assetSearch(query)}`;
  const action = 'Ver en el Informe';
  // Avisos cortos: en una fila de tres desde 1280 px, apilados antes.
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {warrantyExpiring > 0 ? (
        <NoticeCard
          icon={ShieldAlert}
          title={`${countText(warrantyExpiring, 'equipo', 'equipos')} con la garantía por vencer`}
          text="Aún cubre fallas, pero termina pronto."
          action={action}
          to={to({ warranties: ['expiring'] })}
        />
      ) : null}
      {usefulLifeReached > 0 ? (
        <NoticeCard
          icon={Hourglass}
          title={`${countText(usefulLifeReached, 'equipo', 'equipos')} con la vida útil cumplida`}
          text="Ya pasaron los años de vida útil que se les fijó."
          action={action}
          to={to({ usefulLives: ['reached'] })}
        />
      ) : null}
      {withoutResponsible > 0 ? (
        <NoticeCard
          icon={UserX}
          tone="neutral"
          title={`${countText(withoutResponsible, 'equipo', 'equipos')} sin responsable`}
          text="Nadie responde por ellos todavía."
          action={action}
          to={to({ responsibles: [NO_RESPONSIBLE] })}
        />
      ) : null}
    </div>
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
function SummarySkeleton({ withChart, withFaults }: { withChart: boolean; withFaults: boolean }) {
  return (
    <div className="grid gap-5 sm:gap-6" role="status" aria-busy="true" aria-label="Cargando">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-28 rounded-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-7">
          <Skeleton className="h-40 rounded-card" />
          {withChart ? <Skeleton className="h-96 rounded-card" /> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-5">
          {withFaults ? <Skeleton className="h-96 rounded-card" /> : null}
          <Skeleton className="h-96 rounded-card" />
        </div>
      </div>
    </div>
  );
}
