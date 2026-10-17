import type { Fault } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import {
  durationText,
  faultAgo,
  faultStatusLabel,
  faultStatusOrder,
  faultStatusTone,
  faultStepParts,
  faultSteps,
  faultTypeLabel,
  faultViewFrom,
  faultViews,
  outOfServiceText,
  pendingFaultsText,
  personText,
  usableText,
  warrantyNotice,
} from './fault-text';

const now = Date.parse('2026-10-15T12:00:00Z');
const before = (ms: number) => new Date(now - ms).toISOString();
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('etiquetas y tonos', () => {
  it('nombra cada tipo y cada estado con texto', () => {
    expect(faultTypeLabel).toEqual({ electrical: 'Eléctrica', mechanical: 'Mecánica', spare_part: 'Requiere repuesto', other: 'Otra' });
    expect(faultStatusLabel).toEqual({ open: 'Reportado', in_progress: 'En reparación', resolved: 'Solucionado' });
  });

  it('reportado es rojo, en reparación ámbar y solucionado verde', () => {
    expect(faultStatusTone).toEqual({ open: 'danger', in_progress: 'warning', resolved: 'success' });
  });

  it('los tres pasos van en orden', () => {
    expect(faultStatusOrder).toEqual(['open', 'in_progress', 'resolved']);
  });

  it('dice si el equipo se puede usar', () => {
    expect(usableText(true)).toBe('Se puede usar');
    expect(usableText(false)).toBe('No se puede usar');
  });

  it('un miembro que ya no está se nombra', () => {
    expect(personText({ name: 'Ana' })).toBe('Ana');
    expect(personText(null)).toBe('Miembro anterior');
  });
});

describe('faultViewFrom', () => {
  it('lee la pestaña de la URL y cae en «Reportados» con cualquier otro valor', () => {
    expect(faultViewFrom('solucionados')).toBe('solucionados');
    expect(faultViewFrom('en-reparacion')).toBe('en-reparacion');
    expect(faultViewFrom(null)).toBe('reportados');
    expect(faultViewFrom('en-curso')).toBe('reportados');
  });

  it('hay una pestaña por paso, en orden, con su cifra', () => {
    expect(faultViews.map((view) => [view.value, view.label, view.status, view.count])).toEqual([
      ['reportados', 'Reportados', 'open', 'open'],
      ['en-reparacion', 'En reparación', 'in_progress', 'inProgress'],
      ['solucionados', 'Solucionados', 'resolved', 'resolved'],
    ]);
  });
});

describe('faultAgo', () => {
  it('hace un momento hasta los 45 segundos, y no hay tiempos negativos', () => {
    expect(faultAgo(before(0), now)).toBe('hace un momento');
    expect(faultAgo(before(44 * SECOND), now)).toBe('hace un momento');
    expect(faultAgo(new Date(now + HOUR).toISOString(), now)).toBe('hace un momento');
  });

  it('minutos y horas', () => {
    expect(faultAgo(before(45 * SECOND), now)).toBe('hace 1 min');
    expect(faultAgo(before(5 * MINUTE), now)).toBe('hace 5 min');
    expect(faultAgo(before(59 * MINUTE), now)).toBe('hace 59 min');
    expect(faultAgo(before(60 * MINUTE), now)).toBe('hace 1 h');
    expect(faultAgo(before(3 * HOUR), now)).toBe('hace 3 h');
  });

  it('días, con singular y plural', () => {
    expect(faultAgo(before(24 * HOUR), now)).toBe('hace 1 día');
    expect(faultAgo(before(36 * HOUR), now)).toBe('hace 2 días');
    expect(faultAgo(before(29 * DAY), now)).toBe('hace 29 días');
  });

  it('meses y años', () => {
    expect(faultAgo(before(30 * DAY), now)).toBe('hace 1 mes');
    expect(faultAgo(before(90 * DAY), now)).toBe('hace 3 meses');
    expect(faultAgo(before(364 * DAY), now)).toBe('hace 1 año');
    expect(faultAgo(before(800 * DAY), now)).toBe('hace 2 años');
  });
});

const base: Fault = {
  id: '11111111-1111-4111-8111-111111111111',
  asset: { id: '22222222-2222-4222-8222-222222222222', code: 'EQ-001', name: 'Microscopio', photoUrl: null, location: { name: 'Lab 1', path: ['Lab 1'] } },
  faultType: 'electrical',
  description: 'No enciende',
  usable: false,
  status: 'open',
  reportedBy: { name: 'Docente' },
  reportedAt: '2026-10-10T14:00:00Z',
  attendedBy: null,
  attendedAt: null,
  resolution: null,
  resolvedBy: null,
  resolvedAt: null,
  warranty: null,
};

