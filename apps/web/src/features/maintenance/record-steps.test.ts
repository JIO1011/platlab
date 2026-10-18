import type { RecordCreated } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { recordOutcome, saveStep, type SaveEvent, type SaveState } from './record-steps';

const record = { id: 'r1', plan: { id: 'p1', title: 'Calibración', kind: 'calibration' }, nextDueOn: '2027-10-17' } as unknown as RecordCreated;
const run = (events: SaveEvent[], from: SaveState = { step: 'idle' }) => events.reduce(saveStep, from);

describe('saveStep', () => {
  it('sin PDF: guardar y listo', () => {
    expect(run([{ type: 'submit' }, { type: 'recorded', record, withCertificate: false }])).toEqual({ step: 'done', record });
  });

  it('con PDF: guardar, adjuntar y listo', () => {
    const attaching = run([{ type: 'submit' }, { type: 'recorded', record, withCertificate: true }]);
    expect(attaching).toEqual({ step: 'attaching', record });
    expect(saveStep(attaching, { type: 'attached' })).toEqual({ step: 'done', record });
  });

  it('si el adjunto falla, el registro se conserva y solo se reintenta el adjunto', () => {
    const error = new Error('red');
    const failed = run([{ type: 'submit' }, { type: 'recorded', record, withCertificate: true }, { type: 'attachFailed', error }]);
    expect(failed).toEqual({ step: 'attachFailed', record, error });
    // Volver a enviar el formulario no registra otra vez: solo el reintento del adjunto avanza.
    expect(saveStep(failed, { type: 'submit' })).toBe(failed);
    expect(run([{ type: 'retryAttach' }, { type: 'attached' }], failed)).toEqual({ step: 'done', record });
  });

  it('si el registro falla, vuelve al formulario', () => {
    expect(run([{ type: 'submit' }, { type: 'recordFailed' }])).toEqual({ step: 'idle' });
  });

  it('ignora lo que no corresponde al paso: doble envío y respuestas tardías', () => {
    const saving = run([{ type: 'submit' }]);
    expect(saveStep(saving, { type: 'submit' })).toBe(saving);
    expect(saveStep(saving, { type: 'attached' })).toBe(saving);
    const done = run([{ type: 'recorded', record, withCertificate: false }], saving);
    expect(saveStep(done, { type: 'recordFailed' })).toBe(done);
    expect(saveStep(done, { type: 'retryAttach' })).toBe(done);
    expect(saveStep({ step: 'idle' }, { type: 'recorded', record, withCertificate: false })).toEqual({ step: 'idle' });
  });
});

describe('recordOutcome', () => {
  it('con plan y fecha nueva, la dice', () => {
    expect(recordOutcome(record, '2026-10-17')).toEqual({ kind: 'next', text: expect.stringContaining('Próximo') });
  });

  it('un registro histórico que no mueve la fecha lo dice', () => {
    expect(recordOutcome(record, '2027-10-17').kind).toBe('history');
  });

  it('sin plan no habla de fechas', () => {
    expect(recordOutcome({ plan: null, nextDueOn: null }, null)).toEqual({ kind: 'noPlan', text: 'Mantenimiento registrado sin plan.' });
  });
});
