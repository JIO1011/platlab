import { toast } from '@platlab/ui';
import { ExportMenu } from '../../app/export-menu';
import type { ActiveFilter } from './active-filters';
import type { AssetQuery } from './asset-filters';
import { equipmentErrorMessage, useExportAssets } from './commands';
import { useEquipment } from './context';
import { ReportPrint } from './report-print';
import type { useAssets } from './queries';

/**
 * «Exportar» del Informe (ADR 0019, E-01c): imprimir o guardar como PDF la vista imprimible, o bajar el
 * Excel de lo filtrado. Es una consulta: no cambia nada. Mientras el Excel se prepara, el botón lo dice y
 * no admite otro; si falla, un aviso con el motivo.
 */
export function ReportExport({
  query,
  assets,
  filters,
}: {
  query: AssetQuery;
  assets: ReturnType<typeof useAssets>;
  filters: ActiveFilter[];
}) {
  const { workspaceId } = useEquipment();
  const exportAssets = useExportAssets(workspaceId);

  return (
    <ExportMenu
      disabled={assets.isPending}
      pending={exportAssets.isPending}
      onExcel={() => exportAssets.mutate(query, { onError: (error) => toast.error(equipmentErrorMessage(error)) })}
      renderPrint={(onClose) => <ReportPrint assets={assets} filters={filters} onClose={onClose} />}
    />
  );
}
