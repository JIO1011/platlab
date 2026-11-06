import type { RequestReview, ScheduleProblem } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { reviewRows } from './send-review';

const area = (problems: ScheduleProblem[]) => ({ name: 'Química', problems });
const scale = (free: number, alternatives: Array<{ startsAt: string; endsAt: string }> = []) => ({ line: 1, name: 'Balanza', wanted: 1, free, alternatives });

describe('reviewRows', () => {
  it('lo que alcanza en todas las fechas va en una sola fila con ✓', () => {
    const review: RequestReview = {
      dates: [
        { date: '2026-11-10', area: area([]), equipment: [scale(1)] },
        { date: '2026-11-17', area: area([]), equipment: [scale(2)] },
      ],
      reagents: [{ line: 0, name: 'NaOH', unit: 'g', needed: '60', available: '100', areas: [{ name: 'Química', available: '100' }] }],
    };
    expect(reviewRows(review).map((row) => [row.ok, row.label, row.alternatives])).toEqual([
      [true, 'Química libre', []],
      [true, 'NaOH · 60 g', []],
      [true, 'Balanza × 1', []],
    ]);
  });

  it('lo que no alcanza va por fecha, con el motivo y sus alternativas', () => {
    const review: RequestReview = {
      dates: [
        { date: '2026-11-10', area: area(['overlap']), equipment: [scale(0, [{ startsAt: '10:00', endsAt: '12:00' }])] },
        { date: '2026-11-17', area: area([]), equipment: [scale(1)] },
      ],
      reagents: [
        {
          line: 0,
          name: 'NaOH',
          unit: 'g',
          needed: '1200',
          available: '120',
          areas: [
            { name: 'Química', available: '100' },
            { name: null, available: '20' },
          ],
        },
      ],
    };
    const rows = reviewRows(review);
    expect(rows.every((row) => !row.ok)).toBe(true);
    expect(rows.map((row) => row.alternatives)).toEqual([
      ['Se cruza con otro bloque del área'],
      ['Hay 120 g', 'Química: 100 g', 'Sin área: 20 g'],
      ['Ninguno libre en ese horario', 'Libre ese día: 10:00–12:00'],
    ]);
    expect(rows[2]!.label).toMatch(/^Balanza × 1 · /);
  });

  it('un reactivo sin existencias y sin laboratorio pedido', () => {
    const review: RequestReview = {
      dates: [{ date: '2026-11-10', area: null, equipment: [] }],
      reagents: [{ line: 0, name: 'NaOH', unit: 'g', needed: '1.5', available: '0', areas: [] }],
    };
    expect(reviewRows(review)).toEqual([{ key: 'reagent-0', ok: false, label: 'NaOH · 1,5 g', alternatives: ['No hay disponible'] }]);
  });
});