describe('faultSteps', () => {
  it('un incidente abierto solo tiene su reporte', () => {
    expect(faultSteps(base)).toEqual([{ key: 'reported', label: 'Reportado', by: 'Docente', at: base.reportedAt, note: null }]);
  });

  it('suma los pasos que ocurrieron, en orden, con qué se hizo en «Solucionado»', () => {
    const steps = faultSteps({
      ...base,
      status: 'resolved',
      attendedBy: { name: 'Técnico' },
      attendedAt: '2026-10-11T09:00:00Z',
      resolution: 'Se cambió el fusible',
      resolvedBy: null,
      resolvedAt: '2026-10-12T09:00:00Z',
    });
    expect(steps.map((step) => step.label)).toEqual(['Reportado', 'En reparación', 'Solucionado']);
    expect(steps[2]?.note).toBe('Se cambió el fusible');
    expect(steps[2]?.by).toBeNull();
  });
});

describe('pendingFaultsText', () => {
  it('a quien atiende, los incidentes por atender; a quien reporta, los suyos abiertos', () => {
    expect(pendingFaultsText(1, true)).toBe('1 incidente espera atención');
    expect(pendingFaultsText(3, true)).toBe('3 incidentes esperan atención');
    expect(pendingFaultsText(1, false)).toBe('Tienes 1 incidente abierto');
    expect(pendingFaultsText(2, false)).toBe('Tienes 2 incidentes abiertos');
  });
});

describe('durationText', () => {
  it('dice minutos y horas sin decimales', () => {
    expect(durationText(20)).toBe('menos de 1 min');
    expect(durationText(45 * 60)).toBe('45 min');
    expect(durationText(59 * 60 + 40)).toBe('1 h');
    expect(durationText(5 * 3600)).toBe('5 h');
    expect(durationText(23 * 3600 + 20 * 60)).toBe('23 h');
  });

  it('dice días con un decimal hasta 10 y enteros desde ahí', () => {
    expect(durationText(24 * 3600)).toBe('1 día');
    expect(durationText(2.5 * 86_400)).toBe('2,5 días');
    expect(durationText(3 * 86_400 + 60)).toBe('3 días');
    expect(durationText(9.96 * 86_400)).toBe('10 días');
    expect(durationText(31.4 * 86_400)).toBe('31 días');
    expect(durationText(1250 * 86_400)).toBe('1.250 días');
  });
});

describe('outOfServiceText', () => {
  it('suma los días y dice en cuántos equipos, con 1 en singular', () => {
    expect(outOfServiceText({ seconds: 31.4 * 86_400, assets: 4 })).toBe('31 días · en 4 equipos');
    expect(outOfServiceText({ seconds: 5 * 3600, assets: 1 })).toBe('5 h · en 1 equipo');
  });

  it('sin equipos fuera de servicio dice «Ninguno»', () => {
    expect(outOfServiceText({ seconds: 0, assets: 0 })).toBe('Ninguno');
  });
});

describe('faultStepParts', () => {
  const base = {
    reportedAt: before(2 * HOUR),
    reportedBy: { name: 'Ana' },
    attendedAt: null,
    attendedBy: null,
    resolvedAt: null,
    resolvedBy: null,
  };

  it('reportado: cuándo y quién lo reportó', () => {
    expect(faultStepParts({ ...base, status: 'open' } as Fault, now)).toEqual({ when: 'Reportado hace 2 h', who: 'Ana' });
  });

  it('en reparación: desde cuándo y quién la lleva; un miembro que ya no está se nombra', () => {
    const repairing = { ...base, status: 'in_progress', attendedAt: before(DAY), attendedBy: null } as Fault;
    expect(faultStepParts(repairing, now)).toEqual({ when: 'En reparación desde hace 1 día', who: 'Miembro anterior' });
  });

  it('solucionado: cuánto tardó desde el reporte, cuándo se solucionó y quién lo hizo', () => {
    const solved = { ...base, status: 'resolved', reportedAt: before(5 * DAY), resolvedAt: before(2 * DAY), resolvedBy: { name: 'Óscar' } } as Fault;
    expect(faultStepParts(solved, now)).toEqual({ when: 'Solucionado en 3 días · hace 2 días', who: 'Óscar' });
  });
});

describe('warrantyNotice', () => {
  it('dice hasta cuándo vale la garantía y a qué proveedor reclamar', () => {
    expect(warrantyNotice({ until: '2027-03-15', supplier: 'Labtech Ecuador', documentUrl: null })).toEqual({
      lead: 'Falla dentro de la garantía, vigente hasta 15 mar 2027.',
      claim: 'Reclama al proveedor: Labtech Ecuador.',
    });
  });

  it('sin proveedor, solo dice que se reclame', () => {
    expect(warrantyNotice({ until: '2027-03-15', supplier: null, documentUrl: 'https://x.test/g.pdf' })).toEqual({
      lead: 'Falla dentro de la garantía, vigente hasta 15 mar 2027.',
      claim: 'Reclama al proveedor.',
    });
  });
});
