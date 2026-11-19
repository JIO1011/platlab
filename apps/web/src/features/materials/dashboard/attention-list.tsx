import type { MaterialsDashboard } from '@platlab/contracts';
import { Quantity } from '@platlab/ui';
import { AlertTriangle, ChevronRight, CircleCheck, PackageSearch } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate } from '../../../app/format';

const row = 'group flex items-center gap-3 rounded-panel px-3 py-2.5 transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-action';

/**
 * Lo que pide atención (ADR 0025): los vales atrasados más viejos y los materiales más por debajo de su mínimo, cada uno
 * con su enlace. Sin nada atrasado ni bajo, lo dice con una palabra y sin adorno.
 */
export function AttentionList({ attention, base }: { attention: MaterialsDashboard['attention']; base: string }) {
  if (attention.overdue.length === 0 && attention.belowMinimum.length === 0) {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-ink-muted">
        <CircleCheck className="size-4 text-success" aria-hidden />
        Nada atrasado ni bajo su mínimo.
      </p>
    );
  }
  return (
    <ul className="-mx-3 grid gap-0.5">
      {attention.overdue.map((loan) => (
        <li key={loan.loanId}>
          <Link to={`${base}/prestamos?vale=${loan.loanId}`} className={row}>
            <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">
                {loan.code} · {loan.borrowerName}
              </span>
              <span className="block text-[13px] text-ink-muted">Atrasado desde el {formatDate(loan.dueOn)}</span>
            </span>
            <ChevronRight className="size-4 text-ink-subtle" aria-hidden />
          </Link>
        </li>
      ))}
      {attention.belowMinimum.map((material) => (
        <li key={material.productId}>
          <Link to={`${base}/inventario`} className={row}>
            <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
              <PackageSearch className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{material.name}</span>
              <span className="block text-[13px] text-ink-muted">
                Bajo su mínimo: <Quantity value={material.balance} unit={material.baseUnit} /> de <Quantity value={material.minimum} unit={material.baseUnit} />
              </span>
            </span>
            <ChevronRight className="size-4 text-ink-subtle" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
