import { toast } from '@platlab/ui';
import { ExportMenu } from '../../app/export-menu';
import { commandErrorMessage, useExportOperations } from './commands';
import type { ReagentsContext } from './context';
import { MovementPrint } from './movement-print';
import { canReadReports } from './queries';

/**
 * «Exportar» de Movimientos (ADR 0021): imprimir o guardar como PDF la vista imprimible, para quien ve Movimientos, o
 * bajar el Excel de lo filtrado, solo con reportes (ADR 0014). Es una consulta: no cambia nada, así que también está en
 * modo consulta. Mientras el Excel se prepara, el botón lo dice y no admite otro; si falla, un aviso con el motivo. Vive
 * en la cabecera, fuera de la sección: recibe el contexto de Reactivos en lugar de leerlo del `Outlet`.
 */
export function MovementExport({ reagents }: { reagents: ReagentsContext }) {
  const { workspaceId, me, operations, operationTotals, operationQuery, movementFilters } = reagents;
  const canReport = canReadReports(me);
  const view = canReport ? movementFilters.view : 'detail';
  const exportOperations = useExportOperations(workspaceId);

  return (
    <ExportMenu
      compact
      disabled={view === 'detail' ? operations.isPending : operationTotals.isPending}
      pending={exportOperations.isPending}
      onExcel={
        canReport
          ? () => exportOperations.mutate(operationQuery, { onError: (error) => toast.error(commandErrorMessage(error)) })
          : null
      }
      renderPrint={(onClose) => <MovementPrint reagents={reagents} view={view} onClose={onClose} />}
    />
  );
}
