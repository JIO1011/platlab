import { Button, cn } from '@platlab/ui';
import { Check, TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import type { approvalSummary } from './request-approval';
import { softCard } from './style';

/** La casilla con que se elige una fila de Recibidas: de 44 px para el dedo y con el código de la solicitud como nombre. */
export function RowCheckbox({ code, checked, onChange }: { code: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex size-11 cursor-pointer items-center justify-center">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={`Elegir ${code}`} className="size-5 cursor-pointer accent-action" />
    </label>
  );
}

/**
 * El resultado de «Aprobar seleccionadas»: una línea por solicitud, con los códigos programados o el motivo del servidor.
 * El estado va siempre con texto («Programada» o «No se programó»); se queda hasta que se cierra.
 */
export function ApprovalSummaryCard({ summary, onDismiss }: { summary: ReturnType<typeof approvalSummary>; onDismiss: () => void }) {
  const id = useId();
  const { lines, programmed, failed } = summary;
  return (
    <section aria-labelledby={id} role="status" className={cn(softCard, 'grid gap-4 p-5 sm:p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id={id} className="text-lg font-bold tracking-tight text-ink">
            Resultado de la aprobación
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {programmed === 1 ? '1 solicitud programada' : `${programmed} solicitudes programadas`}
            {failed > 0 ? ` · ${failed === 1 ? '1 sin programar' : `${failed} sin programar`}` : ''}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={onDismiss}>
          Cerrar
        </Button>
      </div>
      <ul className="grid divide-y divide-line">
        {lines.map((line) => (
          <li key={line.requestId} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', line.ok ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
              {line.ok ? <Check className="size-3.5" aria-hidden /> : <TriangleAlert className="size-3.5" aria-hidden />}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="break-words text-sm font-semibold text-ink">{line.name}</span>
              <span className={cn('break-words text-sm', line.ok ? 'text-success' : 'text-warning')}>
                <span className="font-medium">{line.ok ? 'Programada' : 'No se programó'}</span>
                <span className="text-ink-muted"> · </span>
                <span className="text-ink">{line.text}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
