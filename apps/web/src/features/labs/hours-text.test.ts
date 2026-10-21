import type { WeeklyHours } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { hoursSummary } from './hours-text';

const closed: WeeklyHours = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': [] };
const morning = [{ opens: '07:00', closes: '13:00' }];
const split = [
  { opens: '07:00', closes: '13:00' },
  { opens: '14:00', closes: '19:00' },
];

describe('hoursSummary', () => {
  it('junta los días seguidos con las mismas franjas', () => {
    expect(hoursSummary({ ...closed, '1': split, '2': split, '3': split, '4': split })).toEqual(['Lun–Jue 07:00–13:00 · 14:00–19:00']);
  });

  it('un día suelto va con su nombre corto', () => {
    expect(hoursSummary({ ...closed, '6': morning })).toEqual(['Sáb 07:00–13:00']);
  });

  it('separa los horarios distintos, en el orden del primer día', () => {
    expect(hoursSummary({ ...closed, '1': split, '2': split, '3': split, '4': split, '5': morning })).toEqual([
      'Lun–Jue 07:00–13:00 · 14:00–19:00',
      'Vie 07:00–13:00',
    ]);
  });

  it('une los días iguales aunque no sean seguidos', () => {
    expect(hoursSummary({ ...closed, '1': morning, '2': morning, '4': morning })).toEqual(['Lun–Mar, Jue 07:00–13:00']);
  });

  it('sin franjas no hay líneas', () => {
    expect(hoursSummary(closed)).toEqual([]);
  });
});
