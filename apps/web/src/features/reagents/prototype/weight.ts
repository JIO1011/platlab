// Prototipo R-01D: solo interfaz
import type { Position } from '@platlab/contracts';
import { addDecimal, divideDecimal, multiplyDecimal, roundDecimal, subtractDecimal } from '@platlab/ui';

/** Tara y densidad de ejemplo de algunos frascos de la demo (aún no hay dónde guardarlas). */
interface SimulatedWeight {
  /** Peso del frasco vacío, en g. */
  tare: string;
  /** g/mL; null en los reactivos que se miden en masa. */
  density: string | null;
}

const simulated: Record<string, SimulatedWeight> = {
  // Cloruro de sodio, frasco 1 de 1.000 g.
  'dac00000-0000-4000-8000-000000000001': { tare: '140', density: null },
  // Ácido clorhídrico 37 %, frasco 1 de 2.500 mL.
  'dac00000-0000-4000-8000-000000000003': { tare: '420', density: '1.19' },
  // Acetona, frasco de 500 mL.
  'dac00000-0000-4000-8000-000000000009': { tare: '135', density: '0.79' },
};

export const simulatedWeightOf = (position: Position): SimulatedWeight | null =>
  (position.container ? simulated[position.container.id] : undefined) ?? null;

/** Densidades de ejemplo por CAS, para los reactivos de la demo que se miden en volumen. */
const densityByCas: Record<string, string> = { '7647-01-0': '1.19', '7664-93-9': '1.84', '67-64-1': '0.79', '64-17-5': '0.789' };
export const knownDensity = (cas: string | null): string | null => (cas ? (densityByCas[cas] ?? null) : null);

/** Peso en g de una cantidad: la masa tal cual o el volumen por su densidad. Sin dato suficiente, null. */
export function weightOfQuantity(quantity: string, unit: string, density: string | null): string | null {
  if (unit === 'g') return quantity;
  if (unit === 'kg') return multiplyDecimal(quantity, '1000', 9);
  if (density === null) return null;
  if (unit === 'mL') return multiplyDecimal(quantity, density, 9);
  if (unit === 'L') {
    const millilitres = multiplyDecimal(quantity, '1000', 9);
    return millilitres === null ? null : multiplyDecimal(millilitres, density, 9);
  }
  return null;
}

/** Cantidad en la unidad del reactivo que corresponde a un peso neto en g; inversa de `weightOfQuantity`. */
export function quantityOfWeight(weight: string, unit: string, density: string | null): string | null {
  if (unit === 'g') return roundDecimal(weight, 2);
  if (unit === 'kg') return divideDecimal(weight, '1000', 2);
  if (density === null) return null;
  const millilitres = divideDecimal(weight, density, 9);
  if (millilitres === null) return null;
  if (unit === 'mL') return roundDecimal(millilitres, 2);
  if (unit === 'L') return divideDecimal(millilitres, '1000', 2);
  return null;
}

/** Tara = peso del frasco lleno − peso de su contenido, a décimas; null si falta un dato. */
export function tareFromFull(full: string, quantity: string, unit: string, density: string | null): string | null {
  const content = weightOfQuantity(quantity, unit, density);
  if (content === null) return null;
  const tare = subtractDecimal(full, content);
  return tare === null ? null : roundDecimal(tare, 1);
}

export interface WeightFigures {
  tare: string;
  net: string;
  expectedGross: string;
}

/** Tara, peso neto (saldo × densidad) y bruto esperado de un frasco, a décimas y en g. */
export function weightFigures(position: Position): WeightFigures | null {
  const weight = simulatedWeightOf(position);
  if (!weight) return null;
  const net = weightOfQuantity(position.balance, position.unit, weight.density);
  if (net === null) return null;
  const gross = addDecimal(weight.tare, net);
  const roundedNet = roundDecimal(net, 1);
  const roundedGross = gross === null ? null : roundDecimal(gross, 1);
  const roundedTare = roundDecimal(weight.tare, 1);
  return roundedNet && roundedGross && roundedTare ? { tare: roundedTare, net: roundedNet, expectedGross: roundedGross } : null;
}

export interface WeighedBalance {
  /** Saldo que dice la balanza, en la unidad del reactivo y a centésimas. */
  balance: string;
  /** Saldo calculado − saldo registrado. */
  difference: string;
}

/** Del peso en balanza al saldo calculado y su diferencia con el registrado; null si no se puede calcular. */
export function balanceFromScale(position: Position, scaleWeight: string): WeighedBalance | { error: string } | null {
  const weight = simulatedWeightOf(position);
  if (!weight) return null;
  const net = subtractDecimal(scaleWeight, weight.tare);
  if (net === null) return null;
  if (net.startsWith('-')) return { error: `El peso es menor que la tara (${roundDecimal(weight.tare, 1)?.replace('.', ',')} g).` };
  const balance = quantityOfWeight(net, position.unit, weight.density);
  if (balance === null) return null;
  const difference = subtractDecimal(balance, position.balance);
  const rounded = difference === null ? null : roundDecimal(difference, 2);
  return rounded === null ? null : { balance, difference: rounded };
}

const decimalPattern = /^\d{1,15}(\.\d{1,9})?$/;
const isPositive = (value: string) => decimalPattern.test(value) && !/^0+(\.0+)?$/.test(value);

export interface ReceiptWeight {
  /** Tara calculada, en g y a décimas. */
  tare: string | null;
  error: string | null;
  /** Hay que pedir la densidad: la unidad es de volumen y el reactivo no la tiene. */
  needsDensity: boolean;
}

/** Cadenas ya normalizadas (punto decimal). Un peso sin llenar no es un error: el control es opcional. */
export function receiptWeight(input: {
  unit: string;
  quantity: string;
  full: string;
  density: string;
  knownDensity: string | null;
}): ReceiptWeight {
  const { unit, quantity, full, density, knownDensity } = input;
  const needsDensity = (unit === 'mL' || unit === 'L') && knownDensity === null;
  const none = { tare: null, error: null, needsDensity };
  if (full === '') return none;
  if (!isPositive(full)) return { ...none, error: 'Escribe el peso en gramos, por ejemplo 640,5.' };
  if (!isPositive(quantity)) return none;
  let usable = knownDensity;
  if (needsDensity) {
    if (density === '') return { ...none, error: 'Falta la densidad (g/mL) para calcular la tara.' };
    if (!isPositive(density)) return { ...none, error: 'La densidad debe ser un número mayor que cero, como 0,789.' };
    usable = density;
  }
  const content = weightOfQuantity(quantity, unit, usable);
  const tare = tareFromFull(full, quantity, unit, usable);
  if (content === null || tare === null) return none;
  if (tare.startsWith('-') || tare === '0.0') {
    return { ...none, error: `El peso lleno debe superar el de su contenido (${roundDecimal(content, 1)?.replace('.', ',')} g).` };
  }
  return { tare, error: null, needsDensity };
}

/** Peso bruto en balanza (tara + contenido) para un saldo dado, a décimas; null sin datos de peso. */
export function grossFor(position: Position, balance: string): string | null {
  const weight = simulatedWeightOf(position);
  if (!weight) return null;
  const net = weightOfQuantity(balance, position.unit, weight.density);
  const gross = net === null ? null : addDecimal(weight.tare, net);
  return gross === null ? null : roundDecimal(gross, 1);
}
