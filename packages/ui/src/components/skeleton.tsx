import { cn } from '../lib/cn';

/**
 * Marcador de carga: ocupa el lugar del contenido para que nada salte al llegar los datos.
 * Quieto a propósito: el ADR 0010 no anima bucles.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-[6px] bg-surface-sunken', className)} aria-hidden />;
}
