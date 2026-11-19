import {
  EXPIRY_SOON_DAYS,
  EXPIRY_WATCH_DAYS,
  materialUnit,
  subtractDecimals,
  type IssuePurpose,
  type LoanSummary,
  type MaterialClass,
  type MaterialUnit,
  type StockedMaterial,
} from '@platlab/contracts';
import { addDecimal, ratioPercent, unitText } from '@platlab/ui';
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

/** Cómo se nombra cada unidad al elegirla (ADR 0025, MA-01g): primero las de conteo, luego longitud, masa y volumen. */
const unitNames: Record<MaterialUnit, string> = {
  u: 'Unidades (u)',
  par: 'Pares',
  caja: 'Cajas',
  bolsa: 'Bolsas',
  paquete: 'Paquetes',
  rollo: 'Rollos',
  frasco: 'Frascos',
  tubo: 'Tubos',
  sobre: 'Sobres',
  kit: 'Kits',
  m: 'Metros (m)',
  g: 'Gramos (g)',
  kg: 'Kilogramos (kg)',
  mL: 'Mililitros (mL)',
  L: 'Litros (L)',
};
export const unitOptions = materialUnit.options.map((value) => ({ value, label: unitNames[value] }));

/** Para qué sale un insumo (MA-01f), con la pista del detalle que pide cada tipo. */
export const purposeCopy: Record<IssuePurpose, { label: string; detail: string; hint: string }> = {
  practice: { label: 'Práctica', detail: 'Práctica', hint: 'Cátedra y práctica: «Ortodoncia II, práctica 3».' },
  clinic: { label: 'Clínica', detail: 'Servicio o tratamiento', hint: 'El servicio o el tratamiento, sin datos del paciente.' },
  general: { label: 'General', detail: 'Motivo', hint: 'Reposición, botiquín, descarte…' },
};

/**
 * El semáforo de un lote (02 §12): vencido o vence hoy en rojo, a EXPIRY_SOON_DAYS días o menos en ámbar, hasta
 * EXPIRY_WATCH_DAYS en azul y, más lejos, solo la fecha. Sin fecha no hay semáforo.
 */
export interface ExpiryStatus {
  tone: 'danger' | 'warning' | 'accent' | 'neutral';
  label: string;
}

export function expiryStatus(expiresOn: string | null, today: string): ExpiryStatus | null {
  if (!expiresOn) return null;
  const days = daysBetween(today, expiresOn);
  if (days < 0) return { tone: 'danger', label: `Vencido hace ${countText(-days, 'día', 'días')}` };
  if (days === 0) return { tone: 'danger', label: 'Vence hoy' };
  if (days <= EXPIRY_WATCH_DAYS) return { tone: days <= EXPIRY_SOON_DAYS ? 'warning' : 'accent', label: `Vence en ${countText(days, 'día', 'días')}` };
  return { tone: 'neutral', label: `Vence el ${formatDate(expiresOn)}` };
}

/** Las posiciones para dar salida: primero lo que vence antes (FEFO), lo que no vence al final y luego por ubicación. */
export const byExpiry = <T extends { expiresOn: string | null; locationPath: readonly string[] }>(lines: readonly T[]) =>
  [...lines].sort(
    (a, b) =>
      (a.expiresOn ?? '9999-12-31').localeCompare(b.expiresOn ?? '9999-12-31') || a.locationPath.join(' ').localeCompare(b.locationPath.join(' ')),
  );

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
      note: material.minimum ? `Mínimo ${material.minimum} ${unitText(material.baseUnit, material.minimum)}` : 'Sin mínimo definido',
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
  // Hay existencia, pero todo está fuera en préstamos: no queda nada que sacar ni prestar.
  if (material.available === '0') return { tone: 'warning', label: 'Todo prestado' };
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

export type LoanFilter = 'open' | 'overdue' | 'closed' | 'all';
export const loanFilterLabels: Record<LoanFilter, string> = { open: 'Abiertos', overdue: 'Atrasados', closed: 'Cerrados', all: 'Todos' };

export interface LoanState {
  tone: 'info' | 'warning' | 'danger' | 'success';
  label: 'Activo' | 'Parcial' | 'Atrasado' | 'Cerrado' | 'Con baja';
}

/**
 * El estado del vale en una palabra: atrasado si venció abierto; parcial si ya volvió algo; activo si no; cerrado, o con
 * baja si se cerró con material dañado o perdido (la deuda queda registrada, sin bloqueo: ADR 0025).
 */
export function loanState(loan: Pick<LoanSummary, 'status' | 'overdue' | 'hasDebt' | 'pieces'>): LoanState {
  if (loan.status === 'closed') return loan.hasDebt ? { tone: 'warning', label: 'Con baja' } : { tone: 'success', label: 'Cerrado' };
  if (loan.overdue) return { tone: 'danger', label: 'Atrasado' };
  return loan.pieces.outstanding === loan.pieces.lent ? { tone: 'info', label: 'Activo' } : { tone: 'warning', label: 'Parcial' };
}

/** Cuánto falta por volver, en piezas: «Faltan 5 de 8 piezas»; cerrado, solo cuántas fueron: «8 piezas». */
export function piecesText(loan: Pick<LoanSummary, 'pieces'>): string {
  const { lent, outstanding } = loan.pieces;
  if (outstanding === '0') return lent === '1' ? '1 pieza' : `${lent} piezas`;
  return `${outstanding === '1' ? 'Falta 1' : `Faltan ${outstanding}`} de ${lent} ${lent === '1' ? 'pieza' : 'piezas'}`;
}

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
