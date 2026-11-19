import { issuePurposeLabel, materialMovementKindLabel, type MaterialMovement, type MaterialMovementFilters } from '@platlab/contracts';
import { formatDate } from '../../app/format';

/** Color del movimiento en el libro: lo que vuelve o entra en verde, la baja en rojo, el ajuste en ámbar. */
export const kindTone: Record<MaterialMovement['kind'], string> = {
  receipt: 'text-success',
  issue: 'text-ink',
  loan: 'text-action',
  return: 'text-success',
  writeoff: 'text-danger',
  adjustment: 'text-warning',
};

const outcomeText = { damaged: 'Dañado', lost: 'Perdido' } as const;

/** Quién y para qué, bajo la referencia: «Registró Óscar · Clínica · Exodoncia», «Dañado: se rompió». */
export function movementNote(row: MaterialMovement): string | null {
  const parts = [
    row.actor ? `Registró ${row.actor}` : null,
    row.purpose ? issuePurposeLabel[row.purpose] : null,
    row.outcome ? `${outcomeText[row.outcome]}${row.detail ? `: ${row.detail}` : ''}` : row.detail,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** La referencia y la persona en una línea: «P-0043 · Diego Docente». */
export const movementReference = (row: MaterialMovement) => [row.reference, row.person].filter(Boolean).join(' · ') || '—';

/** Los filtros del libro en palabras, para la hoja impresa: «Movimiento: Salida», «Periodo: 1 nov 2026 a hoy». */
export function ledgerFilterLines(filters: MaterialMovementFilters): string[] {
  const lines: string[] = [];
  if (filters.kind) lines.push(`Movimiento: ${materialMovementKindLabel[filters.kind]}`);
  if (filters.from || filters.to) {
    lines.push(`Periodo: ${filters.from ? formatDate(filters.from) : 'el inicio'} a ${filters.to ? formatDate(filters.to) : 'hoy'}`);
  }
  if (filters.purpose) lines.push(`Tipo de salida: ${issuePurposeLabel[filters.purpose]}`);
  if (filters.q) lines.push(`Búsqueda: «${filters.q}»`);
  return lines;
}
