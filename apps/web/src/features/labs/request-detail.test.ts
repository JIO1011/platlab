import { describe, expect, it } from 'vitest';
import { noticesOf } from './request-detail';

const heldBlock = {
  activityId: '00000000-0000-4000-8000-000000000002',
  version: 1,
  stage: 'scheduled' as const,
  preparedLines: [],
  closingNotes: null,
  usage: [],
  date: '2026-11-02',
  code: 'C',
  areaId: 'a',
  areaName: 'A',
  startsAt: '08:00',
  endsAt: '10:00',
  responsibleName: 'R',
  holds: [{ line: 1, held: '0', assets: [], complete: false }],
};

describe('avisos de la solicitud', () => {
  const calm = { late: false, exceptions: { reagent: 0, equipment: 0, material: 0 }, blocks: [], startsAt: '08:00', endsAt: '10:00' };

  it('sin nada que mirar no hay avisos', () => {
    expect(noticesOf(calm)).toEqual([]);
  });

  it('dice el plazo, los recursos por revisar y lo que falta, en frases cortas', () => {
    expect(noticesOf({ ...calm, late: true, exceptions: { reagent: 2, equipment: 0, material: 0 }, startsAt: null })).toEqual([
      'Fuera de plazo',
      '2 reactivos por revisar',
      'Sin horario',
    ]);
  });

  it('con fechas programadas avisa de las que no alcanzaron a apartar', () => {
    expect(noticesOf({ ...calm, blocks: [heldBlock] })).toEqual(['Falta apartar recursos en 1 fecha']);
    expect(noticesOf({ ...calm, blocks: [{ ...heldBlock, holds: [{ line: 1, held: '5', assets: [], complete: true }] }] })).toEqual([]);
  });
});
