import type { Fault } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import {
  faultAgo,
  faultStatusLabel,
  faultStatusOrder,
  faultStatusTone,
  faultSteps,
  faultTypeLabel,
  faultViewFrom,
  faultViews,
  pendingFaultsText,
  personText,
  usableText,
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
  it('lee la vista de la URL y cae en «En curso» con cualquier otro valor', () => {
    expect(faultViewFrom('solucionados')).toBe('solucionados');
    expect(faultViewFrom('en-curso')).toBe('en-curso');
    expect(faultViewFrom(null)).toBe('en-curso');
    expect(faultViewFrom('cerradas')).toBe('en-curso');
  });

  it('«En curso» reúne los reportados y los en reparación', () => {
    expect(faultViews.find((view) => view.value === 'en-curso')?.statuses).toEqual(['open', 'in_progress']);
    expect(faultViews.find((view) => view.value === 'solucionados')?.statuses).toEqual(['resolved']);
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
