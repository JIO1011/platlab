import { EXPIRING_DAYS, type Position } from '@platlab/contracts';
import { subtractDecimal } from '@platlab/ui';
import { addDays } from '../../app/format';

/** Lo que se puede sacar de un frasco: saldo menos lo apartado por solicitudes (ADR 0012). */
export const availableOf = (position: Position): string =>
  subtractDecimal(position.balance, position.reserved) ?? position.balance;


/** Estado de caducidad de un frasco: vencido antes de hoy; por vencer hoy y hasta `EXPIRING_DAYS` después. */
export function expiryOf(expiresOn: string | null, today: string): 'none' | 'expired' | 'soon' | 'ok' {
  if (expiresOn === null) return 'none';
  if (expiresOn < today) return 'expired';
  return expiresOn <= addDays(today, EXPIRING_DAYS) ? 'soon' : 'ok';
}
