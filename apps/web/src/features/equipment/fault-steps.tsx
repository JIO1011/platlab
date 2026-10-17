import type { FaultStatus } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { faultStatusLabel, faultStatusOrder, faultStatusTone } from './fault-text';

/** Los colores de cada tono: el punto lleno, su halo en el paso actual y el texto del paso actual. */
const toneStyles = {
  danger: { fill: 'bg-danger', halo: 'ring-danger-soft', text: 'text-danger' },
  warning: { fill: 'bg-warning', halo: 'ring-warning-soft', text: 'text-warning' },
  success: { fill: 'bg-success', halo: 'ring-success-soft', text: 'text-success' },
} as const;

/**
 * Dónde va un incidente, en tres pasos (ADR 0019): Reportado, En reparación y Solucionado. Los pasos
 * alcanzados llevan el color del estado actual (rojo, ámbar o verde) y el actual, además, un halo y el
 * texto en ese color; los que faltan, un punto vacío. Siempre con texto, nunca solo con color (ADR 0010).
 */
export function FaultSteps({ status, className }: { status: FaultStatus; className?: string }) {
  const current = faultStatusOrder.indexOf(status);
  const tone = toneStyles[faultStatusTone[status]];
  return (
    <ol aria-label="Avance del incidente" className={cn('flex flex-wrap items-center gap-y-1 text-[12px] font-medium', className)}>
      {faultStatusOrder.map((step, index) => {
        const reached = index <= current;
        const isCurrent = index === current;
        return (
          <li key={step} aria-current={isCurrent ? 'step' : undefined} className="flex items-center">
            {index > 0 ? <span aria-hidden className={cn('mx-1.5 h-0.5 w-3 rounded-full', reached ? tone.fill : 'bg-line')} /> : null}
            <span
              aria-hidden
              className={cn('mr-1.5 size-2.5 shrink-0 rounded-full', reached ? tone.fill : 'border border-line-strong bg-surface', isCurrent && cn('ring-4', tone.halo))}
            />
            <span className={isCurrent ? cn('font-semibold', tone.text) : 'text-ink-muted'}>{faultStatusLabel[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
