import { Button, Tooltip, cn } from '@platlab/ui';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { iconAction } from './glass';
import { useBack } from './use-back';

/**
 * Botón circular «Volver» de 44 px, fuera del membrete: con historial dentro de la app deshace el último
 * paso y, sin él (un enlace abierto de golpe), sube al nivel `parent`.
 */
function BackButton({ parent }: { parent: string }) {
  const back = useBack(parent);
  return (
    <Tooltip label="Volver">
      <Button size="icon" className={cn(iconAction, 'sm:size-11')} aria-label="Volver" onClick={back}>
        <ArrowLeft aria-hidden />
      </Button>
    </Tooltip>
  );
}

/**
 * El membrete de una pantalla con su «Volver»: a la izquierda desde `sm`, en su propia columna y alineado
 * arriba; en el móvil, encima y a la izquierda.
 */
export function WithBack({ parent, children }: { parent: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
      <BackButton parent={parent} />
      <div className="min-w-0 w-full sm:flex-1">{children}</div>
    </div>
  );
}
