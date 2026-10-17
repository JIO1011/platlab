import type { Fault } from '@platlab/contracts';
import { Badge, Button, Segmented, Skeleton, StatePanel } from '@platlab/ui';
import { Inbox, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { useNow } from '../../app/use-now';
import { AssetThumb } from './asset-list';
import { placeLines } from './asset-text';
import { useEquipment } from './context';
import { FaultSteps } from './fault-steps';
import {
  faultAgo,
  faultTypeLabel,
  faultViewFrom,
  faultViews,
  personText,
  type FaultView,
} from './fault-text';
import { useFaults } from './queries';
import { SectionHeader } from './section-header';
import { FaultSheet } from './sheets/fault-sheet';
import { ReportFaultSheet } from './sheets/report-fault-sheet';

/** Una hoja abierta; `n` la monta de nuevo en cada apertura (formulario limpio, clave idempotente nueva). */
interface OpenSheet {
  n: number;
  open: boolean;
}

const emptyTitle: Record<FaultView, string> = {
  'en-curso': 'No hay incidentes en curso',
  solucionados: 'No hay incidentes solucionados',
};

/**
 * Incidentes de Equipos (ADR 0019): una tarjeta por incidente (la falla de un equipo), en tres vistas
 * (En curso y Solucionados) que viven en la URL. El incidente se abre en una hoja enlazable con
 * `?falla=`. Quien atiende ve todos; quien solo reporta, los suyos («Mis incidentes»), y desde aquí reporta uno nuevo.
 */
export function EquipmentFaultsPage() {
  const { workspaceId, me, base, canOperate } = useEquipment();
  const [params, setParams] = useSearchParams();
  const view = faultViewFrom(params.get('estado'));
  const statuses = faultViews.find((entry) => entry.value === view)?.statuses ?? [];
  const faults = useFaults(workspaceId, { statuses });
  const now = useNow(30_000);
  const canHandle = me.permissions.includes('equipment.fault.manage');
  const canReport = canOperate && me.permissions.includes('equipment.fault.report');
  const canSeeAssets = me.permissions.includes('equipment.catalog.read');
  const timeZone = me.workspace.timeZone;

  const [reporting, setReporting] = useState<OpenSheet | null>(null);
  const [detail, setDetail] = useState<(OpenSheet & { id: string }) | null>(null);
  const faultId = params.get('falla');

  // La hoja del incidente sigue a la URL: un enlace `?falla=` la abre y quitarlo (atrás) la cierra.
  if (faultId && (!detail || detail.id !== faultId || !detail.open)) {
    setDetail({ id: faultId, open: true, n: (detail?.n ?? 0) + 1 });
  } else if (!faultId && detail?.open) {
    setDetail({ ...detail, open: false });
  }

  const closeDetail = (open: boolean) => {
    if (open) return;
    setDetail((current) => (current ? { ...current, open: false } : current));
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('falla');
        return next;
      },
      { replace: true },
    );
  };
  const chooseView = (next: FaultView) =>
    setParams(
      (previous) => {
        const search = new URLSearchParams(previous);
        if (next === 'en-curso') search.delete('estado');
        else search.set('estado', next);
        return search;
      },
      { replace: true },
    );
  const detailTo = (id: string) => {
    const search = new URLSearchParams(params);
    search.set('falla', id);
    return { search: `?${search}` };
  };
  const openReport = () => setReporting({ open: true, n: (reporting?.n ?? 0) + 1 });

  const items = faults.data?.pages.flatMap((page) => page.items) ?? [];
  const reportButton = canReport ? (
    <Button variant="primary" className="h-12 sm:h-10" onClick={openReport}>
      <TriangleAlert aria-hidden />
      Reportar incidente
    </Button>
  ) : undefined;

  return (
    <>
      <SectionHeader title={canHandle ? 'Incidentes' : 'Mis incidentes'} updatedAt={faults.dataUpdatedAt} actions={reportButton} />
      <div className="mt-6">
        <Segmented
          label="Filtrar incidentes"
          value={view}
          options={faultViews.map((entry) => ({ value: entry.value, label: entry.label }))}
          onValueChange={chooseView}
        />
      </div>
      <div className="mt-4" aria-busy={faults.isPlaceholderData}>
        {faults.isPending ? (
          <div className="grid gap-3" role="status" aria-busy="true" aria-label="Cargando">
            <Skeleton className="h-32 rounded-card" />
            <Skeleton className="h-32 rounded-card" />
          </div>
        ) : faults.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={faults.error} onRetry={() => void faults.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel
              icon={Inbox}
              title={!canHandle && view === 'en-curso' ? 'No has reportado incidentes' : emptyTitle[view]}
              description={
                canHandle
                  ? 'Cuando alguien reporte un incidente de un equipo, aparecerá aquí.'
                  : 'Cada incidente que reportes quedará aquí con su estado hasta que se solucione.'
              }
              action={view === 'en-curso' && reportButton ? reportButton : undefined}
            />
          </div>
        ) : (
          <ul className={faults.isPlaceholderData ? 'grid gap-3 opacity-60 transition-opacity' : 'grid gap-3'}>
            {items.map((item) => (
              <li key={item.id}>
                <FaultCard fault={item} now={now} to={detailTo(item.id)} />
              </li>
            ))}
          </ul>
        )}
        {faults.hasNextPage ? (
          <div className="mt-5 text-center">
            <Button className="h-[44px] sm:h-10" loading={faults.isFetchingNextPage} onClick={() => void faults.fetchNextPage()}>
              Cargar más
            </Button>
          </div>
        ) : null}
      </div>
      {reporting ? <ReportFaultSheet key={reporting.n} workspaceId={workspaceId} open={reporting.open} onOpenChange={(open) => setReporting((current) => (current ? { ...current, open } : current))} /> : null}
      {detail ? (
        <FaultSheet
          key={detail.n}
          workspaceId={workspaceId}
          open={detail.open}
          onOpenChange={closeDetail}
          faultId={detail.id}
          timeZone={timeZone}
          canHandle={canHandle && canOperate}
          fichaBase={canSeeAssets ? `${base}/inventario` : null}
        />
      ) : null}
    </>
  );
}

