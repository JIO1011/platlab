import type { Fault } from '@platlab/contracts';
import { Badge, Button, cn, Skeleton, StatePanel, Tabs, TabsContent, TabsList, TabsTrigger } from '@platlab/ui';
import { Inbox, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { QueryErrorState } from '../../app/states';
import { useNow } from '../../app/use-now';
import { AssetThumb } from './asset-list';
import { placeLines } from './asset-text';
import { useEquipment } from './context';
import { faultStepParts, faultTypeLabel, faultViewFrom, faultViews, type FaultView } from './fault-text';
import { useFaultCounts, useFaults } from './queries';
import { SectionHeader } from '../../app/section-header';
import { FaultSheet } from './sheets/fault-sheet';
import { ReportFaultSheet } from './sheets/report-fault-sheet';

/** Una hoja abierta; `n` la monta de nuevo en cada apertura (formulario limpio, clave idempotente nueva). */
interface OpenSheet {
  n: number;
  open: boolean;
}

const emptyTitle: Record<FaultView, string> = {
  reportados: 'No hay incidentes por atender',
  'en-reparacion': 'No hay incidentes en reparación',
  solucionados: 'No hay incidentes solucionados',
};

/**
 * Incidentes de Equipos (ADR 0019): una fila por incidente (la falla de un equipo) en una sola tarjeta, con una
 * pestaña por paso (Reportados, En reparación y Solucionados, cada una con su conteo) que vive en la URL. El incidente se abre en una hoja enlazable con
 * `?falla=`. Quien atiende ve todos; quien solo reporta, los suyos («Mis incidentes»), y desde aquí reporta uno nuevo.
 */
export function EquipmentFaultsPage() {
  const { workspaceId, me, base, canOperate } = useEquipment();
  const [params, setParams] = useSearchParams();
  const view = faultViewFrom(params.get('estado'));
  const status = faultViews.find((entry) => entry.value === view)?.status ?? 'open';
  const faults = useFaults(workspaceId, { statuses: [status] });
  const counts = useFaultCounts(workspaceId);
  const now = useNow(30_000);
  const canHandle = me.permissions.includes('equipment.fault.manage');
  const canReport = canOperate && me.permissions.includes('equipment.fault.report');
  const canSeeAssets = me.permissions.includes('equipment.catalog.read');
  const timeZone = me.workspace.timeZone;

  // `scanned`: el equipo del QR con que se llegó (`?reportar=`), que la hoja busca y deja elegido.
  const [reporting, setReporting] = useState<(OpenSheet & { scanned: string | null }) | null>(null);
  const [detail, setDetail] = useState<(OpenSheet & { id: string }) | null>(null);
  const faultId = params.get('falla');
  const scannedId = params.get('reportar');

  // El QR de un equipo llega con `?reportar=`: abre «Reportar incidente» con ese equipo (E-01d).
  if (scannedId && canReport && reporting?.scanned !== scannedId) {
    setReporting({ open: true, n: (reporting?.n ?? 0) + 1, scanned: scannedId });
  }

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
        if (next === 'reportados') search.delete('estado');
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
  const openReport = () => setReporting({ open: true, n: (reporting?.n ?? 0) + 1, scanned: null });
  // Al cerrar se olvida el equipo del QR y se quita `?reportar=`: volver a escanearlo abre la hoja otra vez.
  const closeReport = (open: boolean) => {
    if (open) return;
    setReporting((current) => (current ? { ...current, open: false, scanned: null } : current));
    if (scannedId) {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete('reportar');
          return next;
        },
        { replace: true },
      );
    }
  };

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
      <Tabs value={view} onValueChange={(value) => chooseView(faultViewFrom(value))} className="mt-6">
        <TabsList aria-label="Incidentes por paso" className="flex w-full sm:inline-flex sm:w-auto">
          {faultViews.map((entry) => (
            <TabsTrigger
              key={entry.value}
              value={entry.value}
              // En el móvil, el nombre (en una línea) y su conteo se apilan para que las tres quepan y midan lo mismo; desde sm, en una línea.
              className="inline-flex h-auto min-h-[44px] flex-1 flex-col items-center justify-center whitespace-nowrap px-1 py-1 text-[13px] leading-tight sm:h-9 sm:min-h-0 sm:flex-none sm:flex-row sm:gap-1.5 sm:px-4 sm:py-0 sm:text-sm"
            >
              {entry.label}
              {/* Su lugar está reservado mientras carga: en el móvil la pestaña no cambia de alto al llegar el conteo. */}
              <span className="min-h-[16px] tabular-nums text-ink-subtle sm:min-h-0 sm:empty:hidden">{counts.data?.[entry.count]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent
          value={view}
          className="pt-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action"
          aria-busy={faults.isPlaceholderData}
        >
          {faults.isPending ? (
            <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-4 xl:grid-cols-2">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-32 rounded-card" />
              ))}
            </div>
          ) : faults.isError ? (
            <div className="rounded-card bg-surface shadow-raised">
              <QueryErrorState error={faults.error} onRetry={() => void faults.refetch()} />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-card bg-surface shadow-raised">
              <StatePanel
                icon={Inbox}
                title={!canHandle && view === 'reportados' ? 'No tienes incidentes por atender' : emptyTitle[view]}
                description={
                  canHandle
                    ? 'Cuando alguien reporte un incidente de un equipo, aparecerá aquí.'
                    : 'Cada incidente que reportes quedará aquí con su estado hasta que se solucione.'
                }
                action={view === 'reportados' && reportButton ? reportButton : undefined}
              />
            </div>
          ) : (
            // Una tarjeta compacta por incidente: una columna hasta 1280 px y dos desde ahí.
            <ul className={cn('grid gap-4 xl:grid-cols-2', faults.isPlaceholderData && 'opacity-60 transition-opacity')}>
              {items.map((item) => (
                <FaultRow key={item.id} fault={item} now={now} to={detailTo(item.id)} />
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
        </TabsContent>
      </Tabs>
      {reporting ? (
        <ReportFaultSheet
          key={reporting.n}
          workspaceId={workspaceId}
          open={reporting.open}
          onOpenChange={closeReport}
          scannedAssetId={reporting.scanned}
        />
      ) : null}
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

/**
 * Una tarjeta compacta por incidente, con todo junto para que el ojo no cruce la pantalla: arriba, el código del
 * equipo en etiqueta y «No se puede usar» si hace falta; debajo, el nombre (el enlace, que se extiende sobre toda la
 * tarjeta y dibuja el foco en ella) y «área › lugar · tipo»; al pie, tras una línea, el paso en que está: cuándo y quién.
 */
function FaultRow({ fault, now, to }: { fault: Fault; now: number; to: { search: string } }) {
  const place = placeLines(fault.asset.location);
  const step = faultStepParts(fault, now);
  return (
    <li className="relative flex flex-col gap-3 rounded-card bg-surface p-4 shadow-raised transition-[box-shadow] duration-200 ease-out-expo hover:shadow-float has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-action">
      <div className="flex min-w-0 items-start gap-3">
        <AssetThumb asset={fault.asset} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CodeTag>{fault.asset.code}</CodeTag>
            {fault.usable ? null : <Badge tone="danger">No se puede usar</Badge>}
          </div>
          <p className="mt-1.5 break-words font-semibold leading-snug text-ink">
            <Link to={to} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">
              {fault.asset.name}
            </Link>
          </p>
          <p className="mt-0.5 break-words text-[13px] text-ink-muted">
            {place.full} · {faultTypeLabel[fault.faultType]}
          </p>
        </div>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-2 border-t border-line pt-3 text-[13px]">
        <span className="text-ink-muted">{step.when}</span>
        <span aria-hidden className="text-ink-subtle">
          ·
        </span>
        <span className="font-medium text-ink">{step.who}</span>
      </p>
    </li>
  );
}
