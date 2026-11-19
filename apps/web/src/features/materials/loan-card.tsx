import type { LoanSummary } from '@platlab/contracts';
import { Badge, IconChip, cn } from '@platlab/ui';
import { CalendarClock, CircleCheck, Clock, TriangleAlert } from 'lucide-react';
import { CodeTag } from '../../app/code-tag';
import { formatDayInZone } from '../../app/format';
import { initialsOf } from '../../app/initials';
import { ModuleMark } from '../../app/module-mark';
import { dueStatus, type DueStatus } from './text';

const dueIcons = { danger: TriangleAlert, warning: Clock, accent: CalendarClock, success: CircleCheck, neutral: CalendarClock } as const;
const headlineTone: Record<DueStatus['tone'], string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  accent: 'text-action',
  success: 'text-success',
  neutral: 'text-ink-muted',
};

/**
 * Un vale de préstamo en su tarjeta (ADR 0025): quién se llevó el material y desde cuándo, el plazo en grande
 * («Atrasado 3 días», «Vence mañana») con su color de urgencia y una barra de cuántas líneas ya volvieron. Toda la tarjeta
 * abre el vale.
 */
export function LoanCard({ loan, today, timeZone, onOpen }: { loan: LoanSummary; today: string; timeZone: string; onOpen: () => void }) {
  const due = dueStatus(loan, today);
  const returned = loan.lineCount - loan.outstandingLines;
  const percent = loan.lineCount === 0 ? 0 : Math.floor((returned * 100) / loan.lineCount);
  return (
    <li className="group relative flex flex-col gap-3 overflow-hidden rounded-[20px] bg-surface p-4 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-action motion-safe:hover:-translate-y-1">
      <ModuleMark
        code="materials"
        className="pointer-events-none absolute -bottom-4 -right-3 size-24 rotate-12 text-surface-sunken transition-[color,transform] duration-500 group-hover:text-action-soft motion-safe:group-hover:scale-110"
      />
      <div className="relative flex min-w-0 items-center gap-2.5">
        <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-action-soft text-xs font-bold text-action">
          {initialsOf(loan.borrower.name)}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h2 className="truncate text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-action">
            <button type="button" aria-haspopup="dialog" onClick={onOpen} className="max-w-full truncate text-left after:absolute after:inset-0 focus-visible:outline-none">
              {loan.borrower.name}
            </button>
          </h2>
          <p className="text-[12px] leading-snug text-ink-muted">
            Prestó {loan.lentBy.name} · {formatDayInZone(loan.lentAt, timeZone)}
          </p>
        </div>
        <CodeTag>{loan.code}</CodeTag>
      </div>
      <div className="relative flex items-center gap-3 border-t border-line pt-3">
        <IconChip icon={dueIcons[due.tone]} tone={due.tone} />
        <div className="grid min-w-0 gap-0.5">
          <p className={cn('text-lg font-bold leading-tight', headlineTone[due.tone])}>{due.headline}</p>
          <p className="truncate text-[13px] text-ink-muted">{due.detail}</p>
        </div>
      </div>
      <div className="relative mt-auto grid gap-1.5">
        <div
          role="img"
          aria-label={`Líneas devueltas: ${returned} de ${loan.lineCount}`}
          className="h-2 overflow-hidden rounded-full bg-ink/10"
        >
          <div className="h-full rounded-full bg-action transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-ink-muted">
            {loan.status === 'closed'
              ? loan.lineCount === 1
                ? '1 línea devuelta'
                : `${loan.lineCount} líneas devueltas`
              : `${returned} de ${loan.lineCount} ${loan.lineCount === 1 ? 'línea devuelta' : 'líneas devueltas'}`}
          </p>
          {loan.hasDebt ? (
            <Badge tone="warning" className="whitespace-nowrap px-2 py-0.5 text-[11px]">
              Con baja
            </Badge>
          ) : null}
        </div>
      </div>
    </li>
  );
}
