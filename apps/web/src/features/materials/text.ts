import { subtractDecimals, type LoanSummary, type MaterialClass, type StockedMaterial } from '@platlab/contracts';
import { addDecimal, ratioPercent } from '@platlab/ui';
import { countText, daysBetween, formatDate } from '../../app/format';

/** Los textos de Materiales (ADR 0025): cómo se llama cada clase y cómo se lee un vale. */

/** «Insumo» se gasta; «Reutilizable» se presta y se devuelve (01 §3). */
export const classLabels: Record<MaterialClass, string> = {
  consumable: 'Insumo',
  reusable_counted: 'Reutilizable',
  reusable_identified: 'Reutilizable con código',
};

export const classHints: Record<MaterialClass, string> = {
  consumable: 'Se gasta: guantes, puntas, papel filtro. Se ingresa, se da salida y tiene mínimo.',
  reusable_counted: 'Se presta y se devuelve por cantidad: vasos, pipetas, probetas.',
  reusable_identified: 'Una unidad con su propio código.',
};

/** Las clases que hoy se registran desde la pantalla; la de unidades con código llega con su entrega (ADR 0025). */
export const creatableClasses: MaterialClass[] = ['consumable', 'reusable_counted'];

export const unitOptions = [
  { value: 'u', label: 'Unidades (u)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'mL', label: 'Mililitros (mL)' },
  { value: 'L', label: 'Litros (L)' },
];

/** Lo que se escribe en un campo de cantidad: con coma o punto decimal, sin espacios; el contrato valida el resto. */
export const normalizeQuantity = (text: string) => text.trim().replace(',', '.');

/** Lo que está fuera del estante: existencia menos disponible; «0» si no hay nada prestado. */
export const lentOut = (balance: string, available: string) => subtractDecimals(balance, available);

/**
 * Cómo se lee la existencia de un material en su tarjeta: un porcentaje para la barra, qué mide y una nota. El insumo se
 * mide contra su mínimo (la escala llega al doble: en el mínimo la barra queda a la mitad y en ámbar); el reutilizable,
 * por lo que hay en el estante frente a lo que el espacio posee. Sin mínimo no hay barra que decir.
 */
export interface MaterialLevel {
  percent: number | null;
  measure: string;
  note: string;
}

export function materialLevel(material: Pick<StockedMaterial, 'class' | 'balance' | 'available' | 'minimum' | 'baseUnit'>): MaterialLevel {
  if (material.class === 'consumable') {
    const scale = material.minimum ? addDecimal(material.minimum, material.minimum) : null;
    return {
      percent: scale ? ratioPercent(material.balance, scale) : null,
      measure: 'Existencia frente al mínimo',
      note: material.minimum ? `Mínimo ${material.minimum} ${material.baseUnit}` : 'Sin mínimo definido',
    };
  }
  const lent = lentOut(material.balance, material.available);
  return {
    percent: ratioPercent(material.available, material.balance),
    measure: 'En el estante frente a lo que posee el espacio',
    note: lent === '0' ? 'Todo en el estante' : `${lent} ${material.baseUnit} en préstamo`,
  };
}

/** El estado de un material en una palabra, con el tono de su punto: solo lo que pide atención se pinta. */
export interface MaterialStatus {
  tone: 'danger' | 'warning' | 'success';
  label: string;
}

export function materialStatus(material: Pick<StockedMaterial, 'balance' | 'available' | 'belowMinimum'>): MaterialStatus {
  if (material.balance === '0') return { tone: 'danger', label: 'Agotado' };
  if (material.belowMinimum) return { tone: 'warning', label: 'Bajo mínimo' };
  return { tone: 'success', label: 'Disponible' };
}

/** Cuánto pesa el plazo de un vale: el tono pide atención solo si hay atraso o falta poco. */
export interface DueStatus {
  tone: 'danger' | 'warning' | 'accent' | 'success' | 'neutral';
  headline: string;
  detail: string;
}

/** Los vales con plazo a 3 días o menos se avisan en ámbar. */
const dueSoonDays = 3;

export function dueStatus(loan: Pick<LoanSummary, 'dueOn' | 'status' | 'closedAt' | 'overdue'>, today: string): DueStatus {
  if (loan.status === 'closed') return { tone: 'success', headline: 'Devuelto', detail: dueText(loan) };
  if (!loan.dueOn) return { tone: 'neutral', headline: 'Sin plazo', detail: dueText(loan) };
  const late = daysBetween(loan.dueOn, today);
  if (loan.overdue) {
    return { tone: 'danger', headline: late >= 1 ? `Atrasado ${countText(late, 'día', 'días')}` : 'Atrasado', detail: dueText(loan) };
  }
  const left = daysBetween(today, loan.dueOn);
  const headline = left <= 0 ? 'Vence hoy' : left === 1 ? 'Vence mañana' : `Vence en ${left} días`;
  return { tone: left <= dueSoonDays ? 'warning' : 'accent', headline, detail: dueText(loan) };
}

export type LoanFilter = 'open' | 'overdue' | 'closed';
export const loanFilterLabels: Record<LoanFilter, string> = { open: 'Abiertos', overdue: 'Atrasados', closed: 'Cerrados' };

/** «Vence el 12 nov», «Sin fecha» o, cerrado, «Cerrado el 12 nov»; el atraso lo dice la pastilla, no este texto. */
export function dueText(loan: Pick<LoanSummary, 'dueOn' | 'status' | 'closedAt'>): string {
  if (loan.status === 'closed' && loan.closedAt) return `Cerrado el ${formatDate(loan.closedAt.slice(0, 10))}`;
  return loan.dueOn ? `Vence el ${formatDate(loan.dueOn)}` : 'Sin fecha de devolución';
}

/** Una ubicación con su ruta bajo la sede, para elegirla: «Laboratorio 1 › Estante A». */
export function locationLabels(
  locations: ReadonlyArray<{ id: string; name: string; kind: string; parentId: string | null }>,
): Map<string, string> {
  const byId = new Map(locations.map((place) => [place.id, place]));
  const labels = new Map<string, string>();
  for (const place of locations) {
    const parts: string[] = [];
    for (let current: typeof place | undefined = place; current && parts.length < 6; current = current.parentId ? byId.get(current.parentId) : undefined) {
      if (current.kind !== 'site') parts.unshift(current.name);
    }
    labels.set(place.id, parts.length > 0 ? parts.join(' › ') : place.name);
  }
  return labels;
}
