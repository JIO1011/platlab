import type { AssetConservation, AssetEvent, Fault, WorkspaceMeResponse } from '@platlab/contracts';
import { Badge, Skeleton, StatePanel } from '@platlab/ui';
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  CircleCheck,
  CirclePlus,
  History,
  ShieldCheck,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useExtensions } from '../../app/extensions';
import { dayInZone, formatDate, formatDateTime, formatShortDateTime } from '../../app/format';
import { PRINT_LIMIT, usePrintRows } from '../../app/print-rows';
import { QueryErrorState } from '../../app/states';
import { combineSources, newestFirst, TimelineDetail as Detail, type TimelineEntry, type TimelineSource } from '../../app/timeline';
import { conditionLabel, conservationLabel } from './asset-text';
import { useEquipment } from './context';
import { ASSET_EVENTS } from './extension-points';
import { faultStatusOrder, faultSteps, faultTypeLabel, type FaultStep } from './fault-text';
import { useAssetHistory, useFaults } from './queries';

/** «Antes → después», con el icono dibujado y la palabra «a» para quien lee con lector de pantalla. */
function FromTo({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span>{from}</span>
      <ArrowRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
      <span className="sr-only">a</span>
      <span>{to}</span>
    </span>
  );
}


/** El estado físico de un hecho del historial; sin dato, «Sin dato». */
const conservationText = (value: AssetConservation | null) => (value ? conservationLabel[value] : 'Sin dato');

/** Lo que dice cada hecho del historial: el título, su icono y las líneas que lo explican. La hoja de vida lo imprime con el mismo texto. */
function describeEvent(event: AssetEvent): { icon: LucideIcon; title: ReactNode; details: ReactNode } {
  if (event.kind === 'created') {
    return { icon: CirclePlus, title: 'Alta del equipo', details: null };
  }
  if (event.kind === 'condition') {
    return {
      icon: Activity,
      title: <FromTo from={conditionLabel[event.from]} to={conditionLabel[event.to]} />,
      details: (
        <>
          <Detail label="Motivo:">{event.reason}</Detail>
          {event.result ? <Detail label="Resultado:">{event.result}</Detail> : null}
        </>
      ),
    };
  }
  if (event.kind === 'conservation') {
    return {
      icon: ShieldCheck,
      title: (
        <>
          Estado físico: <FromTo from={conservationText(event.from)} to={conservationText(event.to)} />
        </>
      ),
      details: null,
    };
  }
  return {
    icon: ArrowLeftRight,
    title: <FromTo from={event.from} to={event.to} />,
    details: event.note ? <Detail label="Nota:">{event.note}</Detail> : null,
  };
}

/** Los hechos de Equipos en la línea de tiempo: el alta, los cambios de estado y de estado físico, y los traslados. */
export function eventEntries(events: readonly AssetEvent[], timeZone: string): TimelineEntry[] {
  return events.map((event, index) => {
    const { icon, title, details } = describeEvent(event);
    return { key: `equipment-${event.kind}-${event.occurredAt}-${index}`, day: dayInZone(event.occurredAt, timeZone), at: event.occurredAt, icon, title, details, actor: event.actor };
  });
}

const stepIcons: Record<FaultStep['key'], LucideIcon> = { reported: TriangleAlert, repairing: Wrench, resolved: CircleCheck };

/** Cada incidente en la línea de tiempo (M-01d): un hecho por paso ya ocurrido, con su tipo y lo que se escribió. */
export function faultEntries(faults: readonly Fault[], timeZone: string): TimelineEntry[] {
  return faults.flatMap((fault) =>
    faultSteps(fault).map((step) => ({
      key: `fault-${fault.id}-${step.key}`,
      day: dayInZone(step.at, timeZone),
      at: step.at,
      icon: stepIcons[step.key],
      title: `Incidente ${step.label.toLowerCase()}: ${faultTypeLabel[fault.faultType]}`,
      details:
        step.key === 'reported' ? (
          <>
            <Detail label="Descripción:">{fault.description}</Detail>
            <Detail label="¿Se podía usar?">{fault.usable ? 'Sí' : 'No'}</Detail>
          </>
        ) : step.note ? (
          <Detail label="Qué se hizo:">{step.note}</Detail>
        ) : null,
      actor: step.by,
    })),
  );
}

/**
 * Los hechos que aportan otros módulos (M-01d): monta sus fuentes, que no pintan nada, y reúne lo que entregan.
 * Sin fuentes, no hay nada que esperar.
 */
function useExtensionEvents(assetId: string, me: WorkspaceMeResponse): { sources: ReactNode; source: TimelineSource } {
  const extensions = useExtensions(ASSET_EVENTS, me);
  const [states, setStates] = useState<Record<string, TimelineSource>>({});
  const report = useCallback((code: string, source: TimelineSource) => setStates((current) => ({ ...current, [code]: source })), []);
  const codes = extensions.map((extension) => extension.code).join(',');
  // Un `onChange` estable por módulo: la fuente lo llama en un efecto y no debe volver a dispararse.
  const handlers = useMemo(
    () => Object.fromEntries(codes.split(',').map((code) => [code, (source: TimelineSource) => report(code, source)])),
    [codes, report],
  );
  const sources = extensions.map(({ code, Component }) => (
    <Suspense key={code} fallback={null}>
      <Component assetId={assetId} onChange={handlers[code]!} />
    </Suspense>
  ));
  return { sources, source: combineSources(extensions.map((extension) => states[extension.code] ?? { status: 'pending' })) };
}

