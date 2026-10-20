import type { Plan } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { createPlanPayload, missingPlanFields, planChanges, type PlanFormValues } from './plan-form';

const plan: Plan = {
  id: '3f1a4b2c-0000-4000-8000-000000000001',
  kind: 'calibration',
  title: 'Calibración de Balanzas',
  assetType: { id: '3f1a4b2c-0000-4000-8000-000000000002', name: 'Balanzas' },
  asset: null,
  intervalCount: 6,
  intervalUnit: 'month',
  startsOn: '2026-01-15',
  checklist: ['Limpiar el plato', 'Pesar la masa patrón'],
  acceptanceCriteria: 'Error menor a 0,1 g',
  requirement: 'ISO/IEC 17025 6.4.10',
  assetCount: 3,
  nextDueOn: '2026-07-15',
  overdueCount: 0,
  exclusions: [],
  archivedAt: null,
  version: 4,
};

/** El formulario tal como abre al editar `plan`. */
const saved: PlanFormValues = {
  kind: 'calibration',
  scope: 'type',
  assetTypeId: '',
  title: 'Calibración de Balanzas',
  intervalCount: '6',
  intervalUnit: 'month',
  startsOn: '2026-01-15',
  checklist: 'Limpiar el plato\nPesar la masa patrón',
  acceptanceCriteria: 'Error menor a 0,1 g',
  requirement: 'ISO/IEC 17025 6.4.10',
  replaces: '',
};

/** Un alta vacía salvo lo que se le pase. */
const blank = (values: Partial<PlanFormValues> = {}): PlanFormValues => ({
  ...saved,
  kind: '',
  title: '',
  intervalCount: '',
  checklist: '',
  acceptanceCriteria: '',
  requirement: '',
  ...values,
});

const typeId = '3f1a4b2c-0000-4000-8000-000000000010';
const assetId = '3f1a4b2c-0000-4000-8000-000000000020';
const replacedId = '3f1a4b2c-0000-4000-8000-000000000030';

describe('planChanges', () => {
  it('sin cambios, vacío', () => {
    expect(planChanges(plan, saved)).toEqual({});
  });

  it('los espacios y las líneas en blanco no son un cambio', () => {
    const values = { ...saved, title: '  Calibración de Balanzas ', checklist: '\n Limpiar el plato \n\nPesar la masa patrón\n  ', requirement: ' ISO/IEC 17025 6.4.10 ' };
    expect(planChanges(plan, values)).toEqual({});
  });

  it('cada campo cambiado por separado', () => {
    expect(planChanges(plan, { ...saved, title: ' Calibración anual ' })).toEqual({ title: 'Calibración anual' });
    expect(planChanges(plan, { ...saved, intervalCount: '12' })).toEqual({ intervalCount: 12 });
    expect(planChanges(plan, { ...saved, intervalUnit: 'year' })).toEqual({ intervalUnit: 'year' });
    expect(planChanges(plan, { ...saved, startsOn: '2026-02-01' })).toEqual({ startsOn: '2026-02-01' });
    expect(planChanges(plan, { ...saved, checklist: 'Pesar la masa patrón' })).toEqual({ checklist: ['Pesar la masa patrón'] });
    expect(planChanges(plan, { ...saved, acceptanceCriteria: 'Error menor a 0,2 g' })).toEqual({ acceptanceCriteria: 'Error menor a 0,2 g' });
    expect(planChanges(plan, { ...saved, requirement: 'ISO 9001' })).toEqual({ requirement: 'ISO 9001' });
  });

  it('varios cambios a la vez traen solo esos', () => {
    expect(planChanges(plan, { ...saved, intervalCount: '3', startsOn: '2026-03-01' })).toEqual({ intervalCount: 3, startsOn: '2026-03-01' });
  });

  it('criterio y requisito vacíos pasan a null', () => {
    expect(planChanges(plan, { ...saved, acceptanceCriteria: '  ', requirement: '' })).toEqual({ acceptanceCriteria: null, requirement: null });
  });

  it('vaciar la lista de verificación manda una lista vacía', () => {
    expect(planChanges(plan, { ...saved, checklist: ' \n\n' })).toEqual({ checklist: [] });
  });

  it('un plan sin criterio ni requisito no cambia si siguen vacíos', () => {
    const bare = { ...plan, acceptanceCriteria: null, requirement: null };
    expect(planChanges(bare, { ...saved, acceptanceCriteria: '', requirement: '  ' })).toEqual({});
  });
});

