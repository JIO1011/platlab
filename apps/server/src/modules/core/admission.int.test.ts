import { afterAll, describe, expect, it } from 'vitest';
import { createPool } from '../../platform/db/pool.js';

/**
 * Admisión de dos ejes (02 §6, ADR 0009): todas las combinaciones de ambos ejes con las tres clases
 * de acción y con valores desconocidos, evaluadas por las funciones reales con el rol de runtime.
 * Las tablas esperadas se copian a mano de 02 §6; no se derivan de la implementación.
 */
const pool = createPool({
  connectionString:
    process.env['DATABASE_URL_API'] ??
    'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  max: 1,
});

afterAll(async () => {
  await pool.end();
});

const N = 'new_operation';
const R = 'resolve_pending';
const C = 'read_export';
const ALL = [N, R, C];

// Eje espacio (02 §6). La suspensión por seguridad solo admite una exportación por canal seguro,
// que no pasa por esta admisión.
const workspaceCases: Array<{ status: string | null; reason: string | null; allows: string[] }> = [
  { status: 'trial', reason: null, allows: ALL },
  { status: 'active', reason: null, allows: ALL },
  { status: 'suspended', reason: 'commercial', allows: [R, C] },
  { status: 'closing', reason: null, allows: [R, C] },
  { status: 'suspended', reason: 'security', allows: [] },
  { status: 'provisioning', reason: null, allows: [] },
  { status: 'terminated', reason: null, allows: [] },
  // Desconocidos o incoherentes: se deniegan.
  { status: 'suspended', reason: null, allows: [] },
  { status: 'archived', reason: null, allows: [] },
  { status: null, reason: null, allows: [] },
];

// Eje módulo, por estado operativo (02 §6).
const statusCases: Array<{ status: string | null; allows: string[] }> = [
  { status: 'enabled', allows: ALL },
  { status: 'draining', allows: [R, C] },
  { status: 'read_only', allows: [C] },
  { status: 'disabled', allows: [] },
  { status: 'paused', allows: [] },
  { status: null, allows: [] }, // sin derecho
];

// Eje módulo, por vigencia del derecho respecto del instante evaluado (02 §6).
const at = new Date('2026-06-15T12:00:00Z');
const day = 24 * 3600 * 1000;
const shift = (days: number) => new Date(at.getTime() + days * day).toISOString();
const dateCases: Array<{
  name: string;
  validFrom: string;
  validUntil: string | null;
  closingUntil: string | null;
  readUntil: string | null;
  allows: string[];
}> = [
  { name: 'todavía no vigente', validFrom: shift(1), validUntil: null, closingUntil: null, readUntil: null, allows: [] },
  { name: 'vigente desde este instante', validFrom: shift(0), validUntil: null, closingUntil: null, readUntil: null, allows: ALL },
  { name: 'vigente sin vencimiento', validFrom: shift(-10), validUntil: null, closingUntil: null, readUntil: null, allows: ALL },
  { name: 'vigente con vencimiento', validFrom: shift(-10), validUntil: shift(1), closingUntil: shift(2), readUntil: shift(3), allows: ALL },
  { name: 'vence en este instante, dentro del cierre', validFrom: shift(-10), validUntil: shift(0), closingUntil: shift(1), readUntil: shift(2), allows: [R, C] },
  { name: 'vencido dentro del periodo de cierre', validFrom: shift(-10), validUntil: shift(-1), closingUntil: shift(1), readUntil: shift(2), allows: [R, C] },
  { name: 'vencido fuera del cierre, con consulta', validFrom: shift(-10), validUntil: shift(-2), closingUntil: shift(-1), readUntil: shift(1), allows: [C] },
  { name: 'vencido sin cierre, con consulta', validFrom: shift(-10), validUntil: shift(-1), closingUntil: null, readUntil: shift(1), allows: [C] },
  { name: 'terminó el acceso pactado', validFrom: shift(-10), validUntil: shift(-3), closingUntil: shift(-2), readUntil: shift(-1), allows: [] },
  { name: 'vencido sin periodos pactados', validFrom: shift(-10), validUntil: shift(-1), closingUntil: null, readUntil: null, allows: [] },
];

// Etapa según tipo de contrato y ambiente (02 §6, «Etapas del módulo»; ADR 0009 del 01-10-2026).
const stageTable: Array<[stage: string, kind: string, dataClass: string, admitted: boolean]> = [
  ['development', 'demo', 'synthetic', true],
  ['development', 'pilot', 'synthetic', true],
  ['development', 'standard', 'synthetic', true],
  ['pilot', 'demo', 'synthetic', true],
  ['pilot', 'pilot', 'synthetic', true],
  ['pilot', 'standard', 'synthetic', true],
  ['general', 'demo', 'synthetic', true],
  ['general', 'pilot', 'synthetic', true],
  ['general', 'standard', 'synthetic', true],
  ['development', 'demo', 'real', false],
  ['development', 'pilot', 'real', false],
  ['development', 'standard', 'real', false],
  ['pilot', 'demo', 'real', false],
  ['pilot', 'pilot', 'real', true],
  ['pilot', 'standard', 'real', false],
  ['general', 'demo', 'real', false],
  ['general', 'pilot', 'real', true],
  ['general', 'standard', 'real', true],
];
const unknownStages = ['beta', null];
const unknownKinds = ['trial', null];
const unknownDataClasses = ['staging', null];

