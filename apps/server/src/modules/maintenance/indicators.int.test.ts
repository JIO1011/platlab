import { beforeAll, describe, expect, it } from 'vitest';
import { maintenanceIndicators, maintenanceSummary, record, recordCreated, replacementDismissed } from '@platlab/contracts';
import { periodStart } from './application/indicators.js';
import {
  call,
  count,
  createAsset,
  createMaintenanceLab,
  createPlan,
  createType,
  key,
  recordWork,
  shiftDate,
  todayIn,
  type MaintenanceLab,
} from './maintenance.fixtures.js';

/**
 * M-01c (ADR 0020): la fecha que tocaba de cada registro, los Indicadores, «Evaluar reemplazo» y la tarjeta del
 * Inicio por la API. Cada caso usa su propio espacio: los indicadores cuentan todo el espacio.
 */

const indicatorsOf = async (lab: MaintenanceLab, subject = lab.operator.subject) => {
  const response = await call(subject, `${lab.maintenance}/indicators`);
  expect(response.status).toBe(200);
  return maintenanceIndicators.parse(response.body);
};

const summaryOf = async (lab: MaintenanceLab, subject: string) =>
  maintenanceSummary.parse((await call(subject, `${lab.maintenance}/summary`)).body);

/** Registra y devuelve el registro creado; falla la prueba si la API no responde 201. */
async function done(lab: MaintenanceLab, body: Record<string, unknown>, subject = lab.operator.subject) {
  const response = await recordWork(lab, subject, body);
  expect(response.status).toBe(201);
  return recordCreated.parse(response.body);
}

describe('el periodo de Indicadores', () => {
  it('empieza el primer día del mes de hace 11 meses, también al cruzar el año', () => {
    expect(periodStart('2026-10-18')).toBe('2025-11-01');
    expect(periodStart('2026-12-31')).toBe('2026-01-01');
    expect(periodStart('2027-01-05')).toBe('2026-02-01');
  });
});

describe('cumplimiento del plan (M-01c)', () => {
  let lab: MaintenanceLab;
  let today: string;

  beforeAll(async () => {
    lab = await createMaintenanceLab();
    today = await todayIn(lab);
  });

  it('guarda la fecha que tocaba y mide a tiempo, tarde y pendiente, también por requisito', async () => {
    const type = await createType(lab);
    const late = await createAsset(lab, { typeId: type.id });
    const redone = await createAsset(lab, { typeId: type.id });
    // Cada 30 días: las fechas se calculan sin meses de distinto largo. Un equipo nuevo toca hoy por primera vez.
    const plan = await createPlan(lab, {
      assetTypeId: type.id,
      intervalCount: 30,
      intervalUnit: 'day',
      startsOn: '2025-01-01',
      requirement: 'ISO/IEC 17025 6.4.10',
    });
    expect(plan.requirement).toBe('ISO/IEC 17025 6.4.10');
    const base = { planId: plan.id, result: 'pass' };

    // Hecho 100 días antes de su fecha (hoy): a tiempo. Toca de nuevo 30 días después de hecho.
    const early = await done(lab, { ...base, assetId: late.id, performedOn: shiftDate(today, -100) });
    expect(early.dueOn).toBe(today);
    expect(early.nextDueOn).toBe(shiftDate(today, -70));
    // Hecho 10 días después de su fecha: tarde. Lo que toca después (hace 30 días) sigue pendiente.
    const behind = await done(lab, { ...base, assetId: late.id, performedOn: shiftDate(today, -60) });
    expect(behind.dueOn).toBe(shiftDate(today, -70));
    expect(behind.nextDueOn).toBe(shiftDate(today, -30));
    // Historia cargada, anterior al último registro: no cumple ninguna fecha ni mueve la próxima.
    const history = await done(lab, { ...base, assetId: late.id, performedOn: shiftDate(today, -200) });
    expect(history.dueOn).toBeNull();
    expect(history.nextDueOn).toBe(shiftDate(today, -30));

    // Un «No conforme» cuenta como hecho; repetirlo antes de su próxima fecha no cumple otra.
    const failed = await done(lab, { ...base, assetId: redone.id, performedOn: shiftDate(today, -10), result: 'fail', observations: 'Fuera de tolerancia' });
    expect(failed.dueOn).toBe(today);
    const repeat = await done(lab, { ...base, assetId: redone.id, performedOn: shiftDate(today, -5) });
    expect(repeat.dueOn).toBeNull();

    // Sin plan no hay fecha que tocaba.
    const loose = await done(lab, { assetId: late.id, kind: 'cleaning', performedOn: today, result: 'pass' });
    expect(loose.dueOn).toBeNull();

    const indicators = await indicatorsOf(lab);
    expect(indicators.period).toEqual({ from: periodStart(today), to: today });
    expect(indicators.compliance).toEqual({ onTime: 2, late: 1, pending: 1 });
    expect(indicators.requirements).toEqual([{ requirement: 'ISO/IEC 17025 6.4.10', onTime: 2, late: 1, pending: 1 }]);
    // Atrasados: el pendiente de hace 30 días.
    expect(indicators.overdue).toBe(1);

    // Programado frente a realizado: 12 meses hasta el actual; los hechos y lo pendiente del periodo.
    expect(indicators.months).toHaveLength(12);
    expect(indicators.months.at(-1)!.month).toBe(today.slice(0, 7));
    const sum = (field: 'due' | 'done' | 'onTime') => indicators.months.reduce((total, month) => total + month[field], 0);
    expect(sum('done')).toBe(3);
    expect(sum('onTime')).toBe(2);
    // Pendientes: el de hace 30 días y, si cae en este mes, el próximo del repetido (dentro de 25 días).
    const sameMonth = shiftDate(today, 25).slice(0, 7) === today.slice(0, 7);
    expect(sum('due')).toBe(3 + 1 + (sameMonth ? 1 : 0));
  });

  it('al corregir, la fecha que tocaba se calcula sin el registro anulado', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const plan = await createPlan(lab, { assetTypeId: type.id, intervalCount: 30, intervalUnit: 'day', startsOn: '2025-01-01' });
    const first = await done(lab, { planId: plan.id, assetId: asset.id, performedOn: shiftDate(today, -50), result: 'pass' });
    const second = await done(lab, { planId: plan.id, assetId: asset.id, performedOn: shiftDate(today, -15), result: 'pass' });
    expect(first.dueOn).toBe(today);
    expect(second.dueOn).toBe(shiftDate(today, -20));

    const corrected = await call(lab.adminMember.subject, `${lab.maintenance}/records/${second.id}/correction`, {
      method: 'POST',
      body: {
        reason: 'Fecha equivocada',
        keepCertificate: false,
        record: { planId: plan.id, planVersion: 1, assetId: asset.id, performedOn: shiftDate(today, -18), result: 'pass' },
      },
      key: key(),
    });
    expect(corrected.status).toBe(201);
    expect(record.parse(corrected.body).dueOn).toBe(shiftDate(today, -20));
  });
});

