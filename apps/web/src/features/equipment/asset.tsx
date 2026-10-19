import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@platlab/ui';
import { Archive } from 'lucide-react';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { WithBack } from '../../app/back-button';
import { useExtensions } from '../../app/extensions';
import { fold } from '../../app/fold';
import { formatDateTime } from '../../app/format';
import { useShellTrail } from '../../app/shell-trail';
import { QueryErrorState } from '../../app/states';
import { AssetHeader, type AssetSheet } from './asset-head';
import { AssetDocuments } from './asset-documents';
import { AssetFaults } from './asset-faults';
import { AssetHistory } from './asset-history';
import { useEquipment } from './context';
import { ASSET_STATUS, ASSET_TAB } from './extension-points';
import { LifeRecordPrint } from './life-record-print';
import { useAreas, useAsset, useAssetHistory } from './queries';
import { AssetFormSheet } from './sheets/asset-sheet';
import { ConditionSheet } from './sheets/condition-sheet';
import { ReportFaultSheet } from './sheets/report-fault-sheet';
import { TransferSheet } from './sheets/transfer-sheet';

/** La hoja abierta; `id` la monta de nuevo en cada apertura (formulario limpio, clave idempotente nueva). */
interface OpenSheet {
  kind: AssetSheet;
  id: number;
  open: boolean;
}

/**
 * La tira de pestañas: si no caben, se desplaza a un lado (sin barra) y un degradado en el borde avisa de que hay más.
 * Al montar y al cambiar de pestaña, la activa se acerca a la vista sin animación si se pidió menos movimiento.
 */