describe('createPlanPayload', () => {
  it('de un tipo: manda el tipo y no el equipo', () => {
    const values = blank({ kind: 'preventive', scope: 'type', assetTypeId: typeId, title: ' Preventivo de Balanzas ', intervalCount: '3', startsOn: '2026-05-01' });
    expect(createPlanPayload(values, null)).toEqual({
      kind: 'preventive',
      assetTypeId: typeId,
      title: 'Preventivo de Balanzas',
      intervalCount: 3,
      intervalUnit: 'month',
      startsOn: '2026-05-01',
      checklist: [],
      acceptanceCriteria: null,
      requirement: null,
    });
  });

  it('de un equipo: manda el equipo y no el tipo', () => {
    const values = blank({ kind: 'cleaning', scope: 'asset', assetTypeId: typeId, title: 'Limpieza', intervalCount: '1', replaces: 'none' });
    const payload = createPlanPayload(values, { id: assetId });
    expect(payload).toMatchObject({ kind: 'cleaning', assetId });
    expect(payload).not.toHaveProperty('assetTypeId');
  });

  it('la lista, el criterio y el requisito se normalizan', () => {
    const values = blank({ kind: 'verification', assetTypeId: typeId, title: 'Verificación', intervalCount: '2', checklist: ' Uno \n\n   \nDos ', acceptanceCriteria: ' Conforme ', requirement: '   ' });
    expect(createPlanPayload(values, null)).toMatchObject({ checklist: ['Uno', 'Dos'], acceptanceCriteria: 'Conforme', requirement: null });
  });

  it('replaces: «none» o vacío no manda replacesPlanId; un id, sí', () => {
    const base = blank({ kind: 'calibration', scope: 'asset', title: 'Propio', intervalCount: '6' });
    expect(createPlanPayload({ ...base, replaces: 'none' }, { id: assetId })).not.toHaveProperty('replacesPlanId');
    expect(createPlanPayload({ ...base, replaces: '' }, { id: assetId })).not.toHaveProperty('replacesPlanId');
    expect(createPlanPayload({ ...base, replaces: replacedId }, { id: assetId })).toMatchObject({ replacesPlanId: replacedId });
  });

  it('un plan de un tipo no manda replacesPlanId aunque quede uno elegido', () => {
    const values = blank({ kind: 'calibration', scope: 'type', assetTypeId: typeId, title: 'Del tipo', intervalCount: '6', replaces: replacedId });
    expect(createPlanPayload(values, null)).not.toHaveProperty('replacesPlanId');
  });
});

describe('missingPlanFields', () => {
  const create = { editing: false, custom: false, asset: null, candidates: [] };
  const complete = blank({ kind: 'calibration', scope: 'type', assetTypeId: typeId, intervalCount: '6' });

  it('un alta completa no le falta nada', () => {
    expect(missingPlanFields(complete, create)).toEqual([]);
  });

  it('falta el tipo de trabajo', () => {
    expect(missingPlanFields({ ...complete, kind: '' }, create)).toEqual([{ field: 'kind', message: 'Elige qué trabajo es.' }]);
  });

  it('por tipo sin tipo de equipo', () => {
    expect(missingPlanFields({ ...complete, assetTypeId: '' }, create)).toEqual([
      { field: 'assetTypeId', message: 'Elige el tipo de equipo que cubre.' },
    ]);
  });

  it('por equipo sin equipo: el error es general', () => {
    const values = { ...complete, scope: 'asset' as const, assetTypeId: '' };
    expect(missingPlanFields(values, create)).toEqual([{ field: 'root', message: 'Elige el equipo del plan.' }]);
    expect(missingPlanFields(values, { ...create, asset: { id: assetId } })).toEqual([]);
  });

  it('por equipo con planes de su tipo y sin elegir si reemplaza', () => {
    const values = { ...complete, scope: 'asset' as const };
    const context = { ...create, asset: { id: assetId }, candidates: [{ id: replacedId }] };
    expect(missingPlanFields(values, context)).toEqual([
      { field: 'replaces', message: 'Elige si reemplaza al plan de su tipo o se suma a él.' },
    ]);
    expect(missingPlanFields({ ...values, replaces: 'none' }, context)).toEqual([]);
    expect(missingPlanFields({ ...values, replaces: replacedId }, context)).toEqual([]);
  });

  it('con candidatos pero por tipo, no pide reemplazo', () => {
    expect(missingPlanFields(complete, { ...create, candidates: [{ id: replacedId }] })).toEqual([]);
  });

  it('frecuencia vacía: el mensaje depende de si se escribe o se elige', () => {
    const values = { ...complete, intervalCount: '  ' };
    expect(missingPlanFields(values, create)).toEqual([{ field: 'intervalCount', message: 'Elige cada cuánto se repite.' }]);
    expect(missingPlanFields(values, { ...create, custom: true })).toEqual([{ field: 'intervalCount', message: 'Escribe cada cuánto se repite.' }]);
  });

  it('devuelve todo lo que falta, con la frecuencia primero', () => {
    const fields = missingPlanFields(blank({ scope: 'type' }), create).map((entry) => entry.field);
    expect(fields).toEqual(['intervalCount', 'kind', 'assetTypeId']);
  });

  it('al editar solo cuenta la frecuencia', () => {
    const context = { ...create, editing: true };
    expect(missingPlanFields(blank({ scope: 'asset' }), context)).toEqual([{ field: 'intervalCount', message: 'Elige cada cuánto se repite.' }]);
    expect(missingPlanFields(saved, context)).toEqual([]);
  });
});
