import type { Position } from '@platlab/contracts';
import { subtractDecimal } from '@platlab/ui';

/** Lo que se puede sacar de un frasco: saldo menos lo apartado por solicitudes (ADR 0012). */
export const availableOf = (position: Position): string =>
  subtractDecimal(position.balance, position.reserved) ?? position.balance;
