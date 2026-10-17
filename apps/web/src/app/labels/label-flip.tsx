import { cn } from '@platlab/ui';
import { Check, Minus } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

/** El retardo del giro de la tarjeta número `order`: las tarjetas giran escalonadas, hasta 12 pasos de 40 ms. */
export const flipDelay = (order: number): CSSProperties => ({ '--flip-delay': `${Math.min(order, 12) * 40}ms` }) as CSSProperties;

/**
 * La tarjeta que gira a su etiqueta (ADR 0010): frente y reverso comparten la misma celda, así que mide lo mayor
 * de las dos caras, sin altura fija. El giro dura 300 ms con la curva de salida del sistema; con movimiento
 * reducido no hay giro: las caras se funden.
 */
export const flipCard = (flipped: boolean) =>
  cn(
    'grid h-full grid-cols-[minmax(0,1fr)] [transform-style:preserve-3d] [transform:perspective(1100px)_rotateY(0deg)] [transition-delay:var(--flip-delay)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out-expo',
    flipped && '[transform:perspective(1100px)_rotateY(180deg)]',
    'motion-reduce:[transform:none] motion-reduce:[transform-style:flat]',
  );

/** Lo que el frente de la tarjeta suma al giro: con movimiento reducido se funde en lugar de girar. */
export const flipFront = (flipped: boolean) =>
  cn('motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:[transition-delay:var(--flip-delay)]', flipped && 'motion-reduce:opacity-0');

/**
 * Reverso de una tarjeta: la etiqueta (`children`) y, en toda la cara, una casilla para elegirla. La marca y
 * `status` («Se imprime» / «No se imprime») dicen el estado con texto, no solo con el anillo. `picked` puede
 * ser `'mixed'` (algunas de las que agrupa); `className` pone el radio de la tarjeta.
 */
export function LabelBack({
  flipped,
  picked,
  label,
  status,
  onPick,
  className,
  children,
}: {
  flipped: boolean;
  picked: boolean | 'mixed';
  label: string;
  status: string;
  onPick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={picked}
      aria-label={label}
      tabIndex={flipped ? 0 : -1}
      inert={!flipped}
      aria-hidden={!flipped || undefined}
      onClick={onPick}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          onPick();
        }
      }}
      className={cn(
        '@container relative flex cursor-pointer flex-col items-center [grid-area:1/1] justify-center gap-3 border bg-white p-4 shadow-raised [backface-visibility:hidden] [transform:rotateY(180deg)] transition-shadow duration-200 hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
        'motion-reduce:opacity-0 motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:[transform:none] motion-reduce:[transition-delay:var(--flip-delay)]',
        flipped && 'motion-reduce:opacity-100',
        picked ? 'border-action ring-2 ring-action' : 'border-white/80',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute right-4 top-4 inline-flex size-6 items-center justify-center rounded-md border-2 transition-colors',
          picked ? 'border-action bg-action text-on-action' : 'border-line-strong bg-white',
        )}
      >
        {picked === 'mixed' ? <Minus className="size-4" strokeWidth={3} /> : picked ? <Check className="size-4" strokeWidth={3} /> : null}
      </span>
      {children}
      <p className={cn('text-sm font-semibold', picked ? 'text-action' : 'text-ink-muted')}>{status}</p>
    </div>
  );
}
