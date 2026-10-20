import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, toast } from '@platlab/ui';
import { ChevronDown, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
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
  const [printing, setPrinting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const closePrint = () => {
    setPrinting(false);
    // Un cuadro después: la vista imprimible retiene el foco hasta desmontarse.
    requestAnimationFrame(() => trigger.current?.focus());
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={trigger} className="h-12 sm:h-10" disabled={assets.isPending} loading={exportAssets.isPending}>
            <Download aria-hidden />
            {exportAssets.isPending ? 'Preparando…' : 'Exportar'}
            {exportAssets.isPending ? null : <ChevronDown className="-mr-1 text-ink-muted" aria-hidden />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-60"
          // Con la vista imprimible abierta, el foco es suyo: no vuelve al botón de debajo.
          onCloseAutoFocus={(event) => {
            if (printing) event.preventDefault();
          }}
        >
          <DropdownMenuItem className="h-11 sm:h-10" onSelect={() => setPrinting(true)}>
            <Printer aria-hidden />
            Imprimir o guardar PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-11 sm:h-10"
            onSelect={() => exportAssets.mutate(query, { onError: (error) => toast.error(equipmentErrorMessage(error)) })}
          >
            <FileSpreadsheet aria-hidden />
            Excel (.xlsx)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {printing ? <ReportPrint assets={assets} filters={filters} onClose={closePrint} /> : null}
    </>
  );
}
