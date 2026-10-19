import { describe, expect, it } from 'vitest';
import { formatDate } from '../../app/format';
import { calibrationStatus, calibrationText } from './calibration';

const today = '2026-10-19';
const calibration = (dueOn: string, lastPerformedOn: string | null, lastResult: 'pass' | 'pass_with_observations' | 'fail' | null = 'pass') => ({
  plan: { kind: 'calibration' },
  dueOn,
  lastPerformedOn,
  lastResult,
});
const preventive = { plan: { kind: 'preventive' }, dueOn: '2026-01-01', lastPerformedOn: null, lastResult: null };

describe('calibrationStatus', () => {
  it('sin plan de calibración no dice nada, aunque haya otros planes', () => {
    expect(calibrationStatus([], today)).toBeNull();
    expect(calibrationStatus([preventive], today)).toBeNull();
  });

  it('vigente hasta su fecha, también hoy', () => {
    expect(calibrationStatus([calibration('2027-03-01', '2026-03-01')], today)).toEqual({ state: 'current', until: '2027-03-01' });
    expect(calibrationStatus([calibration(today, '2025-10-19', 'pass_with_observations')], today)).toEqual({ state: 'current', until: today });
  });

  it('vencida desde el día siguiente a su fecha', () => {
    expect(calibrationStatus([calibration('2026-10-18', '2025-10-18')], today)).toEqual({ state: 'expired', since: '2026-10-18' });
  });

  it('el último registro No conforme la deja sin vigencia, aunque su fecha no haya vencido', () => {
    expect(calibrationStatus([calibration('2027-10-01', '2026-10-01', 'fail')], today)).toEqual({ state: 'failed' });
  });

  it('sin ningún registro: sin calibración registrada', () => {
    expect(calibrationStatus([calibration('2026-12-01', null, null)], today)).toEqual({ state: 'never' });
  });

  it('con varios planes manda el peor; si todos están vigentes, la fecha más cercana', () => {
    expect(calibrationStatus([calibration('2027-05-01', '2026-05-01'), calibration('2026-11-01', '2025-11-01')], today)).toEqual({
      state: 'current',
      until: '2026-11-01',
    });
    expect(calibrationStatus([calibration('2027-05-01', '2026-05-01'), calibration('2026-09-01', '2025-09-01')], today)).toEqual({
      state: 'expired',
      since: '2026-09-01',
    });
    expect(calibrationStatus([calibration('2026-09-01', '2025-09-01'), calibration('2027-05-01', '2026-05-01', 'fail')], today)).toEqual({
      state: 'failed',
    });
    expect(calibrationStatus([calibration('2026-09-01', '2025-09-01', 'fail'), calibration('2027-05-01', null, null)], today)).toEqual({
      state: 'never',
    });
  });
});

describe('calibrationText', () => {
  it('lo que no está vigente dice «no usar», en rojo', () => {
    expect(calibrationText({ state: 'never' }, today)).toEqual({ text: 'Sin calibración registrada: no usar', tone: 'danger' });
    expect(calibrationText({ state: 'failed' }, today)).toEqual({ text: 'Calibración no conforme: no usar', tone: 'danger' });
    expect(calibrationText({ state: 'expired', since: '2026-10-18' }, today)).toEqual({ text: 'Calibración vencida: no usar', tone: 'danger' });
  });

  it('vigente: ámbar en los últimos 30 días, verde antes', () => {
    expect(calibrationText({ state: 'current', until: '2026-11-18' }, today)).toEqual({
      text: `Calibrada hasta el ${formatDate('2026-11-18')}`,
      tone: 'warning',
    });
    expect(calibrationText({ state: 'current', until: '2026-11-19' }, today).tone).toBe('success');
  });
});
