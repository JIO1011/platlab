import { toast } from '@platlab/ui';
import { ExportMenu } from '../../app/export-menu';
import { maintenanceErrorMessage, useExportRecords } from './commands';
import { useMaintenance } from './context';
import type { HistoryFilters } from './history-filters';
import { HistoryPrint } from './history-print';
import type { HistoryNames } from './history-text';
import type { useRecords } from './queries';

/**
 * «Exportar» del Historial (M-01d): imprimir o guardar como PDF la vista imprimible, para quien ve el Historial, o
 * bajar el Excel de lo filtrado, solo el Administrador. Es una consulta: no cambia nada, así que también está en
 * modo consulta. Mientras el Excel se prepara, el botón lo dice y no admite otro; si falla, un aviso con el motivo.
 */
export function HistoryExport({
  records,
  filters,
  names,
  namesPending,
}: {
  records: ReturnType<typeof useRecords>;
  filters: HistoryFilters;
  names: HistoryNames;
  namesPending: boolean;
}) {
  const { workspaceId, canExport } = useMaintenance();
  const exportRecords = useExportRecords(workspaceId);

  return (
    <ExportMenu
      disabled={records.isPending}
      pending={exportRecords.isPending}
      onExcel={
        canExport ? () => exportRecords.mutate(filters, { onError: (error) => toast.error(maintenanceErrorMessage(error)) }) : null
      }
      renderPrint={(onClose) => (
        <HistoryPrint records={records} filters={filters} names={names} namesPending={namesPending} onClose={onClose} />
      )}
    />
  );
}
