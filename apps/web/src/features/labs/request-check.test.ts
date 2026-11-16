import { FORM_STANDARD_LAYOUT, type RequestCheck } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { catalogOf, checkPlan, scopeText, slotted, verdictOf, type CheckAnswer } from './request-check';
import type { DraftLine, RequestDraft } from './request-draft';

const reagentId = '5b2c7a10-1f3e-4a6b-8c9d-0e1f2a3b4c5d';
const assetTypeId = '7c3d8b21-2a4f-4b7c-9dae-1f2a3b4c5d6e';

const salt: DraftLine = { id: 'a', kind: 'reagent', catalog: true, itemId: reagentId, name: 'Cloruro de sodio', quantity: '5', unit: 'g' };
const empty: DraftLine = { id: 'b', kind: 'reagent', catalog: true, itemId: reagentId, name: 'Cloruro de sodio', quantity: '', unit: 'g' };
const scale: DraftLine = { id: 'c', kind: 'equipment', catalog: true, assetTypeId, name: 'Balanza', byGroup: false, perGroup: '', quantity: '2' };
const paper: DraftLine = { id: 'd', kind: 'material', name: 'Papel filtro', byGroup: false, perGroup: '', quantity: '3' };

const draft: RequestDraft = {
  title: 'Cinética química',
  teacherName: 'Diego Docente',
  activityType: 'practice',
  subject: '',
  career: '',
  dates: ['2026-11-20', '2026-11-18'],
  startsAt: '10:00',
  endsAt: '12:00',
  participants: '30',
  groups: '5',
  areaId: null,
  answers: {},
  notes: '',
  lines: [salt, empty, scale, paper],
};

const planOf = (patch: Partial<RequestDraft> = {}) => checkPlan({ ...draft, ...patch }, FORM_STANDARD_LAYOUT)!;

const result = (catalog: RequestCheck['catalog'] = { reagents: [{ id: reagentId, available: '70', stock: '80', held: '10', expired: '0' }], equipmentTypes: [{ id: assetTypeId, available: 1, total: 2 }] }): RequestCheck => ({
  lines: [
    { kind: 'reagent', itemId: reagentId, name: 'Cloruro de sodio', quantity: '5', unit: 'g', check: 'ok', available: '70' },
    { kind: 'equipment', assetTypeId, name: 'Balanza', perGroup: null, quantity: 2, check: 'short', available: 1 },
    { kind: 'material', name: 'Papel filtro', perGroup: null, quantity: '3', check: 'unverified' },
  ],
  review: { dates: [], reagents: [{ line: 0, name: 'Cloruro de sodio', unit: 'g', needed: '10', available: '70', areas: [] }] },
  catalog,
});

describe('consulta sin guardar', () => {
  it('manda solo las líneas completas y recuerda su posición en el borrador', () => {
    const plan = planOf();
    expect(plan.body.lines).toHaveLength(3);
    expect(plan.positions).toEqual([0, 2, 3]);
    expect(plan.body.dates).toEqual(['2026-11-18', '2026-11-20']);
    expect(plan.body).toMatchObject({ startsAt: '10:00', endsAt: '12:00', participants: 30, groups: 5 });
  });

  it('un horario a medias o al revés se comprueba como si no hubiera', () => {
    expect(planOf({ endsAt: '' }).body).toMatchObject({ startsAt: null, endsAt: null });
    expect(planOf({ startsAt: '12:00', endsAt: '10:00' }).body).toMatchObject({ startsAt: null, endsAt: null });
    expect(slotted(planOf({ endsAt: '' }).body)).toBe(false);
    expect(slotted(planOf().body)).toBe(true);
  });

  it('la marca de una línea es la de su posición, con lo que se necesita para todas las fechas', () => {
    const plan = planOf();
    const answer: CheckAnswer = { body: plan.body, result: result() };
    expect(verdictOf(salt, 0, plan, answer)).toMatchObject({ state: 'checked', needed: '10', dates: 2, slot: true, line: { check: 'ok' } });
    expect(verdictOf(empty, 1, plan, answer)).toEqual({ state: 'incomplete' });
    expect(verdictOf(scale, 2, plan, answer)).toMatchObject({ state: 'checked', needed: '2', line: { check: 'short', available: 1 } });
    expect(verdictOf(paper, 3, plan, answer)).toEqual({ state: 'material' });
  });

  it('nunca muestra la respuesta de otro pedido: mientras llega la nueva, se está comprobando', () => {
    const before = planOf();
    const answer: CheckAnswer = { body: before.body, result: result() };
    const now = planOf({ lines: [{ ...salt, quantity: '50' }, empty, scale, paper] });
    expect(verdictOf(salt, 0, now, answer)).toEqual({ state: 'checking' });
    expect(verdictOf(salt, 0, now, undefined)).toEqual({ state: 'checking' });
  });

  it('lo libre del catálogo sirve mientras no cambien las fechas ni el horario', () => {
    const before = planOf();
    const answer: CheckAnswer = { body: before.body, result: result() };
    expect(catalogOf(planOf({ lines: [salt] }), answer)).toEqual(answer.result.catalog);
    expect(catalogOf(planOf({ dates: ['2026-11-18'] }), answer)).toBeNull();
    expect(catalogOf(planOf({ startsAt: '09:00' }), answer)).toBeNull();
    expect(catalogOf(before, undefined)).toBeNull();
  });

  it('dice para cuándo se cuenta lo libre', () => {
    expect(scopeText(undefined)).toBe('Sin fechas todavía: se cuenta lo libre hoy.');
    expect(scopeText(planOf({ dates: ['2026-11-18'] }).body)).toMatch(/^Lo libre para el .+, de 10:00 a 12:00\.$/);
    expect(scopeText(planOf({ endsAt: '' }).body)).toBe('Lo libre para tus 2 fechas. Sin horario, los equipos se cuentan operativos.');
  });
});
