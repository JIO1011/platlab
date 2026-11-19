import { subtractDecimals, type LoanSummary } from '@platlab/contracts';
import { Badge, cn, ratioPercent } from '@platlab/ui';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { CodeTag } from '../../app/code-tag';
import { formatDate, formatDayInZone } from '../../app/format';
import { initialsOf } from '../../app/initials';
import { dueStatus, loanState, piecesText, type DueStatus } from './text';

const dueTone: Record<DueStatus['tone'], string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  accent: 'text-ink',
  success: 'text-ink-muted',
  neutral: 'text-ink-muted',
};

/** Columnas de la lista en escritorio: vale y prestatario, piezas, plazo, estado y el chevron. La cabecera usa la misma plantilla. */
const loanColumns = 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_7rem_1.25rem]';

/** Nombres de las columnas en escritorio; en el móvil cada fila los lleva en su texto. */
export function LoanColumnHeads() {
  return (
    <div aria-hidden className={`hidden gap-x-4 border-b border-line px-5 py-2.5 text-[12px] font-medium text-ink-muted md:grid ${loanColumns}`}>
      <span>Vale y prestatario</span>
      <span>Piezas</span>
      <span>Plazo</span>
      <span className="text-right">Estado</span>
      <span />
    </div>
  );
}

/**
 * Un vale en la lista de Préstamos (ADR 0025): quién se lo llevó con su rol y el código del vale; cuántas líneas y cuánto
 * falta por volver, con su barra; el plazo con su urgencia («Atrasado 3 días») y la fecha del préstamo; y su estado en una
 * palabra. Toda la fila abre el vale.
 */
export function LoanRow({ loan, today, timeZone, onOpen }: { loan: LoanSummary; today: string; timeZone: string; onOpen: () => void }) {
  const due = dueStatus(loan, today);
  const state = loanState(loan);
  const back = ratioPercent(subtractDecimals(loan.pieces.lent, loan.pieces.outstanding), loan.pieces.lent) ?? 100;
  const when = loan.status === 'closed' ? loan.closedAt?.slice(0, 10) : loan.dueOn;
  const roles = loan.borrower.roles.length > 0 ? loan.borrower.roles.join(' · ') : 'Miembro';
  return (
    <li
      className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:-outline-offset-2 has-[button:focus-visible]:outline-action sm:px-5 ${loanColumns}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-action-soft text-sm font-bold text-action">
          {initialsOf(loan.borrower.name)}
        </span>
        <div className="grid min-w-0 gap-0.5">
          <p className="flex min-w-0 items-center gap-2">
            <CodeTag>{loan.code}</CodeTag>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={onOpen}
              className="min-w-0 truncate text-left font-semibold text-ink transition-colors after:absolute after:inset-0 group-hover:text-action focus-visible:outline-none"
            >
              {loan.borrower.name}
            </button>
          </p>
          <p className="truncate text-[13px] text-ink-muted">{roles}</p>
        </div>
      </div>
      <Badge tone={state.tone} className="justify-self-end whitespace-nowrap md:order-4">
        {state.label}
      </Badge>
      <div className="col-span-2 grid min-w-0 gap-1.5 md:order-2 md:col-span-1">
        <p className="text-[13px] text-ink-muted">
          <span className="font-medium text-ink">{loan.lineCount === 1 ? '1 línea' : `${loan.lineCount} líneas`}</span> · {piecesText(loan)}
        </p>
        <div role="img" aria-label={`Devuelto o resuelto: ${back} %`} className="h-1.5 max-w-40 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-action transition-[width] duration-300" style={{ width: `${back}%` }} />
        </div>
      </div>
      <div className="col-span-2 grid min-w-0 gap-0.5 md:order-3 md:col-span-1">
        <p className={cn('flex items-center gap-1.5 text-sm font-semibold', dueTone[due.tone])}>
          <CalendarClock className="size-4 shrink-0 text-ink-subtle" aria-hidden />
          {due.headline}
          {when ? <span className="font-normal text-ink-muted">· {formatDate(when)}</span> : null}
        </p>
        <p className="truncate text-[12px] text-ink-muted">
          Prestó {loan.lentBy.name} el {formatDayInZone(loan.lentAt, timeZone)}
        </p>
      </div>
      <ChevronRight aria-hidden className="hidden size-5 text-ink-subtle transition-transform group-hover:translate-x-0.5 md:order-5 md:block" />
    </li>
  );
}
