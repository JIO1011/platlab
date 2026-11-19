import { cn } from '@platlab/ui';

const segments = 10;

/**
 * Barra de nivel en diez tramos (la existencia de un vistazo, como el indicador de las listas de inventario): el color
 * cuenta el nivel y el texto siempre la acompaña. Más del 50 %, éxito; de 20 a 50 %, aviso; menos del 20 %, peligro. Con
 * `hasStock`, aunque quede poco se enciende al menos un tramo: lo que queda poco no es lo vacío.
 */
export function SegmentBar({ percent, label, hasStock = false, className }: { percent: number; label: string; hasStock?: boolean; className?: string }) {
  const lit = Math.max(hasStock ? 1 : 0, Math.ceil((percent * segments) / 100));
  const tone = percent > 50 ? 'bg-success' : percent >= 20 ? 'bg-warning' : 'bg-danger';
  return (
    <div role="img" aria-label={label} className={cn('flex h-2.5 gap-[3px]', className)}>
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className={cn('h-full flex-1 rounded-[3px] transition-colors duration-300', index < lit ? tone : 'bg-ink/10')} />
      ))}
    </div>
  );
}
