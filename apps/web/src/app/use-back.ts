import { useNavigate } from 'react-router';

/**
 * El índice de la entrada actual en el historial de la app: React Router lo guarda en `history.state.idx`,
 * sube al navegar y no cambia al reemplazar. Quien llega por un enlace (el QR de una etiqueta, que redirige
 * reemplazando) está en 0: no tiene a dónde volver dentro de la app.
 */
function historyIndex(): number {
  const state: unknown = window.history.state;
  const idx = typeof state === 'object' && state !== null ? (state as { idx?: unknown }).idx : undefined;
  return typeof idx === 'number' ? idx : 0;
}

/** A dónde lleva «Volver»: un paso atrás (-1) si la app ya tiene historial; si no, el nivel padre. */
export function backTarget(index: number, parent: string): -1 | string {
  return index > 0 ? -1 : parent;
}

/** La función de «Volver» de una pantalla: deshace el último paso dentro de la app o, sin él, sube al `parent`. */
export function useBack(parent: string): () => void {
  const navigate = useNavigate();
  return () => {
    const target = backTarget(historyIndex(), parent);
    if (target === -1) void navigate(-1);
    else void navigate(target);
  };
}