describe('calibraciones vigentes y costos (M-01c)', () => {
  it('cuenta las calibraciones vigentes y el costo del periodo sin los anulados', async () => {
    const lab = await createMaintenanceLab();
    const today = await todayIn(lab);
    const type = await createType(lab);
    const calibrated = await createAsset(lab, { typeId: type.id });
    await createAsset(lab, { typeId: type.id });
    const plan = await createPlan(lab, { kind: 'calibration', assetTypeId: type.id, intervalCount: 1, intervalUnit: 'year' });

    await done(lab, { planId: plan.id, assetId: calibrated.id, performedOn: today, result: 'pass', cost: '100.50' });
    const repair = { assetId: calibrated.id, kind: 'corrective', performedOn: today, result: 'pass', observations: 'Cambio de rotor' };
    await done(lab, { ...repair, cost: '40' });
    const mistaken = await done(lab, { ...repair, cost: '999' });
    const voided = await call(lab.adminMember.subject, `${lab.maintenance}/records/${mistaken.id}/void`, {
      method: 'POST',
      body: { reason: 'Registro duplicado' },
      key: key(),
    });
    expect(voided.status).toBe(200);
    await done(lab, { assetId: calibrated.id, kind: 'cleaning', performedOn: today, result: 'pass' });
    // Antes del periodo: no cuenta.
    await done(lab, { assetId: calibrated.id, kind: 'preventive', performedOn: shiftDate(today, -400), result: 'pass', cost: '5' });

    const indicators = await indicatorsOf(lab);
    expect(indicators.calibrations).toEqual({ current: 1, total: 2 });
    expect(indicators.costs).toEqual({ preventive: '100.5', corrective: '40', withoutCost: 1 });
    // Sin requisito, el plan cuenta en el total pero no en la lista por requisito.
    expect(indicators.requirements).toEqual([]);
  });
});

