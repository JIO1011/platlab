import { cn } from '@platlab/ui';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { toneText } from './due-view';

const tileStyles =
  'group grid content-start gap-0.5 rounded-card bg-surface p-3 text-left shadow-raised sm:p-4 transition-[transform,box-shadow] duration-200 ease-out-expo';
const tileInteractive =
  'cursor-pointer hover:shadow-float motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action';

/**
 * Una cifra de Mantenimiento: valor, nombre y, si hay algo que decir, una línea de estado. Toca para ir a lo que
 * cuenta: `to` navega y `onClick` actúa en la misma página; sin ninguno, no es un control.
 */
export function Tile({
  label,
  value,
  tone = 'neutral',
  hint,
  hintTone = 'neutral',
  cta,
  onClick,
  to,
}: {
  label: string;
  value: ReactNode;
  tone?: 'danger' | 'warning' | 'neutral';
  hint?: ReactNode;
  hintTone?: 'danger' | 'neutral';
  /** La acción que ofrece la cifra («Ver lista»): con chevron, para que se lea como botón. */
  cta?: string | undefined;
  onClick?: (() => void) | undefined;
  to?: string;
}) {
  const content: ReactNode = (
    <>
      <span className={cn('text-[1.75rem] font-bold leading-none tracking-tight tabular-nums', tone === 'neutral' ? 'text-ink' : toneText[tone])}>{value}</span>
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint ? (
        <span className={cn('text-[13px] font-medium', hintTone === 'danger' ? 'text-danger' : 'text-ink-muted')}>{hint}</span>
      ) : null}
      {cta ? (
        <span className="mt-0.5 inline-flex items-center gap-0.5 text-[13px] font-medium text-action group-hover:underline group-hover:underline-offset-2">
          {cta}
          <ChevronRight className="size-3.5 transition-transform duration-200 ease-out-expo motion-safe:group-hover:translate-x-0.5" aria-hidden />
        </span>
      ) : null}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cn(tileStyles, tileInteractive)}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(tileStyles, tileInteractive)}>
        {content}
      </button>
    );
  }
  return <div className={tileStyles}>{content}</div>;
}
