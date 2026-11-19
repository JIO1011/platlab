import type { ReactNode } from 'react';
import { cn } from '@platlab/ui';

/** El marco de un bloque del tablero: título, una línea que lo explica y su contenido. */
export function DashCard({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <article aria-label={title} className={cn('flex min-w-0 flex-col gap-4 rounded-card bg-surface p-5 shadow-raised', className)}>
      <header>
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p> : null}
      </header>
      {children}
    </article>
  );
}
