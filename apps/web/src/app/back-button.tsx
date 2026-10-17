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
 * El membrete de una pantalla con su «Volver», sin quitarle ancho: en el margen izquierdo, alineado arriba,
 * cuando cabe en él (desde 1536 px: la barra lateral, el contenido de 72 rem y una barra de desplazamiento
 * dejan más de 80 px); por debajo, encima y a la izquierda.
 */
export function WithBack({ parent, children }: { parent: string; children: ReactNode }) {
  return (
    <div className="relative grid gap-3">
      <div className="2xl:absolute 2xl:right-full 2xl:top-0 2xl:mr-3">
        <BackButton parent={parent} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
