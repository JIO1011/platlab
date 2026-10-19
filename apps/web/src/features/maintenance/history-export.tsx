import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, toast } from '@platlab/ui';
import { ChevronDown, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
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
  const [printing, setPrinting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const closePrint = () => {
    setPrinting(false);
    trigger.current?.focus();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={trigger} className="h-12 sm:h-10" disabled={records.isPending} loading={exportRecords.isPending}>
            <Download aria-hidden />
            {exportRecords.isPending ? 'Preparando…' : 'Exportar'}
            {exportRecords.isPending ? null : <ChevronDown className="-mr-1 text-ink-muted" aria-hidden />}
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
          {canExport ? (
            <DropdownMenuItem
              className="h-11 sm:h-10"
              onSelect={() => exportRecords.mutate(filters, { onError: (error) => toast.error(maintenanceErrorMessage(error)) })}
            >
              <FileSpreadsheet aria-hidden />
              Excel (.xlsx)
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {printing ? <HistoryPrint records={records} filters={filters} names={names} namesPending={namesPending} onClose={closePrint} /> : null}
    </>
  );
}
