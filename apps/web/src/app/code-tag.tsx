import { cn } from '@platlab/ui';
import type { ReactNode } from 'react';

/** El código de un equipo en etiqueta monoespaciada, como en su ficha (ADR 0021). */
export function CodeTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-[12px] font-medium tabular-nums leading-4 text-ink-muted', className)}>
      {children}
    </span>
  );
}
