import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { sectionLabel } from './field';

/**
 * Banda de una ventana o tarjeta: rótulo en mayúsculas grises, un dato a la derecha y el contenido
 * debajo. Con `ruled` la separa del resto una línea de borde a borde; el relleno lateral y los
 * márgenes negativos que la llevan hasta el borde los pone quien la usa (`className`).
 */
export function Band({
  label,
  aside,
  ruled = false,
  className,
  children,
}: {
  label?: ReactNode;
  aside?: ReactNode;
  ruled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn(ruled && 'border-t border-line', className)}>
      {label || aside ? (
        <div className={cn('flex items-center justify-between gap-3', children && 'mb-2.5')}>
          <span className={sectionLabel}>{label}</span>
          {aside}
        </div>
      ) : null}
      {children}
    </div>
  );
}