const actions: Array<string | null> = [N, R, C, 'export_all', null];

const intersect = (a: string[], b: string[]) => ALL.filter((c) => a.includes(c) && b.includes(c));

describe('core.stage_admitted', () => {
  it('admite cada etapa solo con el contrato y el ambiente que permite 02 §6', async () => {
    const cases = stageTable.map(([stage, kind, dataClass, admitted]) => ({ stage, kind, dataClass, admitted }));
    for (const stage of ['development', 'pilot', 'general', ...unknownStages]) {
      for (const kind of ['demo', 'pilot', 'standard', ...unknownKinds]) {
        for (const dataClass of ['synthetic', 'real', ...unknownDataClasses]) {
          const known = stageTable.some(([s, k, d]) => s === stage && k === kind && d === dataClass);
          if (!known) cases.push({ stage: stage as string, kind: kind as string, dataClass: dataClass as string, admitted: false });
        }
      }
    }
    const { rows } = await pool.query<{ i: number; admitted: boolean }>(
      `select x.i, core.stage_admitted(x.stage, x.kind, x.data_class) as admitted
         from jsonb_to_recordset($1::jsonb) as x (i int, stage text, kind text, data_class text)
        order by x.i`,
      [JSON.stringify(cases.map((c, i) => ({ i, stage: c.stage, kind: c.kind, data_class: c.dataClass })))],
    );
    expect(rows.map((row) => row.admitted)).toEqual(cases.map((c) => c.admitted));
    expect(rows).toHaveLength(5 * 5 * 4);
  });
});

describe('core.admission con los dos ejes', () => {
  it('admite solo lo que ambos ejes permiten, en todas las combinaciones', async () => {
    const cases: Array<Record<string, unknown> & { expected: string; i: number }> = [];
    for (const ws of workspaceCases) {
      for (const st of statusCases) {
        for (const dt of dateCases) {
          for (const stageAdmitted of [true, false]) {
            const moduleAllows = stageAdmitted ? intersect(st.allows, dt.allows) : [];
            for (const action of actions) {
              let expected: string;
              if (action === null || !ALL.includes(action) || ws.allows.length === 0) expected = 'denied';
              else if (moduleAllows.length === 0) expected = 'module_unavailable';
              else if (!ws.allows.includes(action)) expected = 'workspace_restricted';
              else if (!moduleAllows.includes(action)) expected = 'module_read_only';
              else expected = 'admitted';
              cases.push({
                i: cases.length,
                action,
                ws_status: ws.status,
                ws_reason: ws.reason,
                status: st.status,
                valid_from: st.status === null ? null : dt.validFrom,
                valid_until: dt.validUntil,
                closing_until: dt.closingUntil,
                read_until: dt.readUntil,
                // Etapa no admitida: development en un ambiente real.
                stage: 'development',
                kind: 'demo',
                data_class: stageAdmitted ? 'synthetic' : 'real',
                expected,
              });
            }
          }
        }
      }
    }

    const { rows } = await pool.query<{ i: number; decision: string }>(
      `select x.i,
              core.admission(
                x.action,
                core.workspace_axis(x.ws_status, x.ws_reason),
                core.module_axis(x.status, x.valid_from, x.valid_until, x.closing_until, x.read_until,
                                 x.stage, x.kind, x.data_class, $2::timestamptz)
              ) as decision
         from jsonb_to_recordset($1::jsonb) as x (
           i int, action text, ws_status text, ws_reason text, status text,
           valid_from timestamptz, valid_until timestamptz, closing_until timestamptz,
           read_until timestamptz, stage text, kind text, data_class text)
        order by x.i`,
      [JSON.stringify(cases), at.toISOString()],
    );

    const mismatches = rows
      .filter((row) => row.decision !== cases[row.i]!.expected)
      .map((row) => ({ ...cases[row.i], got: row.decision }));
    expect(mismatches).toEqual([]);
    expect(rows).toHaveLength(workspaceCases.length * statusCases.length * dateCases.length * 2 * actions.length);
  });

  it('cada eje por separado devuelve exactamente su tabla', async () => {
    const { rows: wsRows } = await pool.query<{ allows: string[] }>(
      `select core.workspace_axis(x.status, x.reason) as allows
         from jsonb_to_recordset($1::jsonb) as x (i int, status text, reason text)
        order by x.i`,
      [JSON.stringify(workspaceCases.map(({ status, reason }, i) => ({ i, status, reason })))],
    );
    expect(wsRows.map((row) => row.allows)).toEqual(workspaceCases.map((c) => c.allows));

    const { rows: moduleRows } = await pool.query<{ allows: string[] }>(
      `select core.module_axis(x.status, x.valid_from, x.valid_until, x.closing_until, x.read_until,
                               'general', 'standard', 'real', $2::timestamptz) as allows
         from jsonb_to_recordset($1::jsonb)
           as x (i int, status text, valid_from timestamptz, valid_until timestamptz,
                 closing_until timestamptz, read_until timestamptz)
        order by x.i`,
      [
        JSON.stringify(
          dateCases.map((dt, i) => ({
            i,
            status: 'enabled',
            valid_from: dt.validFrom,
            valid_until: dt.validUntil,
            closing_until: dt.closingUntil,
            read_until: dt.readUntil,
          })),
        ),
        at.toISOString(),
      ],
    );
    expect(moduleRows.map((row) => row.allows)).toEqual(dateCases.map((dt) => dt.allows));
  });
});
