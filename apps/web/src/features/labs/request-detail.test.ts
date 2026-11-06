import type { LabsRequest } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { figuresOf, resourceRows, reviewItems } from './request-detail';

const lines: LabsRequest['lines'] = [
  { kind: 'reagent', itemId: null, name: 'Ácido clorhídrico', quantity: '5000', unit: 'mL', check: 'short', available: '4550' },
  { kind: 'equipment', assetTypeId: null, name: 'Balanza', perGroup: null, quantity: 2, check: 'ok', available: 3 },
  { kind: 'material', name: 'Bureta', perGroup: null, quantity: '6', check: 'unverified' },
  { kind: 'reagent', itemId: null, name: 'Fenolftaleína', quantity: '50', unit: 'mL', check: 'unverified', available: null },
];

describe('tabla de recursos', () => {
  it('mide lo disponible frente a lo pedido, con restas exactas', () => {
    const rows = resourceRows({ lines, blocks: [] });
    expect(rows[0]).toMatchObject({ requested: '5.000 mL', available: '4.550 mL', held: false, percent: 91, tone: 'warning', status: 'No alcanza' });
    expect(rows[1]).toMatchObject({ requested: '2', available: '3', percent: 100, tone: 'success', status: 'Alcanza' });
  });

  it('el material y lo que no se puede verificar quedan sin barra y con su texto', () => {
    const rows = resourceRows({ lines, blocks: [] });
    expect(rows[2]).toMatchObject({ requested: '6', available: null, percent: null, tone: 'neutral', status: 'Sin verificar' });
    expect(rows[3]).toMatchObject({ available: null, percent: null, status: 'Sin verificar' });
  });

  it('con fechas programadas mide lo apartado y toma la fecha a la que más le falta', () => {
    const block = (date: string, held: string, assets: string[], complete: boolean) => ({
      activityId: '00000000-0000-4000-8000-000000000001',
      version: 1,
      stage: 'scheduled' as const,
      preparedLines: [],
      closingNotes: null,
      usage: [],
      date,
      code: 'P1-S1-QUI01',
      areaId: 'a',
      areaName: 'Laboratorio de Química',
      startsAt: '08:00',
      endsAt: '10:00',
      responsibleName: 'Óscar',
      holds: [
        { line: 1, held, assets: [], complete },
        { line: 2, held: String(assets.length), assets: assets.map((code) => ({ id: code, code })), complete },
      ],
    });
    const rows = resourceRows({ lines, blocks: [block('2026-11-02', '5000', ['BAL-01', 'BAL-02'], true), block('2026-11-09', '2500', ['BAL-01'], false)] });
    expect(rows[0]).toMatchObject({ available: '2.500 mL', held: true, percent: 50, tone: 'warning', status: 'Falta' });
    expect(rows[1]).toMatchObject({ available: '1', held: true, percent: 50, status: 'Falta' });
    const complete = resourceRows({ lines, blocks: [block('2026-11-02', '5000', ['BAL-01', 'BAL-02'], true)] });
    expect(complete[0]).toMatchObject({ percent: 100, tone: 'success', status: 'Apartado' });
  });
});

const request = {
  dates: ['2026-11-09', '2026-11-02'],
  dateCount: 2,
  scheduledCount: 1,
  startsAt: '08:00',
  endsAt: '10:00',
  areaId: 'a',
  participants: 24,
  groups: 6,
  blocks: [],
};

describe('cifras de la solicitud', () => {
  it('dice fechas en orden, horario, laboratorio por sigla y participantes con sus grupos', () => {
    const [dates, time, lab, people] = figuresOf(request, { abbreviation: 'QUI', areaName: 'Laboratorio de Química' });
    expect(dates).toMatchObject({ label: 'Fechas pedidas', value: '2 fechas', hints: ['lun 2 nov · lun 9 nov', '1 de 2 programadas'], missing: false });
    expect(time).toMatchObject({ value: '08:00–10:00', missing: false });
    expect(lab).toMatchObject({ value: 'QUI', hints: ['Laboratorio de Química'], missing: false });
    expect(people).toMatchObject({ value: '24', hints: ['6 grupos'] });
  });

  it('marca con texto lo que falta', () => {
    const figures = figuresOf({ ...request, dates: [], dateCount: 0, scheduledCount: 0, startsAt: null, areaId: null, participants: null, groups: 1 }, undefined);
    expect(figures.map((figure) => [figure.value, figure.missing])).toEqual([
      ['Sin fecha', true],
      ['Sin horario', true],
      ['Sin elegir', true],
      ['Sin dato', true],
    ]);
    expect(figures[3]?.hints).toEqual(['1 grupo']);
  });
});

describe('comprobaciones de la revisión', () => {
  it('empieza por laboratorio y horario y sigue con lo que dijo el servidor', () => {
    const items = reviewItems({ lines, late: true, blocks: [], areaId: null, startsAt: '08:00', endsAt: '10:00' });
    expect(items.map((item) => [item.label, item.verdict])).toEqual([
      ['Laboratorio', 'short'],
      ['Horario', 'ok'],
      ['Reactivos', 'short'],
      ['Equipos', 'ok'],
      ['Materiales', 'unverified'],
      ['Plazo', 'short'],
    ]);
    expect(items[0]?.text).toBe('Sin elegir');
    expect(items[2]).toMatchObject({ text: 'No alcanza', detail: '2 de 2 líneas con aviso' });
  });

  it('suma «Apartado» solo si hay fechas con lo apartado', () => {
    const block = { activityId: '00000000-0000-4000-8000-000000000002', version: 1, stage: 'scheduled' as const, preparedLines: [], closingNotes: null, usage: [], date: '2026-11-02', code: 'C', areaId: 'a', areaName: 'A', startsAt: '08:00', endsAt: '10:00', responsibleName: 'R', holds: [{ line: 1, held: '0', assets: [], complete: false }] };
    const items = reviewItems({ lines: [], late: false, blocks: [block], areaId: 'a', startsAt: null, endsAt: null });
    expect(items.at(-1)).toMatchObject({ key: 'apartado', text: 'Falta apartar', detail: '0 de 1 fecha' });
    expect(items[1]).toMatchObject({ label: 'Horario', text: 'Sin horario' });
  });
});