/** Una tarjeta por incidente, como las de Solicitudes: el nombre del equipo es el enlace y se extiende sobre la tarjeta. */
function FaultCard({ fault, now, to }: { fault: Fault; now: number; to: { search: string } }) {
  const place = placeLines(fault.asset.location);
  const titleId = `falla-${fault.id}`;
  return (
    <article
      aria-labelledby={titleId}
      className="relative rounded-card bg-surface p-4 shadow-raised transition-colors hover:bg-surface-sunken/40 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-action sm:p-5"
    >
      <div className="flex items-start gap-3">
        <AssetThumb asset={fault.asset} />
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="break-words font-semibold text-ink">
            <span className="mr-1.5 font-mono text-[13px] font-normal tabular-nums text-ink-muted">{fault.asset.code}</span>
            <Link to={to} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">
              {fault.asset.name}
            </Link>
          </h3>
          <p className="break-words text-[13px] text-ink-muted">{place.full}</p>
        </div>
      </div>
      <FaultSteps status={fault.status} className="mt-3" />
      <p className="mt-3 line-clamp-2 break-words text-sm text-ink">{fault.description}</p>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-ink-muted">
        <span>{faultTypeLabel[fault.faultType]}</span>
        {fault.usable ? null : <Badge tone="danger">No se puede usar</Badge>}
        <span className="basis-full">
          Reportado por {personText(fault.reportedBy)} · <time dateTime={fault.reportedAt}>{faultAgo(fault.reportedAt, now)}</time>
        </span>
      </p>
    </article>
  );
}
