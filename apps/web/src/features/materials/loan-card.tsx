import type { LoanSummary } from '@platlab/contracts';
import { Badge } from '@platlab/ui';
import { ChevronRight } from 'lucide-react';
import { CodeTag } from '../../app/code-tag';
import { dueText, outstandingText } from './text';

/**
 * Un vale de préstamo en su tarjeta (ADR 0025): su código y quién se llevó el material; debajo, el plazo y los avisos
 * (atrasado, con baja) y, a la derecha, cuánto falta devolver. Toda la tarjeta abre el vale.
 */
export function LoanCard({ loan, onOpen }: { loan: LoanSummary; onOpen: () => void }) {
  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-card bg-surface px-4 py-4 shadow-raised transition-colors hover:bg-surface-sunken/40 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-action sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CodeTag>{loan.code}</CodeTag>
          <button type="button" aria-haspopup="dialog" onClick={onOpen} className="break-words text-left font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none">
            {loan.borrower.name}
          </button>
        </p>
        <ul className="mt-2 flex flex-wrap items-center gap-1.5">
          <li>
            <Badge className="px-2.5">{dueText(loan)}</Badge>
          </li>
          {loan.overdue ? (
            <li>
              <Badge tone="danger" className="px-2.5">
                Atrasado
              </Badge>
            </li>
          ) : null}
          {loan.hasDebt ? (
            <li>
              <Badge tone="warning" className="px-2.5">
                Con baja
              </Badge>
            </li>
          ) : null}
        </ul>
      </div>
      <ChevronRight className="size-4 shrink-0 text-ink-subtle sm:order-last" aria-hidden />
      <p className="col-span-2 text-sm text-ink-muted sm:col-span-1 sm:text-right">{outstandingText(loan)}</p>
    </li>
  );
}
