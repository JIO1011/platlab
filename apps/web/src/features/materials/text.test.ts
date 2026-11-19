import { describe, expect, it } from 'vitest';
import { byExpiry, dueStatus, dueText, expiryStatus, lentOut, locationLabels, materialLevel, materialStatus, normalizeQuantity } from './text';

describe('expiryStatus', () => {
  it('pinta el semáforo con los cortes de 90 y 180 días', () => {
    expect(expiryStatus(null, '2026-11-18')).toBeNull();
    expect(expiryStatus('2026-11-08', '2026-11-18')).toEqual({ tone: 'danger', label: 'Vencido hace 10 días' });
    expect(expiryStatus('2026-11-18', '2026-11-18')).toEqual({ tone: 'danger', label: 'Vence hoy' });
    expect(expiryStatus('2027-02-16', '2026-11-18')?.tone).toBe('warning');
    expect(expiryStatus('2027-04-01', '2026-11-18')?.tone).toBe('accent');
    expect(expiryStatus('2028-01-01', '2026-11-18')?.tone).toBe('neutral');
  });
});

describe('byExpiry', () => {
  it('ordena primero lo que vence antes y deja lo que no vence al final', () => {
    const lines = [
      { expiresOn: null, locationPath: ['A'] },
      { expiresOn: '2027-05-01', locationPath: ['B'] },
      { expiresOn: '2027-01-01', locationPath: ['C'] },
    ];
    expect(byExpiry(lines).map((line) => line.locationPath[0])).toEqual(['C', 'B', 'A']);
  });
});

describe('materialStatus', () => {
  it('distingue agotado, todo prestado, bajo mínimo y disponible', () => {
    expect(materialStatus({ balance: '0', available: '0', belowMinimum: true })).toEqual({ tone: 'danger', label: 'Agotado' });
    expect(materialStatus({ balance: '12', available: '0', belowMinimum: false })).toEqual({ tone: 'warning', label: 'Todo prestado' });
    expect(materialStatus({ balance: '3', available: '3', belowMinimum: true })).toEqual({ tone: 'warning', label: 'Bajo mínimo' });
    expect(materialStatus({ balance: '12', available: '4', belowMinimum: false })).toEqual({ tone: 'success', label: 'Disponible' });
  });
});

describe('lentOut', () => {
  it('resta exacto lo disponible de la existencia', () => {
    expect(lentOut('10', '6')).toBe('4');
    expect(lentOut('0.3', '0.1')).toBe('0.2');
    expect(lentOut('5', '5')).toBe('0');
  });
});

describe('dueText', () => {
  it('dice la fecha prevista, la falta de plazo y el cierre', () => {
    expect(dueText({ dueOn: null, status: 'open', closedAt: null })).toBe('Sin fecha de devolución');
    expect(dueText({ dueOn: '2026-11-20', status: 'open', closedAt: null })).toMatch(/^Vence el /);
    expect(dueText({ dueOn: '2026-11-20', status: 'closed', closedAt: '2026-11-21T10:00:00-05:00' })).toMatch(/^Cerrado el /);
  });

  it('cuenta las líneas por devolver', () => {
  });
});

describe('locationLabels', () => {
  it('arma la ruta bajo la sede y deja la sede fuera', () => {
    const labels = locationLabels([
      { id: 's', name: 'Sede Norte', kind: 'site', parentId: null },
      { id: 'a', name: 'Laboratorio 1', kind: 'room', parentId: 's' },
      { id: 'e', name: 'Estante A', kind: 'storage', parentId: 'a' },
    ]);
    expect(labels.get('e')).toBe('Laboratorio 1 › Estante A');
    expect(labels.get('a')).toBe('Laboratorio 1');
    expect(labels.get('s')).toBe('Sede Norte');
  });
});

describe('normalizeQuantity', () => {
  it('acepta coma decimal y quita espacios', () => {
    expect(normalizeQuantity(' 2,5 ')).toBe('2.5');
    expect(normalizeQuantity('10')).toBe('10');
  });
});

describe('dueStatus', () => {
  const open = { status: 'open' as const, closedAt: null, overdue: false };
  it('avisa el atraso en rojo con los días', () => {
    expect(dueStatus({ ...open, dueOn: '2026-11-16', overdue: true }, '2026-11-19')).toMatchObject({ tone: 'danger', headline: 'Atrasado 3 días' });
  });
  it('pone en ámbar lo que vence en 3 días o menos y en el acento lo demás', () => {
    expect(dueStatus({ ...open, dueOn: '2026-11-19' }, '2026-11-19')).toMatchObject({ tone: 'warning', headline: 'Vence hoy' });
    expect(dueStatus({ ...open, dueOn: '2026-11-20' }, '2026-11-19')).toMatchObject({ tone: 'warning', headline: 'Vence mañana' });
    expect(dueStatus({ ...open, dueOn: '2026-11-24' }, '2026-11-19')).toMatchObject({ tone: 'accent', headline: 'Vence en 5 días' });
  });
  it('un vale cerrado está devuelto y uno sin fecha no vence', () => {
    expect(dueStatus({ status: 'closed', closedAt: '2026-11-04T10:00:00Z', overdue: false, dueOn: '2026-11-01' }, '2026-11-19').tone).toBe('success');
    expect(dueStatus({ ...open, dueOn: null }, '2026-11-19').headline).toBe('Sin plazo');
  });
});

describe('materialLevel', () => {
  it('mide el insumo contra el doble de su mínimo', () => {
    expect(materialLevel({ class: 'consumable', balance: '60', available: '60', minimum: '100', baseUnit: 'u' })).toMatchObject({ percent: 30, note: 'Mínimo 100 u' });
    expect(materialLevel({ class: 'consumable', balance: '60', available: '60', minimum: null, baseUnit: 'u' })).toMatchObject({ percent: null, note: 'Sin mínimo definido' });
  });
  it('mide el reutilizable por lo que hay en el estante', () => {
    expect(materialLevel({ class: 'reusable_counted', balance: '38', available: '26', minimum: null, baseUnit: 'u' })).toMatchObject({ percent: 68, note: '12 u en préstamo' });
  });
});