/**
 * La línea de tiempo del equipo (M-01d), para la ficha y la hoja de vida: sus hechos, sus incidentes para quien
 * los ve (la hoja de vida los imprime aparte: `faults: false`) y los de otros módulos, del más reciente al más
 * antiguo. `sources` se monta junto a lo que la pinta. Los incidentes y los aportes llegan hasta el límite de
 * impresión (`hasMore` si hay más); la hoja de vida pide también así los hechos de Equipos (`historyLimit`).
 */
export function useAssetTimeline(
  assetId: string,
  { seesFaults, faults = true, historyLimit }: { seesFaults: boolean; faults?: boolean; historyLimit?: number },
) {
  const { workspaceId, me } = useEquipment();
  const timeZone = me.workspace.timeZone;
  const history = useAssetHistory(workspaceId, assetId, true, historyLimit);
  const withFaults = seesFaults && faults;
  const faultQuery = useFaults(workspaceId, { statuses: faultStatusOrder, assetId }, 100, withFaults);
  const faultRows = usePrintRows(faultQuery, withFaults);
  const extension = useExtensionEvents(assetId, me);

  const own: TimelineSource = history.isPending
    ? { status: 'pending' }
    : history.isError
      ? { status: 'error', error: history.error, retry: () => void history.refetch() }
      : { status: 'success', entries: eventEntries(history.data.items, timeZone), hasMore: false };
  const incidents: TimelineSource = !withFaults
    ? { status: 'success', entries: [], hasMore: false }
    : faultQuery.isError
      ? { status: 'error', error: faultQuery.error, retry: () => void faultQuery.refetch() }
      : faultQuery.isPending || faultRows.loadingMore
        ? { status: 'pending' }
        : { status: 'success', entries: faultEntries(faultRows.rows, timeZone), hasMore: faultRows.hasMore };
  const all = combineSources([own, incidents, extension.source]);
  return { sources: extension.sources, timeline: all.status === 'success' ? { ...all, entries: newestFirst(all.entries) } : all };
}

/** Cuándo: con hora si se sabe; si no, solo el día. */
function When({ entry, timeZone }: { entry: TimelineEntry; timeZone: string }) {
  return entry.at ? (
    <time dateTime={entry.at} title={formatDateTime(entry.at, timeZone)}>
      {formatShortDateTime(entry.at, timeZone, true)}
    </time>
  ) : (
    <time dateTime={entry.day}>{formatDate(entry.day)}</time>
  );
}

/**
 * Pestaña «Historial»: una línea de tiempo con el alta, cada cambio de estado (con su motivo y su resultado),
 * cada cambio de estado físico, cada traslado (con su nota), los incidentes y lo que aportan otros módulos
 * (M-01d: los mantenimientos), del más reciente al más antiguo; quién y cuándo, en la zona del espacio.
 */
export function AssetHistory({ assetId, seesFaults, timeZone }: { assetId: string; seesFaults: boolean; timeZone: string }) {
  const { sources, timeline } = useAssetTimeline(assetId, { seesFaults });
  return (
    <section aria-label="Historial del equipo" className="rounded-card bg-surface p-6 shadow-raised md:p-8">
      {sources}
      {timeline.status === 'pending' ? (
        <div role="status" aria-busy="true" aria-label="Cargando el historial">
          <Skeleton className="h-24" />
        </div>
      ) : timeline.status === 'error' ? (
        <QueryErrorState error={timeline.error} onRetry={timeline.retry} />
      ) : timeline.entries.length === 0 ? (
        <StatePanel icon={History} title="Sin historial" description="El alta, los cambios de estado, los traslados y los trabajos quedarán aquí." />
      ) : (
        <>
          {/* Línea de tiempo, como en el Resumen: el hilo pasa por detrás de los círculos de icono. */}
          <ol className="relative space-y-6 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-0.5 before:bg-line">
            {timeline.entries.map((entry) => {
              const Icon = entry.icon;
              return (
                <li key={entry.key} className="flex items-start gap-3.5">
                  <span className="relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-action-soft text-action ring-4 ring-surface">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-1 pt-1.5">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                      {entry.title}
                      {entry.voided ? <Badge tone="neutral">Anulado</Badge> : null}
                    </p>
                    {entry.details}
                    <p className="text-[13px] text-ink-muted">
                      {entry.actor ? `${entry.actor} · ` : ''}
                      <When entry={entry} timeZone={timeZone} />
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {timeline.hasMore ? (
            <p className="mt-6 text-[13px] text-ink-muted">Se muestran los {PRINT_LIMIT.toLocaleString('es-EC')} incidentes y trabajos más recientes.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
