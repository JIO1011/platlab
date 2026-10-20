import { Badge, Button, Skeleton, StatePanel, cn } from '@platlab/ui';
import { CircleCheck, ClipboardCheck, TriangleAlert, Wrench, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { formatDateTime, formatShortDateTime } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { useEquipment } from './context';
import { faultStatusOrder, faultSteps, faultTypeLabel, type FaultStep } from './fault-text';
import { useFaults } from './queries';
import { FaultSheet } from './sheets/fault-sheet';

/** La hoja abierta; `n` la monta de nuevo en cada apertura. */
interface OpenFault {
  id: string;
  n: number;
  open: boolean;
}

const stepIcons: Record<FaultStep['key'], LucideIcon> = { reported: TriangleAlert, repairing: Wrench, resolved: CircleCheck };

/** El nodo del paso en que está el incidente lleva el color de su estado (con su texto al lado); los ya pasados, en gris. */
const currentNode: Record<FaultStep['key'], string> = {
  reported: 'bg-danger-soft text-danger',
  repairing: 'bg-warning-soft text-warning',
  resolved: 'bg-success-soft text-success',
};

/**
 * Pestaña «Incidentes» de la ficha (ADR 0019, 0021): cada incidente de este equipo, el más reciente primero, en su
 * tarjeta con un título (el tipo y lo que se describió) y su línea de tiempo vertical —reportado, en reparación y
 * solucionado, con quién y cuándo—. «Ver incidente» abre el detalle en una hoja sobre la ficha, sin salir de ella.
 */
export function AssetFaults({ assetId }: { assetId: string }) {
  const { workspaceId, me, canOperate } = useEquipment();
  const timeZone = me.workspace.timeZone;
  const faults = useFaults(workspaceId, { statuses: faultStatusOrder, assetId }, 20);
  const [sheet, setSheet] = useState<OpenFault | null>(null);
  const items = faults.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-label="Incidentes del equipo">
      {faults.isPending ? (
        <div className="grid gap-3 rounded-card bg-surface p-5 shadow-raised md:p-6" role="status" aria-busy="true" aria-label="Cargando los incidentes">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : faults.isError ? (
        <div className="rounded-card bg-surface shadow-raised">
          <QueryErrorState error={faults.error} onRetry={() => void faults.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-card bg-surface shadow-raised">
          <StatePanel icon={ClipboardCheck} title="Sin incidentes reportados" description="Los incidentes que se reporten de este equipo quedarán aquí, con su estado." />
        </div>
      ) : (
        <ul className="grid gap-4">
          {items.map((fault) => {
            const steps = faultSteps(fault);
            return (
              <li key={fault.id} className="rounded-card bg-surface p-5 shadow-raised md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                  <div className="grid min-w-0 flex-1 gap-1.5">
                    <h3 className="line-clamp-2 break-words font-semibold leading-snug text-ink" title={fault.description}>
                      {faultTypeLabel[fault.faultType]}
                      <span className="font-normal text-ink-muted"> · {fault.description}</span>
                    </h3>
                    {fault.usable ? null : (
                      <span>
                        <Badge tone="danger">No se puede usar</Badge>
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="h-[44px] sm:h-8"
                    aria-haspopup="dialog"
                    aria-label={`Ver incidente: ${faultTypeLabel[fault.faultType]}, ${steps[0] ? formatDateTime(steps[0].at, timeZone) : ''}`}
                    onClick={() => setSheet({ id: fault.id, n: (sheet?.n ?? 0) + 1, open: true })}
                  >
                    Ver incidente
                  </Button>
                </div>
                {/* Línea de tiempo: el hilo pasa por detrás de los nodos; el último paso es el estado actual. */}
                <ol aria-label="Pasos del incidente" className="relative mt-5 space-y-4 before:absolute before:bottom-3 before:left-3 before:top-3 before:w-0.5 before:-translate-x-1/2 before:bg-line">
                  {steps.map((step, index) => {
                    const Icon = stepIcons[step.key];
                    const current = index === steps.length - 1;
                    return (
                      <li key={step.key} aria-current={current ? 'step' : undefined} className="flex items-start gap-3.5">
                        <span
                          className={cn(
                            'relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-4 ring-surface',
                            current ? currentNode[step.key] : 'bg-surface-sunken text-ink-muted',
                          )}
                        >
                          <Icon className="size-3.5" aria-hidden />
                        </span>
                        <div className="grid min-w-0 flex-1 gap-0.5">
                          <p className="text-sm font-semibold text-ink">{step.label}</p>
                          <p className="text-[13px] text-ink-muted">
                            {step.by ?? 'Miembro anterior'} ·{' '}
                            <time dateTime={step.at} title={formatDateTime(step.at, timeZone)}>
                              {formatShortDateTime(step.at, timeZone, true)}
                            </time>
                          </p>
                          {step.note ? <p className="break-words text-[13px] text-ink">{step.note}</p> : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </li>
            );
          })}
        </ul>
      )}
      {faults.hasNextPage ? (
        <div className="mt-4 text-center">
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
          timeZone={timeZone}
          canHandle={canOperate && me.permissions.includes('equipment.fault.manage')}
          fichaBase={null}
        />
      ) : null}
    </section>
  );
}
