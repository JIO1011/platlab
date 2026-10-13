import { cn } from '@platlab/ui';
import { Lock } from 'lucide-react';

/**
 * Candado de «Controlado» (ADR 0015): lo marca el Administrador en la ficha, nunca el sistema. Va en
 * el acento, nunca en un color de estado; el significado está en el nombre accesible y en el `title`,
 * y con `withText` además se escribe.
 */
export function ControlledMark({ className, withText = false }: { className?: string; withText?: boolean }) {
  if (withText) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 font-medium text-action', className)}>
        <Lock className="size-4" aria-hidden />
        Controlado
      </span>
    );
  }
  return (
    <span role="img" aria-label="Controlado" title="Controlado" className={cn('inline-flex text-action', className)}>
      <Lock className="size-3.5" aria-hidden />
    </span>
  );
}
