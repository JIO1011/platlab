import type { MaintenanceRecord } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { recordEntry } from './asset-events';

const base = {
  id: 'r1',
  asset: { id: 'a1', code: 'BAL-01', name: 'Balanza', area: 'Laboratorio' },
  plan: { id: 'p1', title: 'Calibración anual', kind: 'calibration', requirement: null },
  kind: 'calibration',
  performedOn: '2026-10-10',
  recordedBy: { name: 'Operador' },
  recordedAt: '2026-10-12T15:00:00.000Z',
  voided: null,
} as unknown as MaintenanceRecord;

describe('recordEntry', () => {
  it('va en su fecha de trabajo, sin hora, con el plan y quién lo registró', () => {
    expect(recordEntry(base)).toMatchObject({ key: 'maintenance-r1', day: '2026-10-10', at: null, title: 'Calibración anual', actor: null, voided: false });
  });

  it('sin plan, su tipo de trabajo; un correctivo, «Correctivo»', () => {
    expect(recordEntry({ ...base, plan: null, kind: 'cleaning' }).title).toBe('Limpieza sin plan');
    expect(recordEntry({ ...base, plan: null, kind: 'corrective' }).title).toBe('Correctivo');
  });

  it('un anulado sigue a la vista, marcado', () => {
    const voided = { ...base, voided: { at: '2026-10-13T15:00:00.000Z', by: null, reason: 'Duplicado', correctedBy: null } };
    expect(recordEntry(voided).voided).toBe(true);
  });
});
