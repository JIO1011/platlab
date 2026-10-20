import { Quantity, cn } from '@platlab/ui';

/**
 * Lo que dice el tipo de un movimiento sobre su cifra: lo que sale va en rojo y lo que entra, en verde; el ajuste y el
 * traslado (no cambian la existencia del espacio) toman el acento.
 */
const toneOf = (type: string, quantity: string): string =>
  type === 'adjustment' || type === 'transfer' ? 'text-action' : quantity.startsWith('-') ? 'text-danger' : 'text-success';

/**
 * La cantidad de un movimiento, con su signo, como texto con color y sin recuadro (ADR 0021; DESIGN.md, «Voz única»). El
 * color nunca es el único dato: el signo y el tipo siguen escritos junto a ella. Un solo componente para el Resumen, la
 * lista de Movimientos y la ficha del reactivo.
 */
export function MovementAmount({ type, quantity, unit, className }: { type: string; quantity: string; unit: string; className?: string }) {
  return <Quantity value={quantity} unit={unit} signed className={cn('font-semibold', toneOf(type, quantity), className)} unitClassName="font-semibold text-current" />;
}
