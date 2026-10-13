// Prototipo R-01D: solo interfaz
import { cn } from '@platlab/ui';
import { Check } from 'lucide-react';
import type { Step } from './wizard-model';

const phases = [
  { label: 'Reactivo', steps: ['product', 'new'] },
  { label: 'Frascos', steps: ['bottles'] },
  { label: 'Detalles', steps: ['details'] },
] as const;

/**
 * Progreso «Reactivo · Frascos · Detalles»: el paso 1b cuenta como parte de «Reactivo». Lo ya
 * recorrido se puede volver a abrir; lo que falta no es pulsable.
 */
export function WizardProgress({ step, onGo }: { step: Step; onGo: (phase: number) => void }) {
  const current = phases.findIndex((phase) => (phase.steps as readonly Step[]).includes(step));
  return (
    <nav aria-label="Progreso" className="mb-5">
      <ol className="flex items-center gap-2 text-sm">
        {phases.map((phase, index) => {
          const done = index < current;
          const here = index === current;
          const content = (
            <>
              <span
                aria-hidden
                className={cn(
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums transition-colors duration-150',
                  here ? 'bg-action text-on-action' : done ? 'bg-action-soft text-action' : 'bg-surface-sunken text-ink-muted',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span className={cn('font-medium', here ? 'text-ink' : 'text-ink-muted')}>{phase.label}</span>
              {done ? <span className="sr-only">(hecho)</span> : null}
            </>
          );
          return (
            <li key={phase.label} className="flex items-center gap-2" aria-current={here ? 'step' : undefined}>
              {done ? (
                <button
                  type="button"
                  onClick={() => onGo(index)}
                  className="-mx-1 inline-flex min-h-[44px] items-center gap-2 rounded-full px-1 transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-8"
                >
                  {content}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2">{content}</span>
              )}
              {index < phases.length - 1 ? <span aria-hidden className="h-px w-6 bg-line-strong sm:w-10" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
