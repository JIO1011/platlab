import type { RequestSummary } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { formatDate } from '../../app/format';
import { exceptionsText, filterInbox, firstDateText } from './request-summary';

const summary = (number: number, status: RequestSummary['status']): RequestSummary => ({
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
