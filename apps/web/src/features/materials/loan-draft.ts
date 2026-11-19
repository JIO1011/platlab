import { compareDecimals, subtractDecimals, sumDecimals, type MaterialStockLine } from '@platlab/contracts';
import { normalizeQuantity } from './text';

/** Una línea del vale mientras se arma: el material, de qué posición sale y cuánto. Lo que se muestra y lo que se envía. */
export interface DraftLine {
  key: string;
  productId: string;
  name: string;
  unit: string;
  /** Posiciones con algo disponible, de más a menos. */
  positions: MaterialStockLine[];
  positionId: string;
  quantity: string;
}

export interface PickedMaterial {
  id: string;
  name: string;
  baseUnit: string;
}

const isQuantity = (text: string) => /^\d+(\.\d+)?$/.test(text) && compareDecimals(text, '0') > 0;

const availableOf = (line: DraftLine): string => line.positions.find((position) => position.positionId === line.positionId)?.available ?? '0';

/** Lo que el vale deja ver de una línea: por qué todavía no se puede prestar, o nada si está bien. */
export function lineProblem(line: DraftLine): string | null {
  const quantity = normalizeQuantity(line.quantity);
  if (!isQuantity(quantity)) return 'Escribe una cantidad mayor que cero';
  return compareDecimals(quantity, availableOf(line)) > 0 ? `Hay ${availableOf(line)} ${line.unit} disponibles` : null;
}

/**
 * Tocar un material en el catálogo: si ya está en el vale suma una unidad a la primera línea con margen (o abre otra desde
 * una ubicación aún sin usar); si no, lo agrega con una unidad de la ubicación con más disponible. Sin disponible, nada.
 */
export function pickMaterial(lines: readonly DraftLine[], material: PickedMaterial, stock: readonly MaterialStockLine[]): DraftLine[] {
  const positions = stock
    .filter((position) => compareDecimals(position.available, '0') > 0)
    .sort((a, b) => compareDecimals(b.available, a.available));
  if (positions.length === 0) return [...lines];
  const mine = lines.filter((line) => line.productId === material.id);
  const roomy = mine.find((line) => compareDecimals(sumDecimals([normalizeQuantity(line.quantity) || '0', '1']), availableOf(line)) <= 0);
  if (roomy) return lines.map((line) => (line === roomy ? { ...line, quantity: sumDecimals([normalizeQuantity(line.quantity) || '0', '1']) } : line));
  const free = positions.find((position) => !mine.some((line) => line.positionId === position.positionId));
  if (mine.length > 0 && !free) return [...lines];
  const first = free ?? positions[0];
  if (!first) return [...lines];
  return [...lines, { key: crypto.randomUUID(), productId: material.id, name: material.name, unit: first.unit, positions, positionId: first.positionId, quantity: '1' }];
}

/** Sumar o restar una unidad a una línea: sumar no pasa de lo disponible y restar de una unidad la quita del vale. */
export function stepLine(lines: readonly DraftLine[], key: string, delta: 1 | -1): DraftLine[] {
  return lines.flatMap((line) => {
    if (line.key !== key) return [line];
    const current = normalizeQuantity(line.quantity);
    const base = isQuantity(current) ? current : '0';
    if (delta === -1) return compareDecimals(base, '1') <= 0 ? [] : [{ ...line, quantity: subtractDecimals(base, '1') }];
    const next = sumDecimals([base, '1']);
    return [compareDecimals(next, availableOf(line)) > 0 ? line : { ...line, quantity: next }];
  });
}

/** Las posiciones que una línea puede elegir: las suyas, sin las que otra línea del mismo material ya usa. */
export function positionChoices(lines: readonly DraftLine[], line: DraftLine): MaterialStockLine[] {
  const taken = new Set(lines.filter((other) => other.productId === line.productId && other.key !== line.key).map((other) => other.positionId));
  return line.positions.filter((position) => !taken.has(position.positionId));
}

/** Cuántos materiales distintos y cuántas unidades lleva el vale; las líneas con una cantidad inválida no cuentan. */
export function ticketTotals(lines: readonly DraftLine[]): { materials: number; units: string } {
  const valid = lines.map((line) => normalizeQuantity(line.quantity)).filter(isQuantity);
  return { materials: new Set(lines.map((line) => line.productId)).size, units: sumDecimals(valid) };
}
