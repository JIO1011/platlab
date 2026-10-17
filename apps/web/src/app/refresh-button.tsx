import { Button, cn } from '@platlab/ui';
import { RefreshCw } from 'lucide-react';
import { formatAgo } from './format';
import { useNow } from './use-now';

/**
 * ⟳ «Actualizar» (ADR 0015, 14-10-2026): solo icono, junto al nombre de una ficha. Su nombre accesible y su
 * `title` dicen cuándo se pidieron los datos: «Actualizar · actualizado hace N min». La frescura es lo más
 * antiguo de lo que la ficha muestra (`updatedAt`, en milisegundos; 0 si aún no se sabe).
 */
export function RefreshButton({ freshness }: { freshness: { updatedAt: number; refreshing: boolean; refresh: () => void } }) {
  const now = useNow(15_000);
  const name = freshness.refreshing
    ? 'Actualizando…'
    : freshness.updatedAt > 0
      ? `Actualizar · actualizado ${formatAgo(freshness.updatedAt, now)}`
      : 'Actualizar';
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={name}
      title={name}
      aria-busy={freshness.refreshing || undefined}
      className="-mx-1 -my-1.5 size-11 shrink-0 rounded-full sm:mx-0 sm:-my-0.5 sm:size-9 text-ink-muted hover:text-action [&_svg]:size-[18px]"
      onClick={freshness.refresh}
    >
      <RefreshCw className={cn(freshness.refreshing && 'motion-safe:animate-spin')} aria-hidden />
    </Button>
  );
}
