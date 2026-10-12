import { type Position } from '@platlab/contracts';
import { availableOf } from '../stock';
import { byProductThenExpiry, isExpired } from './shared';

/**
 * Sugerencia FEFO (01 §6.1, ADR 0012): entre los frascos utilizables del mismo reactivo con saldo,
 * el que vence antes; una caducidad desconocida va al final. Nunca el de menor cantidad.
 */
export function fefoCandidates(positions: Position[], productId: string, today: string): Position[] {
  return positions
    .filter(
      (p) =>
        p.product.id === productId &&
        availableOf(p) !== '0' &&
        p.disposition === 'usable' &&
        !isExpired(p, today),
    )
    .sort(byProductThenExpiry);
}

export function fefoSuggestion(positions: Position[], chosen: Position, today: string): Position | null {
  const candidates = positions
    .filter(
      (p) =>
        p.product.id === chosen.product.id &&
        availableOf(p) !== '0' &&
        p.disposition === 'usable' &&
        !isExpired(p, today),
    )
    .sort((a, b) =>
      (a.lot.expiresOn ?? '9999-12-31').localeCompare(b.lot.expiresOn ?? '9999-12-31') ||
      (a.container?.code ?? '').localeCompare(b.container?.code ?? ''),
    );
  const first = candidates[0];
  if (!first || first.id === chosen.id) return null;
  // Solo se sugiere si de verdad vence antes que el elegido.
  if (chosen.lot.expiresOn !== null && first.lot.expiresOn !== null && first.lot.expiresOn >= chosen.lot.expiresOn) {
    return null;
  }
  return first;
}
