import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, toast } from '@platlab/ui';
import { ChevronDown, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
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
          <Button
            ref={trigger}
            // En el móvil, solo el icono (44 px): el rótulo queda para los lectores de pantalla.
            className="h-11 max-sm:w-11 max-sm:px-0 sm:h-10"
            disabled={view === 'detail' ? operations.isPending : operationTotals.isPending}
            loading={exportOperations.isPending}
          >
            <Download aria-hidden />
            <span className="sr-only sm:not-sr-only">{exportOperations.isPending ? 'Preparando…' : 'Exportar'}</span>
            {exportOperations.isPending ? null : <ChevronDown className="-mr-1 text-ink-muted max-sm:hidden" aria-hidden />}
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
          {canReport ? (
            <DropdownMenuItem
              className="h-11 sm:h-10"
              onSelect={() => exportOperations.mutate(operationQuery, { onError: (error) => toast.error(commandErrorMessage(error)) })}
            >
              <FileSpreadsheet aria-hidden />
              Excel (.xlsx)
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {printing ? <MovementPrint reagents={reagents} view={view} onClose={closePrint} /> : null}
    </>
  );
}
