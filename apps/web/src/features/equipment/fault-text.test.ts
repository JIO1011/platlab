import type { Fault } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import {
  faultAgo,
  faultStatusLabel,
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
    expect(faultStatusLabel).toEqual({ open: 'Abierta', in_progress: 'En atención', resolved: 'Resuelta', closed: 'Cerrada' });
  });

  it('abierta es ámbar, en atención acento, resuelta verde y cerrada neutra', () => {
    expect(faultStatusTone).toEqual({ open: 'warning', in_progress: 'info', resolved: 'success', closed: 'neutral' });
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
  it('lee la vista de la URL y cae en «Abiertas» con cualquier otro valor', () => {
    expect(faultViewFrom('resueltas')).toBe('resueltas');
    expect(faultViewFrom('cerradas')).toBe('cerradas');
    expect(faultViewFrom('abiertas')).toBe('abiertas');
    expect(faultViewFrom(null)).toBe('abiertas');
    expect(faultViewFrom('todas')).toBe('abiertas');
  });

  it('«Abiertas» reúne las abiertas y las en atención', () => {
    expect(faultViews.find((view) => view.value === 'abiertas')?.statuses).toEqual(['open', 'in_progress']);
    expect(faultViews.find((view) => view.value === 'resueltas')?.statuses).toEqual(['resolved']);
    expect(faultViews.find((view) => view.value === 'cerradas')?.statuses).toEqual(['closed']);
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
  closedBy: null,
  closedAt: null,
};

describe('faultSteps', () => {
  it('una falla abierta solo tiene su reporte', () => {
    expect(faultSteps(base)).toEqual([{ key: 'reported', label: 'Reportada', by: 'Docente', at: base.reportedAt, note: null }]);
  });

  it('suma los pasos que ocurrieron, en orden, con el resultado en «Resuelta»', () => {
    const steps = faultSteps({
      ...base,
      status: 'closed',
      attendedBy: { name: 'Técnico' },
      attendedAt: '2026-10-11T09:00:00Z',
      resolution: 'Se cambió el fusible',
      resolvedBy: { name: 'Técnico' },
      resolvedAt: '2026-10-12T09:00:00Z',
      closedBy: null,
      closedAt: '2026-10-13T09:00:00Z',
    });
    expect(steps.map((step) => step.label)).toEqual(['Reportada', 'Atendida', 'Resuelta', 'Cerrada']);
    expect(steps[2]?.note).toBe('Se cambió el fusible');
    expect(steps[3]?.by).toBeNull();
  });
});

describe('pendingFaultsText', () => {
  it('a quien atiende, las fallas por atender; a quien reporta, las suyas abiertas', () => {
    expect(pendingFaultsText(1, true)).toBe('1 falla espera atención');
    expect(pendingFaultsText(3, true)).toBe('3 fallas esperan atención');
    expect(pendingFaultsText(1, false)).toBe('Tienes 1 reporte abierto');
    expect(pendingFaultsText(2, false)).toBe('Tienes 2 reportes abiertos');
  });
});
