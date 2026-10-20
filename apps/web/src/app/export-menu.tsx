import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@platlab/ui';
import { ChevronDown, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

/**
 * «Exportar» de un informe (ADR 0022): imprimir o guardar como PDF la vista imprimible y, si el módulo lo ofrece, bajar
 * el Excel de lo filtrado. Es una consulta: no cambia nada. Mientras el Excel se prepara (`pending`), el botón lo dice y
 * no admite otro. El módulo aporta la vista imprimible (`renderPrint`, que recibe cómo cerrarla) y la descarga
 * (`onExcel`; `null` oculta «Excel (.xlsx)»). `compact` deja solo el icono en el móvil, para una cabecera estrecha.
 */
export function ExportMenu({
  disabled,
  pending,
  onExcel,
  compact = false,
  renderPrint,
}: {
  disabled: boolean;
  pending: boolean;
  onExcel: (() => void) | null;
  compact?: boolean;
  renderPrint: (onClose: () => void) => ReactNode;
}) {
  const [printing, setPrinting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const closePrint = () => {
    setPrinting(false);
    // Un cuadro después: la vista imprimible retiene el foco hasta desmontarse.
    requestAnimationFrame(() => trigger.current?.focus());
  };

  const label = pending ? 'Preparando…' : 'Exportar';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            // Compacto, en el móvil solo el icono (44 px): el rótulo queda para los lectores de pantalla.
            className={compact ? 'h-11 max-sm:w-11 max-sm:px-0 sm:h-10' : 'h-12 sm:h-10'}
            disabled={disabled}
            loading={pending}
          >
            <Download aria-hidden />
            {compact ? <span className="sr-only sm:not-sr-only">{label}</span> : label}
            {pending ? null : <ChevronDown className={compact ? '-mr-1 text-ink-muted max-sm:hidden' : '-mr-1 text-ink-muted'} aria-hidden />}
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
          {onExcel ? (
            <DropdownMenuItem className="h-11 sm:h-10" onSelect={onExcel}>
              <FileSpreadsheet aria-hidden />
              Excel (.xlsx)
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {printing ? renderPrint(closePrint) : null}
    </>
  );
}
