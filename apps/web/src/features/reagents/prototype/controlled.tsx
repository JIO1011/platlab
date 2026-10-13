// Prototipo R-01D: solo interfaz
import { cn } from '@platlab/ui';
import { Lock } from 'lucide-react';

/** Reactivos de la demo marcados como controlados (datos simulados; el catálogo real aún no lo guarda). */
const controlledCodes = new Set(['HCL-37', 'H2SO4']);
export const isControlled = (code: string) => controlledCodes.has(code);

/**
 * Candado de «Controlado». Va en el acento, nunca en un color de estado; el significado está en el
 * nombre accesible y en el `title`, y en la ficha además se escribe («Controlado»).
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
