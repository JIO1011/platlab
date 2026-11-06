import { compareDecimals, scheduleProblemText, type RequestReview } from '@platlab/contracts';
import { formatDecimal } from '@platlab/ui';
import { formatDate } from '../../app/format';

/**
 * La revisión antes de enviar (ADR 0023, «Flujo de la Propuesta») como la lista de la Propuesta: «Lo solicitado» con ✓
 * o ⚠ y, en lo que no alcanza, sus alternativas. Lo que alcanza en todas las fechas va en una sola fila; lo que no, una
 * fila por fecha. Solo informa: el docente puede enviar igual.
 */
export interface ReviewRow {
  key: string;
  ok: boolean;
  label: string;
  /** Por qué no alcanza y qué hay en su lugar; vacío si alcanza. */
  alternatives: string[];
}

const onDate = (label: string, date: string, dates: number) => (dates > 1 ? `${label} · ${formatDate(date)}` : label);

export function reviewRows(review: RequestReview): ReviewRow[] {
  const rows: ReviewRow[] = [];
  const count = review.dates.length;

  const areaDates = review.dates.filter((date) => date.area !== null);
  const blocked = areaDates.filter((date) => date.area!.problems.length > 0);
  if (areaDates.length > 0 && blocked.length === 0) rows.push({ key: 'area', ok: true, label: `${areaDates[0]!.area!.name} libre`, alternatives: [] });
  for (const date of blocked) {
    rows.push({
      key: `area-${date.date}`,
      ok: false,
      label: onDate(date.area!.name, date.date, count),
      alternatives: date.area!.problems.map((problem) => scheduleProblemText[problem]),
    });
  }

  for (const item of review.reagents) {
    const ok = compareDecimals(item.available, item.needed) >= 0;
    const amount = (value: string) => `${formatDecimal(value)} ${item.unit}`;
    rows.push({
      key: `reagent-${item.line}`,
      ok,
      label: `${item.name} · ${amount(item.needed)}`,
      alternatives: ok
        ? []
        : [
            item.areas.length === 0 ? 'No hay disponible' : `Hay ${amount(item.available)}`,
            ...item.areas.map((area) => `${area.name ?? 'Sin área'}: ${amount(area.available)}`),
          ],
    });
  }

  const equipment = review.dates.flatMap((date) => date.equipment.map((item) => ({ ...item, date: date.date })));
  for (const line of [...new Set(equipment.map((item) => item.line))]) {
    const items = equipment.filter((item) => item.line === line);
    const short = items.filter((item) => item.free < item.wanted);
    const label = `${items[0]!.name} × ${items[0]!.wanted}`;
    if (short.length === 0) rows.push({ key: `equipment-${line}`, ok: true, label, alternatives: [] });
    for (const item of short) {
      rows.push({
        key: `equipment-${line}-${item.date}`,
        ok: false,
        label: onDate(label, item.date, count),
        alternatives: [
          item.free === 0 ? 'Ninguno libre en ese horario' : `Libres en ese horario: ${item.free}`,
          item.alternatives.length === 0 ? 'Sin otro horario libre ese día' : `Libre ese día: ${item.alternatives.map((slot) => `${slot.startsAt}–${slot.endsAt}`).join(', ')}`,
        ],
      });
    }
  }
  return rows;
}
