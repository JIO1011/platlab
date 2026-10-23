import type { RequestSummary } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { formatDate } from '../../app/format';
import { exceptionsText, filterInbox, firstDateText, groupMine, inboxCounts } from './request-summary';

const summary = (number: number, status: RequestSummary['status'], extra: Partial<RequestSummary> = {}): RequestSummary => ({
  id: `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
  number,
  code: `SOL-${String(number).padStart(4, '0')}`,
  status,
  formName: 'Práctica académica',
  title: null,
  requesterName: 'Ana Paz',
  firstDate: null,
  dateCount: 0,
  late: false,
  exceptions: 0,
  submittedAt: null,
  version: 1,
  ...extra,
});

describe('firstDateText', () => {
  it('sin fechas lo dice', () => {
    expect(firstDateText({ firstDate: null, dateCount: 0 })).toBe('Sin fecha');
  });

  it('una sola fecha va sola y con varias se cuentan las demás', () => {
    expect(firstDateText({ firstDate: '2026-11-02', dateCount: 1 })).toBe(formatDate('2026-11-02'));
    expect(firstDateText({ firstDate: '2026-11-02', dateCount: 3 })).toBe(`${formatDate('2026-11-02')} (+2 más)`);
  });
});

describe('exceptionsText', () => {
  it('sin recursos por revisar no dice nada', () => {
    expect(exceptionsText(0)).toBeNull();
  });

  it('concuerda en singular y plural', () => {
    expect(exceptionsText(1)).toBe('1 recurso por revisar');
    expect(exceptionsText(4)).toBe('4 recursos por revisar');
  });
});

describe('filterInbox', () => {
  const items = [summary(4, 'changes_requested'), summary(3, 'submitted'), summary(2, 'rejected'), summary(1, 'submitted')];

  it('«Enviadas» deja las que esperan respuesta, en el orden del servidor', () => {
    expect(filterInbox(items, 'submitted').map((item) => item.number)).toEqual([3, 1]);
  });

  it('«Todas» las deja todas, en el mismo orden', () => {
    expect(filterInbox(items, 'all').map((item) => item.number)).toEqual([4, 3, 2, 1]);
  });

  it('sin recibidas, no hay nada que filtrar', () => {
    expect(filterInbox([], 'submitted')).toEqual([]);
  });
});

describe('filtros de las cifras de Recibidas', () => {
  const items = [
    summary(6, 'changes_requested', { late: true, exceptions: 2 }),
    summary(5, 'submitted', { late: true, exceptions: 1 }),
    summary(4, 'submitted', { late: true }),
    summary(3, 'submitted', { exceptions: 3 }),
    summary(2, 'rejected', { late: true }),
    summary(1, 'submitted'),
  ];

  it('fuera de plazo y recursos solo cuentan mientras esperan respuesta', () => {
    expect(filterInbox(items, 'late').map((item) => item.number)).toEqual([5, 4]);
    expect(filterInbox(items, 'resources').map((item) => item.number)).toEqual([5, 3]);
  });

  it('«cambios» deja las que esperan al solicitante', () => {
    expect(filterInbox(items, 'changes').map((item) => item.number)).toEqual([6]);
  });

  it('cada cifra coincide con la lista de su filtro', () => {
    expect(inboxCounts(items)).toEqual({ submitted: 4, late: 2, resources: 2, changes: 1 });
    expect(inboxCounts([])).toEqual({ submitted: 0, late: 0, resources: 0, changes: 0 });
  });
});

describe('groupMine', () => {
  it('agrupa por lo que la persona debe hacer, sin cambiar el orden', () => {
    const groups = groupMine([
      summary(6, 'cancelled'),
      summary(5, 'draft'),
      summary(4, 'changes_requested'),
      summary(3, 'submitted'),
      summary(2, 'draft'),
      summary(1, 'rejected'),
    ]);
    expect(groups.attention.map((item) => item.number)).toEqual([4]);
    expect(groups.drafts.map((item) => item.number)).toEqual([5, 2]);
    expect(groups.sent.map((item) => item.number)).toEqual([3]);
    expect(groups.closed.map((item) => item.number)).toEqual([6, 1]);
  });
});
