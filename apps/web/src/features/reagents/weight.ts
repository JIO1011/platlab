import { setTareRequest, type Position } from '@platlab/contracts';
import { addDecimal, divideDecimal, formatDecimal, multiplyDecimal, roundDecimal, subtractDecimal } from '@platlab/ui';

/**
 * Control por peso en la interfaz (ADR 0015). Solo anticipa: tara, ajuste por peso y fijar tara los
 * calcula el servidor en numeric. Pesos en g y densidad en g/mL, con aritmética exacta sobre cadenas
 * decimales; nunca con `number`.
 */

/** Cantidad mayor que cero tal como la acepta el contrato (la misma regla para pesos y densidades). */
export const isPositiveQuantity = (value: string) => setTareRequest.shape.grossWeight.safeParse(value).success;

export const isVolume = (unit: string) => unit === 'mL' || unit === 'L';

/**
 * Gramos que pesa una unidad del reactivo: g ×1, kg ×1000, mL ×densidad y L ×1000×densidad. Null si
 * la unidad no se pesa o, en volumen, falta la densidad. Es el mismo factor que usa el servidor.
 */
export function gramsPerUnit(unit: string, density: string | null): string | null {
  if (unit === 'g') return '1';
  if (unit === 'kg') return '1000';
  if (density === null || !isVolume(unit)) return null;
  return unit === 'mL' ? density : multiplyDecimal(density, '1000', 9);
}

function toGrams(quantity: string, unit: string, density: string | null): string | null {
  const factor = gramsPerUnit(unit, density);
  return factor === null ? null : multiplyDecimal(quantity, factor, 9);
}

/** Tara = peso bruto − cantidad pasada a gramos; null si falta un dato. */
export function tareOf(grossWeight: string, quantity: string, unit: string, density: string | null): string | null {
  const content = toGrams(quantity, unit, density);
  return content === null ? null : subtractDecimal(grossWeight, content);
}

/** Peso en g para mostrar, a décimas y sin unidad («640,5»). */
export const formatWeight = (grams: string) => formatDecimal(roundDecimal(grams, 1) ?? grams);
export const formatGrams = (grams: string) => `${formatWeight(grams)} g`;

/** Tara, densidad y unidad de un frasco con control por peso; null si aún no tiene tara. */
function weighed(position: Position) {
  const tare = position.container?.tare ?? null;
  const factor = tare === null ? null : gramsPerUnit(position.unit, position.container?.density ?? null);
  return tare === null || factor === null ? null : { tare, factor };
}

export const hasTare = (position: Position) => weighed(position) !== null;

/** Peso que marcará la balanza con `quantity` en el frasco: tara + contenido; null sin tara. */
export function grossFor(position: Position, quantity: string): string | null {
  const weight = weighed(position);
  const content = weight ? multiplyDecimal(quantity, weight.factor, 9) : null;
  return weight && content !== null ? addDecimal(weight.tare, content) : null;
}

/** Tara, peso neto (el saldo en g) y bruto esperado de un frasco; null sin tara. */
export function weightFigures(position: Position): { tare: string; net: string; expectedGross: string } | null {
  const weight = weighed(position);
  const net = weight ? multiplyDecimal(position.balance, weight.factor, 9) : null;
  const expectedGross = weight && net !== null ? addDecimal(weight.tare, net) : null;
  return weight && net !== null && expectedGross !== null ? { tare: weight.tare, net, expectedGross } : null;
}

/**
 * Del peso en balanza al saldo que registraría el ajuste por peso: (peso − tara) ÷ gramos por
 * unidad, a centésimas, y su diferencia con el saldo actual. Null sin tara o con un peso inválido.
 */
export function scaleBalance(
  position: Position,
  grossWeight: string,
): { balance: string; difference: string } | { belowTare: string } | null {
  const weight = weighed(position);
  const net = weight ? subtractDecimal(grossWeight, weight.tare) : null;
  if (!weight || net === null) return null;
  if (net.startsWith('-')) return { belowTare: weight.tare };
  const balance = divideDecimal(net, weight.factor, 2);
  const difference = balance === null ? null : subtractDecimal(balance, position.balance);
  return balance === null || difference === null ? null : { balance, difference };
}
