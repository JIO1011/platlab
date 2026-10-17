import { Badge, Button, Skeleton, StatePanel } from '@platlab/ui';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { QueryErrorState } from '../../app/states';
import { useNow } from '../../app/use-now';
import { useEquipment } from './context';
import { FaultSteps } from './fault-steps';
import { faultAgo, faultStatusOrder, faultTypeLabel, personText } from './fault-text';
import { useFaults } from './queries';
import { FaultSheet } from './sheets/fault-sheet';

/** La hoja abierta; `n` la monta de nuevo en cada apertura. */
interface OpenFault {
  id: string;
  n: number;
  open: boolean;
}

/**
 * Pestaña «Incidentes» de la ficha (ADR 0019): todos los incidentes del equipo, la más reciente primero, en filas
 * compactas. Cada fila abre el detalle en una hoja sobre la ficha, sin salir de ella.
 */
export function AssetFaults({ assetId }: { assetId: string }) {
  const { workspaceId, me, canOperate } = useEquipment();
  const faults = useFaults(workspaceId, { statuses: faultStatusOrder, assetId }, 20);
  const now = useNow(30_000);
  const [sheet, setSheet] = useState<OpenFault | null>(null);
  const items = faults.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-label="Incidentes del equipo" className="rounded-card bg-surface shadow-raised">
      {faults.isPending ? (
        <div className="grid gap-3 p-5 md:p-6" role="status" aria-busy="true" aria-label="Cargando los incidentes">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : faults.isError ? (
        <QueryErrorState error={faults.error} onRetry={() => void faults.refetch()} />
      ) : items.length === 0 ? (
        <StatePanel icon={ClipboardCheck} title="Sin incidentes reportados" description="Los incidentes que se reporten de este equipo quedarán aquí, con su estado." />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((fault) => (
            <li key={fault.id}>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setSheet({ id: fault.id, n: (sheet?.n ?? 0) + 1, open: true })}
                className="group flex min-h-14 w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-sunken/60 focus-visible:-outline-offset-2 md:px-6"
              >
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="text-sm font-semibold text-ink">{faultTypeLabel[fault.faultType]}</span>
                    {fault.usable ? null : <Badge tone="danger">No se puede usar</Badge>}
                  </span>
                  <FaultSteps status={fault.status} />
                  <span className="text-[13px] text-ink-muted">
                    Reportado por {personText(fault.reportedBy)} · {faultAgo(fault.reportedAt, now)}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {faults.hasNextPage ? (
        <div className="border-t border-line p-4 text-center">
          <Button className="h-[44px] sm:h-10" loading={faults.isFetchingNextPage} onClick={() => void faults.fetchNextPage()}>
            Cargar más
          </Button>
        </div>
      ) : null}
      {sheet ? (
        <FaultSheet
          key={sheet.n}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          faultId={sheet.id}
          timeZone={me.workspace.timeZone}
          canHandle={canOperate && me.permissions.includes('equipment.fault.manage')}
          fichaBase={null}
        />
      ) : null}
    </section>
  );
}