describe('«Evaluar reemplazo» (M-01c)', () => {
  let lab: MaintenanceLab;
  let today: string;

  beforeAll(async () => {
    lab = await createMaintenanceLab();
    today = await todayIn(lab);
  });

  const reportFaults = async (assetId: string, times: number) => {
    for (let n = 0; n < times; n += 1) {
      const reported = await call(lab.teacher.subject, `${lab.base}/faults`, {
        method: 'POST',
        body: { assetId, faultType: 'mechanical', description: `Vibra ${n}`, usable: true },
        key: key(),
      });
      expect(reported.status).toBe(201);
    }
  };
  const repair = (assetId: string, cost: string) =>
    done(lab, { assetId, kind: 'corrective', performedOn: today, result: 'pass', observations: 'Cambio de rodamiento', cost });
  const dismiss = (subject: string, assetId: string, reason = 'Se cambia el próximo año') =>
    call(subject, `${lab.maintenance}/assets/${assetId}/replacement-review`, { method: 'POST', body: { reason }, key: key() });

  it('avisa por vida útil, por reparaciones o por incidentes, y dice cuál', async () => {
    const aged = await createAsset(lab, { acquiredOn: '2010-01-01', usefulLifeYears: 5 });
    const costly = await createAsset(lab, { replacementValue: '100' });
    const cheap = await createAsset(lab, { replacementValue: '100' });
    const faulty = await createAsset(lab);
    const calm = await createAsset(lab);
    await repair(costly.id, '60');
    await repair(cheap.id, '40');
    await reportFaults(faulty.id, 3);
    await reportFaults(calm.id, 2);

    const { replacement } = await indicatorsOf(lab);
    expect(replacement.map((entry) => entry.asset.id).sort()).toEqual([aged.id, costly.id, faulty.id].sort());
    expect(replacement.find((entry) => entry.asset.id === aged.id)).toMatchObject({
      usefulLifeEndedOn: '2015-01-01',
      repairs: null,
      faults: null,
    });
    expect(replacement.find((entry) => entry.asset.id === costly.id)).toMatchObject({
      usefulLifeEndedOn: null,
      repairs: { cost: '60', replacementValue: '100' },
      faults: null,
    });
    expect(replacement.find((entry) => entry.asset.id === faulty.id)).toMatchObject({ usefulLifeEndedOn: null, repairs: null, faults: 3 });

    // El aviso de Por hacer es del Administrador.
    expect((await summaryOf(lab, lab.adminMember.subject)).replacement).toBe(3);
    expect((await summaryOf(lab, lab.operator.subject)).replacement).toBeNull();
  });

  it('solo el Administrador lo descarta, con motivo, por 6 meses y una vez por día', async () => {
    const aged = await createAsset(lab, { acquiredOn: '2012-06-01', usefulLifeYears: 3 });
    expect((await indicatorsOf(lab)).replacement.some((entry) => entry.asset.id === aged.id)).toBe(true);

    expect((await dismiss(lab.operator.subject, aged.id)).status).toBe(403);
    expect((await dismiss(lab.adminMember.subject, aged.id, ' ')).status).toBe(400);
    expect((await dismiss(lab.adminMember.subject, '00000000-0000-4000-8000-000000000000')).status).toBe(404);

    const dismissed = await dismiss(lab.adminMember.subject, aged.id);
    expect(dismissed.status).toBe(201);
    const until = replacementDismissed.parse(dismissed.body).dismissedUntil;
    expect(until > shiftDate(today, 180) && until <= shiftDate(today, 185)).toBe(true);
    expect((await indicatorsOf(lab)).replacement.some((entry) => entry.asset.id === aged.id)).toBe(false);

    // Otra vez el mismo día: responde la misma fecha sin sumar otro descarte.
    const again = await dismiss(lab.adminMember.subject, aged.id, 'Otro motivo');
    expect(again.status).toBe(201);
    expect(replacementDismissed.parse(again.body).dismissedUntil).toBe(until);
    expect(await count('select count(*) as n from maintenance.replacement_reviews where asset_id = $1', [aged.id])).toBe(1);
  });
});

describe('acceso y tarjeta del Inicio (M-01c)', () => {
  it('Indicadores es de quien entra a Mantenimiento; la tarjeta muestra los atrasados en la píldora', async () => {
    const lab = await createMaintenanceLab();
    const today = await todayIn(lab);
    expect((await call(lab.teacher.subject, `${lab.maintenance}/indicators`)).status).toBe(403);

    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    await createAsset(lab);
    const plan = await createPlan(lab, { assetTypeId: type.id, intervalCount: 30, intervalUnit: 'day', startsOn: '2025-01-01' });
    // Hecho hace 40 días: lo que tocaba hace 10 días está atrasado. La limpieza de hoy llena el gráfico.
    await done(lab, { planId: plan.id, assetId: asset.id, performedOn: shiftDate(today, -40), result: 'pass' });
    await done(lab, { assetId: asset.id, kind: 'cleaning', performedOn: today, result: 'pass' });

    const cardOf = async (subject: string) => {
      const home = (await call(subject, `/workspaces/${lab.workspace.id}/home`)).body as {
        cards: Array<{ moduleCode: string; summary: Record<string, number> | null; trend: { points: unknown[] } | null }>;
      };
      return home.cards.find((card) => card.moduleCode === 'maintenance');
    };
    const card = await cardOf(lab.operator.subject);
    expect(card?.summary).toEqual({ pendingRequests: 1, next30: 0, uncovered: 1 });
    expect(card?.trend?.points).toHaveLength(30);
    expect(await cardOf(lab.teacher.subject)).toBeUndefined();
  });
});
