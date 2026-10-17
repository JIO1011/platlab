import type { Asset, AssetCondition, EquipmentSummary } from '@platlab/contracts';
import { Skeleton, StatePanel } from '@platlab/ui';
import { ArrowRight, ChevronRight, CircleCheck, CircleX, List, MapPin, Microscope, Plus, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { QuickActions, quickActionPrimary } from '../../app/quick-actions';
import { StatLink } from '../../app/stat-link';
import { QueryErrorState } from '../../app/states';
import { assetSearch, emptyAssetQuery, type AssetQuery } from './asset-filters';
import { placeLines } from './asset-text';
import { ConditionBadge } from './condition-badge';
import { pendingFaultsText } from './fault-text';
import { useEquipment } from './context';
import { useAssets, useEquipmentSummary } from './queries';
import { SectionHeader } from './section-header';
import { RegisterAsset } from './sheets/register-asset';

/** Los que requieren atención: con uso limitado o fuera de servicio (ADR 0019). */
const attentionConditions: AssetCondition[] = ['faulted', 'restricted'];
const attentionQuery: AssetQuery = { ...emptyAssetQuery, conditions: attentionConditions };

/** El Informe con estas condiciones ya filtradas: lo que abre cada cifra. */
const reportLink = (base: string, conditions: AssetCondition[]) => {
  const search = assetSearch({ conditions }).toString();
  return search ? `${base}/informe?${search}` : `${base}/informe`;
};

/**
 * Resumen de Equipos (ADR 0011, 0019): cuatro cifras por estado, cada una con su lista en el
 * Inventario; la banda para ir al inventario y los equipos que requieren atención.
 */
export function EquipmentSummaryPage() {
  const { workspaceId, me, base, canManage } = useEquipment();
  const summary = useEquipmentSummary(workspaceId);
  const attention = useAssets(workspaceId, attentionQuery, 20);
  const title = me.modules.find((entry) => entry.code === 'equipment')?.name ?? 'Equipos';
  const stamps = [summary.dataUpdatedAt, attention.dataUpdatedAt];
  // «Actualizado hace…» informa lo más antiguo de lo que la sección muestra, nunca lo más fresco.
  const updatedAt = stamps.every((stamp) => stamp > 0) ? Math.min(...stamps) : 0;

  return (
    <>
      <SectionHeader title={title} updatedAt={updatedAt} />
      <div className="mt-6">
        {summary.isPending ? (
          <SummarySkeleton />
        ) : summary.isError ? (
          <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : (
          <div className="grid gap-5 sm:gap-6">
            {summary.data.summary.pendingRequests > 0 ? (
              <PendingNotice
                to={`${base}/incidentes`}
                text={pendingFaultsText(summary.data.summary.pendingRequests, me.permissions.includes('equipment.fault.manage'))}
              />
            ) : null}
            <Indicators counters={summary.data.summary} base={base} />
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
            </QuickActions>
            <Attention
              base={base}
              total={summary.data.summary.restricted + summary.data.summary.faulted}
              empty={summary.data.summary.assets === 0}
              attention={attention}
            />
          </div>
        )}
      </div>
    </>
  );
}

/** Lo pendiente de los incidentes, en ámbar y solo si existe: abre la sección Incidentes. */
function PendingNotice({ to, text }: { to: string; text: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-card bg-warning-soft px-5 py-4 text-warning transition-colors hover:bg-warning-soft/70"
    >
      <TriangleAlert className="size-5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 font-semibold">{text}</span>
      <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
        Ver incidentes
        <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
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

/**
 * «Requieren atención»: los equipos con uso limitado o fuera de servicio, cada fila con su ficha. Sin
 * ninguno, lo dice; sin equipos en el espacio, dice eso.
 */
function Attention({
  base,
  total,
  empty,
  attention,
}: {
  base: string;
  total: number;
  /** El espacio no tiene equipos todavía. */
  empty: boolean;
  attention: ReturnType<typeof useAssets>;
}) {
  const items = attention.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section aria-labelledby="requieren-atencion" className="rounded-card bg-surface shadow-raised">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <h2 id="requieren-atencion" className="text-lg font-bold text-ink">
          Requieren atención
        </h2>
        {total > 0 ? (
          <Link
            to={reportLink(base, attentionConditions)}
            className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-action transition-colors hover:text-action-hover"
          >
            Ver en el informe
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      {attention.isPending ? (
        <div className="grid gap-4 px-5 py-5 sm:px-6" role="status" aria-busy="true" aria-label="Cargando">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      ) : attention.isError ? (
        <QueryErrorState error={attention.error} onRetry={() => void attention.refetch()} />
      ) : items.length === 0 ? (
        <StatePanel
          icon={empty ? Microscope : CircleCheck}
          title={empty ? 'Aún no hay equipos' : 'Todos los equipos están operativos'}
          description={
            empty
              ? 'Cuando se registren equipos, los que tengan uso limitado o fallas aparecerán aquí.'
              : 'Los equipos con uso limitado o fuera de servicio aparecerán aquí.'
          }
          className="py-10"
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((asset) => (
            <li key={asset.id}>
              <AttentionRow asset={asset} to={`${base}/inventario/${asset.id}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AttentionRow({ asset, to }: { asset: Asset; to: string }) {
  const place = placeLines(asset.location);
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-sunken/60 focus-visible:-outline-offset-2 sm:px-6"
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="font-mono text-[13px] tabular-nums text-ink-muted">{asset.code}</span>
          <span className="break-words font-bold text-ink">{asset.name}</span>
        </p>
        <p title={place.full} className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-ink-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{place.rest ? `${place.room} · ${place.rest}` : place.room}</span>
        </p>
      </div>
      <ConditionBadge condition={asset.condition} className="shrink-0 whitespace-nowrap" />
      <ChevronRight
        className="size-4 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

/** Esqueleto quieto con la forma real: cuatro cifras, la banda y la lista. */
function SummarySkeleton() {
  return (
    <div className="grid gap-5 sm:gap-6" role="status" aria-busy="true" aria-label="Cargando">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-28 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-card" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
