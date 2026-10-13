import { cn } from '../lib/cn';

/**
 * Barra de nivel (ventana de salida, ficha y frascos): el color cuenta el nivel y el texto siempre lo
 * acompaña. Más del 50 %, éxito; de 20 a 50 %, aviso; menos del 20 %, peligro. `percent` es el entero
 * de `ratioPercent` (aritmética exacta). Con `hasStock`, un nivel de 0 % muestra un filo de 4 px: lo
 * que queda poco no es lo vacío.
 */
export function StockLevelBar({
  percent,
  label,
  hasStock = false,
  className,
}: {
  percent: number;
  /** Nombre accesible; por omisión, «Nivel del frasco: N %». */
  label?: string;
  hasStock?: boolean;
  className?: string;
}) {
  return (
    <div role="img" aria-label={label ?? `Nivel del frasco: ${percent} %`} className={cn('h-2 overflow-hidden rounded-full bg-ink/10', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-[width,background-color] duration-300',
          percent > 50 ? 'bg-success' : percent >= 20 ? 'bg-warning' : 'bg-danger',
        )}
        style={{ width: percent === 0 && hasStock ? '4px' : `${percent}%` }}
      />
    </div>
  );
}