function TabStrip({ label, active, children }: { label: string; active: string; children: ReactNode }) {
  const list = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const node = list.current;
    if (!node) return;
    const measure = () => setEdges({ start: node.scrollLeft > 1, end: node.scrollLeft + node.clientWidth < node.scrollWidth - 1 });
    const current = node.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
    if (current) {
      // Horizontal y «lo más cerca»: scrollIntoView movería también la página hasta las pestañas.
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const before = current.offsetLeft - 8;
      const after = current.offsetLeft + current.offsetWidth + 8 - node.clientWidth;
      const left = before < node.scrollLeft ? before : after > node.scrollLeft ? after : node.scrollLeft;
      if (left !== node.scrollLeft) node.scrollTo({ left: Math.max(0, left), behavior: calm ? 'auto' : 'smooth' });
    }
    measure();
    node.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      node.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [active]);
  const fade = 'pointer-events-none absolute inset-y-0 w-10 from-surface-sunken via-surface-sunken/80 to-transparent transition-opacity duration-150 motion-reduce:transition-none';
  return (
    <div className="relative w-fit max-w-full">
      <TabsList
        ref={list}
        aria-label={label}
        className="flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:shrink-0 [&>button]:whitespace-nowrap"
      >
        {children}
      </TabsList>
      <span aria-hidden className={`${fade} left-0 rounded-l-full bg-linear-to-r ${edges.start ? 'opacity-100' : 'opacity-0'}`} />
      <span aria-hidden className={`${fade} right-0 rounded-r-full bg-linear-to-l ${edges.end ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}

/**
 * Ficha del equipo, segundo nivel del inventario (ADR 0019): el membrete de vidrio con sus acciones y todos sus
 * datos y, en pestañas, Incidentes (a quien los ve), Documentos, Historial y las de otros módulos (`?pestana=`). Un equipo dado de baja lo dice en una franja
 * neutra, con la fecha y el motivo del último cambio, y no ofrece ninguna acción (salvo la Hoja de vida imprimible). Las migas de la barra suman
 * el área y el nombre del equipo; ← vuelve un paso, o al área.
 */
export function EquipmentAssetPage() {
  const { workspaceId, me, base, canManage, canOperate, freshness } = useEquipment();
  const { assetId = '' } = useParams();
  const asset = useAsset(workspaceId, assetId);
  const history = useAssetHistory(workspaceId, assetId);
  const areas = useAreas(workspaceId);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const [printing, setPrinting] = useState(false);
  const [search, setSearch] = useSearchParams();
  const extraTabs = useExtensions(ASSET_TAB, me).map((tab) => ({ ...tab, value: fold(tab.label).replace(/\s+/g, '-') }));
  const statusLines = useExtensions(ASSET_STATUS, me);
  const timeZone = me.workspace.timeZone;
  const canReport = canOperate && me.permissions.includes('equipment.fault.report');
  // Los incidentes de un equipo los ve quien las reporta o las atiende.
  const seesFaults = me.permissions.includes('equipment.fault.report') || me.permissions.includes('equipment.fault.manage');
  // El área sale de la lista de áreas; mientras no llega, la barra solo dice el equipo.
  const areaId = asset.data?.location.areaId;
  const areaName = areas.data ? (areas.data.items.find((entry) => entry.id === areaId)?.name ?? asset.data?.location.path[0]) : undefined;
  useShellTrail(
    asset.data
      ? [...(areaName && areaId ? [{ label: areaName, to: `${base}/inventario/area/${areaId}` }] : []), { label: asset.data.name }]
      : [],
  );

  if (asset.isPending) {
    return (
      <div className="grid gap-4" role="status" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-64 rounded-[28px]" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (asset.isError) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <QueryErrorState error={asset.error} onRetry={() => void asset.refetch()} />
      </div>
    );
  }

  const data = asset.data;
  const stamps = [asset.dataUpdatedAt, history.dataUpdatedAt];
  const updatedAt = stamps.every((stamp) => stamp > 0) ? Math.min(...stamps) : 0;
  const retirement =
    data.condition === 'retired' ? history.data?.items.find((event) => event.kind === 'condition' && event.to === 'retired') : undefined;
  // La pestaña va en la URL para poder enlazarla («?pestana=mantenimiento»); una desconocida cae en la primera.
  const tabs = [...(seesFaults ? ['incidentes'] : []), 'documentos', 'historial', ...extraTabs.map((tab) => tab.value)];
  const requested = search.get('pestana');
  const tab = requested && tabs.includes(requested) ? requested : (tabs[0] ?? 'historial');
  const selectTab = (value: string) =>
    setSearch(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('pestana', value);
        return next;
      },
      { replace: true },
    );
  const openSheet = (kind: AssetSheet) => setSheet({ kind, id: Date.now(), open: true });
  const closeSheet = (open: boolean) => setSheet((current) => (current ? { ...current, open } : current));

  return (
    <div className="grid gap-6">
      <WithBack parent={`${base}/inventario/area/${data.location.areaId}`}>
        <section aria-label="Datos del equipo">
          <AssetHeader
            asset={data}
            canChangeCondition={canOperate && me.permissions.includes('equipment.condition.change')}
            canTransfer={canOperate && me.permissions.includes('equipment.transfer.create')}
            canEdit={canManage}
            canReport={canReport}
            freshness={{ updatedAt, refreshing: freshness.refreshing, refresh: freshness.refresh }}
            labelsTo={`${base}/inventario/area/${data.location.areaId}/etiquetas?${new URLSearchParams({ equipos: data.id })}`}
            timeZone={timeZone}
            onAction={openSheet}
            onLifeRecord={() => setPrinting(true)}
            statusLines={statusLines.map(({ code, Component }) => (
              <Suspense key={code} fallback={null}>
                <Component assetId={data.id} />
              </Suspense>
            ))}
          />
        </section>
      </WithBack>
      {data.condition === 'retired' ? (
        <p role="status" className="flex items-start gap-2.5 rounded-control bg-surface-sunken px-4 py-3 text-sm text-ink-muted">
          <Archive className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">
            <span className="font-semibold text-ink">
              {retirement ? `Dado de baja el ${formatDateTime(retirement.occurredAt, timeZone)}` : 'Dado de baja'}
            </span>
            {retirement?.kind === 'condition' ? ` · ${retirement.reason}` : ''}
          </span>
        </p>
      ) : null}
      <Tabs value={tab} onValueChange={selectTab} className="min-w-0">
        <TabStrip label="Secciones de la ficha" active={tab}>
          {seesFaults ? <TabsTrigger value="incidentes">Incidentes</TabsTrigger> : null}
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          {extraTabs.map((extra) => (
            <TabsTrigger key={extra.code} value={extra.value}>
              {extra.label}
            </TabsTrigger>
          ))}
        </TabStrip>
        {seesFaults ? (
          <TabsContent value="incidentes">
            <AssetFaults assetId={data.id} />
          </TabsContent>
        ) : null}
        <TabsContent value="documentos">
          <AssetDocuments assetId={data.id} retired={data.condition === 'retired'} />
        </TabsContent>
        <TabsContent value="historial">
          <AssetHistory assetId={data.id} seesFaults={seesFaults} timeZone={timeZone} />
        </TabsContent>
        {extraTabs.map(({ code, value, Component }) => (
          <TabsContent key={code} value={value}>
            <Suspense fallback={<Skeleton className="h-40" />}>
              <Component assetId={data.id} />
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
      {sheet?.kind === 'condition' ? (
        <ConditionSheet
          key={sheet.id}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={closeSheet}
          asset={data}
          canManage={canManage}
        />
      ) : null}
      {sheet?.kind === 'edit' ? (
        <AssetFormSheet
          key={sheet.id}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={closeSheet}
          base={base}
          canManage={canManage}
          asset={data}
        />
      ) : null}
      {sheet?.kind === 'fault' ? (
        <ReportFaultSheet
          key={sheet.id}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={closeSheet}
          asset={{
            id: data.id,
            code: data.code,
            name: data.name,
            photoUrl: data.photoUrl,
            location: { name: data.location.name, path: data.location.path },
          }}
        />
      ) : null}
      {sheet?.kind === 'transfer' ? (
        <TransferSheet key={sheet.id} workspaceId={workspaceId} open={sheet.open} onOpenChange={closeSheet} asset={data} />
      ) : null}
      {printing ? <LifeRecordPrint assetId={data.id} seesFaults={seesFaults} onClose={() => setPrinting(false)} /> : null}
    </div>
  );
}
