import { Button, Sheet, cn } from '@platlab/ui';
import { CircleCheck, ClipboardCheck, Send, TriangleAlert } from 'lucide-react';
import type { ReviewRow } from './send-review';
import { primaryGradient } from './style';

/**
 * «Antes de enviar» (ADR 0023, «Flujo de la Propuesta»): lo que la solicitud pide frente a lo que hay, con lo que no
 * alcanza o choca primero y sus alternativas al lado (debajo, en el móvil). Solo informa: se vuelve a editar o se envía
 * igual y el laboratorio lo verá. Cerrar o Esc es volver a editar.
 */
export function SendReviewSheet({
  rows,
  open,
  sending,
  onBack,
  onSend,
}: {
  rows: ReviewRow[];
  open: boolean;
  sending: boolean;
  onBack: () => void;
  onSend: () => void;
}) {
  // El orden es estable: dentro de cada grupo se conserva el de la revisión.
  const ordered = [...rows].sort((a, b) => Number(a.ok) - Number(b.ok));
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && !sending && onBack()}
      title="Antes de enviar"
      description="Esto no alcanza o choca. Puedes volver a editar o enviar igual; el laboratorio lo verá."
      icon={ClipboardCheck}
      wide
      footer={
        <>
          <Button variant="secondary" className="h-12 flex-1 rounded-2xl" disabled={sending} onClick={onBack}>
            Volver a editar
          </Button>
          <Button variant="primary" className={cn(primaryGradient, 'h-12 flex-1 rounded-2xl font-bold')} loading={sending} onClick={onSend}>
            <Send aria-hidden />
            Enviar igual
          </Button>
        </>
      }
    >
      <div aria-hidden className="hidden grid-cols-2 gap-6 pb-2 text-[13px] font-semibold text-ink-muted sm:grid">
        <span>Lo solicitado</span>
        <span>Alternativas</span>
      </div>
      <ul className="divide-y divide-line sm:border-t sm:border-line">
        {ordered.map((row) => {
          const Icon = row.ok ? CircleCheck : TriangleAlert;
          return (
            <li key={row.key} className="grid gap-1.5 py-3 sm:grid-cols-2 sm:gap-6">
              <p className="flex min-w-0 items-start gap-2.5 text-sm font-medium text-ink">
                <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', row.ok ? 'text-success' : 'text-warning')} />
                <span className="[overflow-wrap:anywhere]">
                  <span className="sr-only">{row.ok ? 'Alcanza: ' : 'No alcanza: '}</span>
                  {row.label}
                </span>
              </p>
              {row.alternatives.length > 0 ? (
                <ul aria-label={`Alternativas de ${row.label}`} className="grid gap-0.5 pl-6.5 text-sm text-ink-muted sm:pl-0 [overflow-wrap:anywhere]">
                  {row.alternatives.map((alternative) => (
                    <li key={alternative}>{alternative}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
