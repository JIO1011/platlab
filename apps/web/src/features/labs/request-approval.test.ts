import { describe, expect, it } from 'vitest';
import { approvalSummary, approveBody, approvedMessage, isApprovable, programmedText } from './request-approval';

const scheduled = (code: string, complete = true, warnings: Array<'capacity'> = []) => ({
  activity: { code, complete } as never,
  warnings,
});

describe('aviso al aprobar', () => {
  it('une los códigos programados', () => {
    expect(programmedText(['P1-S11-QUI02'])).toBe('P1-S11-QUI02 programado');
    expect(programmedText(['P1-S11-QUI02', 'P1-S12-QUI01'])).toBe('P1-S11-QUI02 y P1-S12-QUI01 programados');
    expect(programmedText(['A', 'B', 'C'])).toBe('A, B y C programados');
    expect(programmedText([])).toBe('Aprobada');
  });

  it('agrega lo que solo avisa: el aforo y lo que falta apartar', () => {
    expect(approvedMessage([scheduled('A')])).toEqual({ title: 'A programado' });
    expect(approvedMessage([scheduled('A', false, ['capacity']), scheduled('B')])).toEqual({
      title: 'A y B programados',
      description: 'Supera el aforo del área. Falta apartar recursos',
    });
  });
});

describe('aprobar varias', () => {
  it('solo las enviadas se pueden aprobar y cada una va con su versión', () => {
    expect(isApprovable({ status: 'submitted' })).toBe(true);
    expect(isApprovable({ status: 'scheduled' })).toBe(false);
    expect(approveBody([{ id: 'r1', version: 3 }])).toEqual({ items: [{ requestId: 'r1', expectedVersion: 3 }] });
  });

  it('resume cada resultado con sus códigos o con el motivo del servidor', () => {
    const requests = [
      { id: 'r1', code: 'SOL-0001', title: 'Titulación' },
      { id: 'r2', code: 'SOL-0003', title: null },
    ];
    const summary = approvalSummary(
      [
        { requestId: 'r1', ok: true, codes: ['P1-S11-QUI02', 'P1-S12-QUI01'], message: null },
        { requestId: 'r2', ok: false, codes: [], message: 'No pidió laboratorio: prográmala arrastrando en el Cronograma.' },
        { requestId: 'r9', ok: false, codes: [], message: null },
      ],
      requests,
    );
    expect(summary.programmed).toBe(1);
    expect(summary.failed).toBe(2);
    expect(summary.lines.map((line) => [line.name, line.ok, line.text])).toEqual([
      ['SOL-0001 · Titulación', true, 'P1-S11-QUI02 y P1-S12-QUI01 programados'],
      ['SOL-0003', false, 'No pidió laboratorio: prográmala arrastrando en el Cronograma.'],
      ['Solicitud', false, 'No se pudo programar.'],
    ]);
  });
});
