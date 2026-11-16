import { countText } from '../../app/format';
import type { RequestView } from './request-draft';
import { exceptionsText } from './request-summary';

/**
 * Lo que el detalle de una solicitud recibida avisa de ella, sin pintar nada: sale de lo que ya devuelve la API.
 */

/**
 * Lo que quien revisa debe mirar de la solicitud, en frases cortas y solo si lo hay: fuera de plazo, los recursos con ⚠ o
 * ✖ que el servidor marcó, el horario si falta y, con fechas programadas, lo que no se alcanzó a apartar.
 */
export function noticesOf(request: Pick<RequestView, 'late' | 'exceptions' | 'blocks' | 'startsAt' | 'endsAt'>): string[] {
  const held = request.blocks.filter((block) => block.holds.length > 0);
  const short = held.filter((block) => block.holds.some((hold) => !hold.complete)).length;
  return [
    request.late ? 'Fuera de plazo' : null,
    exceptionsText(request.exceptions),
    request.startsAt === null || request.endsAt === null ? 'Sin horario' : null,
    short > 0 ? `Falta apartar recursos en ${countText(short, 'fecha', 'fechas')}` : null,
  ].filter((notice): notice is string => notice !== null);
}
