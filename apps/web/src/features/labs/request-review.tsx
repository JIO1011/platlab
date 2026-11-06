import type { RequestLine } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { Check, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { reviewItems } from './request-detail';
import type { RequestView } from './request-draft';
import { softCard } from './style';

const marks: Record<RequestLine['check'], { Icon: LucideIcon; circle: string; text: string }> = {
  ok: { Icon: Check, circle: 'bg-success-soft text-success', text: 'text-success' },
  short: { Icon: TriangleAlert, circle: 'bg-warning-soft text-warning', text: 'text-warning' },
  unverified: { Icon: X, circle: 'bg-surface-sunken text-ink-muted', text: 'text-ink-muted' },
};

/**
 * La tarjeta de revisión de una solicitud recibida (como «El técnico revisa únicamente las excepciones» de la Propuesta):
 * una lista compacta de comprobaciones ✔ ⚠ ✖, cada una con su ícono y su texto. No calcula nada nuevo: dice lo que el
 * servidor ya comprobó.
 */
export function ReviewCard({ request }: { request: RequestView }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn(softCard, 'grid gap-4 p-5 sm:p-6 print:hidden')}>
      <div>
        <h2 id={id} className="text-lg font-bold tracking-tight text-ink">
          Revisión
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">Lo que el sistema comprobó. Revisa solo lo que trae aviso.</p>
      </div>
      <ul className="grid divide-y divide-line">
        {reviewItems(request).map((item) => {
          const { Icon, circle, text } = marks[item.verdict];
          return (
            <li key={item.key} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', circle)}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-sm font-semibold text-ink">{item.label}</span>
                {item.detail ? <span className="text-[13px] text-ink-muted tabular-nums">{item.detail}</span> : null}
              </span>
              <span className={cn('shrink-0 text-right text-sm font-medium', text)}>{item.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
