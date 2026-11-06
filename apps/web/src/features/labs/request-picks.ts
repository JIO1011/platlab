import { compareDecimals, decimalString, positiveQuantity, sumDecimals, type ReagentPickOptions, type ReagentPicksRequest } from '@platlab/contracts';
import { formatDecimal, normalizeDecimalInput, subtractDecimal, toDecimalInput } from '@platlab/ui';

/** Un frasco que se puede apartar para una fecha. */
export type PickItem = ReagentPickOptions['items'][number];

/** Lo que escribe la persona por frasco (`positionId` → texto); lo no escrito sale de lo apartado hoy. */
export type PickInputs = Record<string, string>;


const isZero = (value: string) => compareDecimals(value, '0') === 0;

/** El texto de un campo: lo que el bloque ya tiene apartado de ese frasco (vacío si nada), con coma decimal. */
export const inputOf = (item: PickItem, edits: PickInputs): string => edits[item.positionId] ?? (isZero(item.held) ? '' : toDecimalInput(item.held));

/** «Lote L-01 · vence 05-11-2026 · Estante 2»: lo que distingue un frasco de otro. */
export function itemDetail(item: PickItem): string {
  const expiry = item.expiresOn ? `vence ${item.expiresOn.split('-').reverse().join('-')}` : 'sin vencimiento';
  return `Lote ${item.lotCode} · ${expiry} · ${item.locationName}`;
}

/** Lo elegido frente a lo pedido, con el motivo por frasco y los frascos que viajan. */
export interface PickSummary {
  /** Los frascos con cantidad: lo vacío y el 0 se omiten. */
  picks: ReagentPicksRequest['picks'];
  /** El motivo de cada cantidad no válida, por `positionId`. */
  issues: Record<string, string>;
  /** La suma de las cantidades válidas. */
  total: string;
  /** Lo que falta para cubrir lo pedido; null si se cubre o se pasa. */
  missing: string | null;
  exceedsNeeded: boolean;
  canSave: boolean;
}

/** Cantidades exactas con cadenas decimales (BigInt): nunca `number`. `needed` es lo pedido para esta fecha. */
export function summarizePicks(items: readonly PickItem[], edits: PickInputs, needed: string): PickSummary {
  const picks: ReagentPicksRequest['picks'] = [];
  const issues: Record<string, string> = {};
  for (const item of items) {
    const value = normalizeDecimalInput(inputOf(item, edits));
    if (value === '') continue;
    if (!positiveQuantity.safeParse(value).success) {
      // Cero (0, 0,0) es «sin elegir»: lo demás que no es una cantidad positiva es un error.
      if (!decimalString.safeParse(value).success || !isZero(value)) issues[item.positionId] = 'Escribe una cantidad mayor que cero, como 2,5.';
      continue;
    }
    if (compareDecimals(value, item.available) === 1) issues[item.positionId] = `Solo hay ${formatDecimal(item.available)} disponible.`;
    picks.push({ positionId: item.positionId, quantity: value });
  }
  const total = sumDecimals(picks.map((pick) => pick.quantity));
  const exceedsNeeded = compareDecimals(total, needed) === 1;
  const left = subtractDecimal(needed, total);
  return {
    picks,
    issues,
    total,
    missing: left !== null && compareDecimals(left, '0') === 1 ? left : null,
    exceedsNeeded,
    canSave: !exceedsNeeded && Object.keys(issues).length === 0,
  };
}
