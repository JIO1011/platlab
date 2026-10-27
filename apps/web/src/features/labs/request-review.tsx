import type { RequestLine } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { Check, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { lineChecks } from './request-line-check';
import type { RequestView } from './request-draft';
import { softCard } from './style';

type Verdict = RequestLine['check'];

/** Una comprobación de la fila: su categoría, cómo salió (con texto) y, si aplica, de cuántas líneas o fechas habla. */
interface ReviewItem {
  key: string;
  label: string;
  verdict: Verdict;
  text: string;
  detail: string | null;
}

const marks: Record<Verdict, { Icon: LucideIcon; circle: string; text: string }> = {
  ok: { Icon: Check, circle: 'bg-success-soft text-success', text: 'text-success' },
  short: { Icon: TriangleAlert, circle: 'bg-warning-soft text-warning', text: 'text-warning' },
  unverified: { Icon: X, circle: 'bg-surface-sunken text-ink-muted', text: 'text-ink-muted' },
};

const categories = [
  { kind: 'reagent', label: 'Reactivos' },
  { kind: 'equipment', label: 'Equipos' },
  { kind: 'material', label: 'Materiales' },
] as const;

/** Lo peor que dijo el servidor de las líneas de la categoría: ⚠ pesa más que ✖ y este más que ✔. */
const worst = (checks: readonly Verdict[]): Verdict => (checks.includes('short') ? 'short' : checks.includes('unverified') ? 'unverified' : 'ok');

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Las comprobaciones de la solicitud, solo con lo que ya devuelve la API: por categoría con líneas, el ✔ ⚠ ✖ que el
 * servidor puso a cada una; el plazo, y, si hay fechas programadas con lo apartado, si alcanzó en todas.
 */
function reviewItems(request: Pick<RequestView, 'lines' | 'late' | 'blocks'>): ReviewItem[] {
  const resources = categories.flatMap(({ kind, label }): ReviewItem[] => {
    const lines = request.lines.filter((line) => line.kind === kind);
    if (lines.length === 0) return [];
    const verdict = worst(lines.map((line) => line.check));
    const flagged = lines.filter((line) => line.check !== 'ok').length;
    return [{ key: kind, label, verdict, text: lineChecks[verdict].label, detail: flagged === 0 ? count(lines.length, 'línea', 'líneas') : `${flagged} de ${count(lines.length, 'línea', 'líneas')} con aviso` }];
  });
  const held = request.blocks.filter((block) => block.holds.length > 0);
  const complete = held.filter((block) => block.holds.every((hold) => hold.complete)).length;
  return [
    ...resources,
    { key: 'plazo', label: 'Plazo', verdict: request.late ? 'short' : 'ok', text: request.late ? 'Fuera de plazo' : 'En plazo', detail: null },
    ...(held.length > 0
      ? [{ key: 'apartado', label: 'Apartado', verdict: complete === held.length ? 'ok' : 'short', text: complete === held.length ? 'Completo' : 'Falta apartar', detail: `${complete} de ${count(held.length, 'fecha', 'fechas')}` } satisfies ReviewItem]
      : []),
  ];
}

/**
 * La tarjeta de revisión de una solicitud recibida (como «El técnico revisa únicamente las excepciones» de la Propuesta):
 * una fila de comprobaciones ✔ ⚠ ✖ por categoría, cada una con su texto, y debajo, `children` (las acciones de quien revisa).
 * No calcula nada nuevo: dice lo que el servidor ya comprobó.
 */
export function ReviewCard({ request, children }: { request: RequestView; children?: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn(softCard, 'grid gap-6 p-6 sm:p-8 print:hidden')}>
      <div>
        <h2 id={id} className="text-xl font-bold tracking-tight text-ink">
          Revisión
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Lo que el sistema comprobó. Revisa solo lo que trae aviso.</p>
      </div>
      <ul className="grid gap-4 sm:flex sm:flex-wrap sm:gap-x-12 sm:gap-y-6">
        {reviewItems(request).map((item) => {
          const { Icon, circle, text } = marks[item.verdict];
          return (
            <li key={item.key} className="flex items-center gap-3 sm:w-40 sm:flex-col sm:gap-2.5 sm:text-center">
              <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', circle)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="text-sm font-semibold text-ink">{item.label}</span>
                <span className={cn('text-sm font-medium', text)}>{item.text}</span>
                {item.detail ? <span className="text-[13px] text-ink-muted tabular-nums">{item.detail}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {children ? <div className="border-t border-line pt-6">{children}</div> : null}
    </section>
  );
}
