import { useEffect, useState } from 'react';

/**
 * El modo de etiquetas de una pantalla (ADR 0010): las tarjetas giran a su etiqueta y se eligen cuáles
 * imprimir. `used` dice que ya se abrió una vez: el reverso se monta entonces y se queda, para poder girar de
 * vuelta con animación. Escape lo cierra (salvo con un cuadro abierto, que se cierra primero con su Esc) y el
 * foco vuelve al botón `buttonId` que lo abre.
 */
export function useLabelMode(buttonId: string) {
  const [active, setActive] = useState(false);
  const [used, setUsed] = useState(false);
  const close = () => {
    setActive(false);
    document.getElementById(buttonId)?.focus();
  };
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"]')) {
        setActive(false);
        document.getElementById(buttonId)?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, buttonId]);
  /** El botón de la cabecera: lo abre (tras `onOpen`, que parte de una elección limpia) o lo cierra. */
  const toggle = (onOpen: () => void) => {
    setUsed(true);
    if (active) return setActive(false);
    onOpen();
    setActive(true);
  };
  return { active, used, close, toggle };
}
