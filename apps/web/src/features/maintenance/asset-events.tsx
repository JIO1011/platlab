import type { MaintenanceRecord, WorkKind } from '@platlab/contracts';
import { formatDecimal } from '@platlab/ui';
import { ClipboardCheck, Gauge, Hammer, SprayCan, Wrench, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { formatDate } from '../../app/format';
import { PRINT_LIMIT, usePrintRows } from '../../app/print-rows';
import { TimelineDetail, type TimelineEntry, type TimelineSource } from '../../app/timeline';
import { emptyHistoryFilters } from './history-filters';
import { useRecords } from './queries';
import { noPlanText, resultLabels, titleWithKind } from './work-text';

const kindIcons: Record<WorkKind, LucideIcon> = {
  preventive: Wrench,
  calibration: Gauge,
  verification: ClipboardCheck,
  cleaning: SprayCan,
  corrective: Hammer,
};

/**
 * Un trabajo en la línea de tiempo del equipo (M-01d): en su fecha de trabajo, sin hora, con su resultado, quién
 * lo hizo y lo que vale para el auditor. Un anulado sigue a la vista, marcado y con su motivo.
 */
export function recordEntry(record: MaintenanceRecord): TimelineEntry {
  return {
    key: `maintenance-${record.id}`,
    day: record.performedOn,
    at: null,
    icon: kindIcons[record.kind],
    title: record.plan ? titleWithKind(record.plan.title, record.kind) : noPlanText(record.kind),
    details: (
      <>
        <TimelineDetail label="Resultado:">{resultLabels[record.result]}</TimelineDetail>
        <TimelineDetail label="Quién lo hizo:">{record.provider?.name ?? 'Interno'}</TimelineDetail>
        <TimelineDetail label="Registró:">{record.recordedBy?.name ?? 'Miembro anterior'}</TimelineDetail>
        {record.validUntil ? <TimelineDetail label="Válida hasta:">{formatDate(record.validUntil)}</TimelineDetail> : null}
        {record.cost ? <TimelineDetail label="Costo:">{`$\u00a0${formatDecimal(record.cost)}`}</TimelineDetail> : null}
        {record.observations ? <TimelineDetail label="Observaciones:">{record.observations}</TimelineDetail> : null}
        {record.voided ? <TimelineDetail label="Anulado:">{record.voided.reason}</TimelineDetail> : null}
      </>
    ),
    actor: null,
    voided: record.voided !== null,
  };
}

/**
 * Los trabajos del equipo para la línea de tiempo de Equipos (punto `equipment.asset-events`, M-01d): no pinta
 * nada; entrega sus hechos, hasta el límite de impresión, cada vez que cambian.
 */
export function AssetMaintenanceEvents({ assetId, onChange }: { assetId: string; onChange: (source: TimelineSource) => void }) {
  const { workspaceId = '' } = useParams();
  const records = useRecords(workspaceId, { ...emptyHistoryFilters, assetId });
  const { hasMore, loadingMore } = usePrintRows(records);
  // De los datos de la consulta, no de las filas recortadas: un arreglo nuevo en cada render volvería a avisar.
  const entries = useMemo(
    () => (records.data?.pages.flatMap((page) => page.items) ?? []).slice(0, PRINT_LIMIT).map(recordEntry),
    [records.data],
  );
  const { isError, isPending, isPlaceholderData, error, refetch } = records;
  const status = isError ? 'error' : isPending || isPlaceholderData || loadingMore ? 'pending' : 'success';

  useEffect(() => {
    onChange(
      status === 'error'
        ? { status, error, retry: () => void refetch() }
        : status === 'pending'
          ? { status }
          : { status, entries, hasMore },
    );
  }, [status, entries, hasMore, error, refetch, onChange]);

  return null;
}
