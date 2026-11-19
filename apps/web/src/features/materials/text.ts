import { subtractDecimals, type LoanSummary, type MaterialClass } from '@platlab/contracts';
import { formatDate } from '../../app/format';

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

export type LoanFilter = 'open' | 'overdue' | 'closed';
export const loanFilterLabels: Record<LoanFilter, string> = { open: 'Abiertos', overdue: 'Atrasados', closed: 'Cerrados' };

/** «Vence el 12 nov», «Sin fecha» o, cerrado, «Cerrado el 12 nov»; el atraso lo dice la pastilla, no este texto. */
export function dueText(loan: Pick<LoanSummary, 'dueOn' | 'status' | 'closedAt'>): string {
  if (loan.status === 'closed' && loan.closedAt) return `Cerrado el ${formatDate(loan.closedAt.slice(0, 10))}`;
  return loan.dueOn ? `Vence el ${formatDate(loan.dueOn)}` : 'Sin fecha de devolución';
}

/** Lo que falta de un vale, para la tarjeta: «Falta devolver en 2 de 3 líneas». */
export function outstandingText(loan: Pick<LoanSummary, 'outstandingLines' | 'lineCount' | 'status'>): string {
  if (loan.status === 'closed') return loan.lineCount === 1 ? '1 línea' : `${loan.lineCount} líneas`;
  return `Falta devolver en ${loan.outstandingLines} de ${loan.lineCount} ${loan.lineCount === 1 ? 'línea' : 'líneas'}`;
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
