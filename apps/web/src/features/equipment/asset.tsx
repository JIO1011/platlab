import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@platlab/ui';
import { Archive } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { formatDateTime } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { AssetHeader, AssetSummary, type AssetSheet } from './asset-head';
import { AssetFaults } from './asset-faults';
import { AssetHistory } from './asset-history';
import { AssetInfo } from './asset-info';
import { useEquipment } from './context';
import { useAsset, useAssetHistory } from './queries';
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
 * Ficha del equipo, segundo nivel del inventario (ADR 0019): cabecera de vidrio con sus acciones, el resumen
 * en tres cuadros y, en pestañas, Información e Historial. Un equipo dado de baja lo dice en una franja
 * neutra, con la fecha y el motivo del último cambio, y no ofrece ninguna acción.
 */
export function EquipmentAssetPage() {
  const { workspaceId, me, base, canManage, canOperate, freshness } = useEquipment();
  const { assetId = '' } = useParams();
  const asset = useAsset(workspaceId, assetId);
  const history = useAssetHistory(workspaceId, assetId);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const timeZone = me.workspace.timeZone;
  const canReport = canOperate && me.permissions.includes('equipment.fault.report');
  // Las fallas de un equipo las ve quien las reporta o las atiende.
  const seesFaults = me.permissions.includes('equipment.fault.report') || me.permissions.includes('equipment.fault.manage');

  if (asset.isPending) {
    return (
      <div className="grid gap-4" role="status" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-36 rounded-[28px]" />
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
  const openSheet = (kind: AssetSheet) => setSheet({ kind, id: Date.now(), open: true });
  const closeSheet = (open: boolean) => setSheet((current) => (current ? { ...current, open } : current));

  return (
    <div className="grid gap-6">
      <section aria-label="Datos del equipo">
        <AssetHeader
          asset={data}
          canChangeCondition={canOperate && me.permissions.includes('equipment.condition.change')}
          canTransfer={canOperate && me.permissions.includes('equipment.transfer.create')}
          canEdit={canManage}
          canReport={canReport}
          freshness={{ updatedAt, refreshing: freshness.refreshing, refresh: freshness.refresh }}
          onAction={openSheet}
        />
      </section>
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
      {/* Desde `xl`, el resumen es una columna derecha fija; por debajo, una franja bajo la cabecera. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_11rem]">
        <aside aria-label="Resumen del equipo" className="xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1 xl:self-start">
          <AssetSummary asset={data} />
        </aside>
        <Tabs defaultValue="informacion" className="min-w-0 xl:col-start-1 xl:row-start-1">
          <TabsList aria-label="Secciones de la ficha">
            <TabsTrigger value="informacion">Información</TabsTrigger>
            {seesFaults ? <TabsTrigger value="fallas">Fallas</TabsTrigger> : null}
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
          <TabsContent value="informacion">
            <AssetInfo asset={data} timeZone={timeZone} />
          </TabsContent>
          {seesFaults ? (
            <TabsContent value="fallas">
              <AssetFaults assetId={data.id} />
            </TabsContent>
          ) : null}
          <TabsContent value="historial">
            <AssetHistory history={history} timeZone={timeZone} />
          </TabsContent>
        </Tabs>
      </div>
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
    </div>
  );
}
