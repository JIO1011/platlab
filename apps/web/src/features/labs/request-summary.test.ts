import type { RequestSummary } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { formatDate } from '../../app/format';
import { exceptionsText, filterInbox, firstDateText, groupMine, inboxCounts, initialInboxFilter, practiceCodeLabel, practiceCodeText, searchInbox, whenText } from './request-summary';

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
  scheduledCount: 0,
  dates: [],
  scheduledDates: [],
  blockCodes: [],
  startsAt: null,
  endsAt: null,
  participants: null,
  subject: null,
  group: null,
  areaId: null,
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

describe('practiceCodeText', () => {
  it('sin bloques no dice nada', () => {
    expect(practiceCodeText([])).toBeNull();
  });

  it('con un bloque dice su código y nada más', () => {
    expect(practiceCodeText(['P1-S11-FIS01'])).toEqual({ code: 'P1-S11-FIS01', more: null });
  });

  it('con varios dice el primero y cuántos más hay', () => {
    expect(practiceCodeText(['P1-S11-FIS01', 'P1-S12-FIS01', 'P1-S13-FIS01'])).toEqual({ code: 'P1-S11-FIS01', more: '+2' });
  });
});

describe('practiceCodeLabel', () => {
  it('sin bloques no hay texto: la planilla deja su aviso', () => {
    expect(practiceCodeLabel([])).toBeNull();
  });

  it('con un bloque es su código', () => {
    expect(practiceCodeLabel(['P1-S11-FIS01'])).toBe('P1-S11-FIS01');
  });

  it('con varios dice lo mismo que la lista: el primero y cuántos más', () => {
    expect(practiceCodeLabel(['P1-S11-QUI01', 'P1-S12-QUI01'])).toBe('P1-S11-QUI01 +1');
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
    expect(inboxCounts(items)).toEqual({ all: 6, submitted: 4, late: 2, resources: 2, changes: 1 });
    expect(inboxCounts([])).toEqual({ all: 0, submitted: 0, late: 0, resources: 0, changes: 0 });
  });
});

describe('initialInboxFilter', () => {
  it('abre en «Por revisar» si alguna espera respuesta', () => {
    expect(initialInboxFilter([summary(2, 'scheduled'), summary(1, 'submitted')])).toBe('submitted');
  });

  it('sin ninguna por revisar, abre en «Todas»', () => {
    expect(initialInboxFilter([summary(2, 'scheduled'), summary(1, 'changes_requested')])).toBe('all');
    expect(initialInboxFilter([])).toBe('all');
  });
});

describe('searchInbox', () => {
  const items = [
    summary(3, 'submitted', { title: 'Destilación simple', requesterName: 'Diego Docente' }),
    summary(2, 'submitted', { title: 'Medición de densidad', requesterName: 'Ángela Núñez' }),
    summary(1, 'scheduled', { title: null, requesterName: 'Ana Paz' }),
  ];
  const numbers = (query: string) => searchInbox(items, query).map((item) => item.number);

  it('sin nada escrito deja todas, en el mismo orden', () => {
    expect(numbers('')).toEqual([3, 2, 1]);
    expect(numbers('   ')).toEqual([3, 2, 1]);
  });

  it('busca en el título sin distinguir mayúsculas ni tildes', () => {
    expect(numbers('DESTILACION')).toEqual([3]);
    expect(numbers('medición')).toEqual([2]);
  });

  it('busca en el solicitante sin distinguir mayúsculas ni tildes', () => {
    expect(numbers('angela nunez')).toEqual([2]);
    expect(numbers('ÁNGELA')).toEqual([2]);
    expect(numbers('docente')).toEqual([3]);
  });

  it('busca en el código, incluso a medias', () => {
    expect(numbers('sol-0002')).toEqual([2]);
    expect(numbers('000')).toEqual([3, 2, 1]);
  });

  it('una solicitud sin título solo se encuentra por su código o su solicitante', () => {
    expect(numbers('ana paz')).toEqual([1]);
  });

  it('sin coincidencias no devuelve nada', () => {
    expect(numbers('zzz')).toEqual([]);
  });
});

describe('whenText', () => {
  it('sin fecha ni horario lo dice y no suma nada', () => {
    expect(whenText({ firstDate: null, dateCount: 0, startsAt: null, endsAt: null })).toEqual({ date: 'Sin fecha', time: null, more: null });
  });

  it('una fecha lleva su horario y nada más', () => {
    expect(whenText({ firstDate: '2026-11-05', dateCount: 1, startsAt: '08:00', endsAt: '10:00' })).toEqual({ date: formatDate('2026-11-05'), time: '08:00–10:00', more: null });
  });

  it('con más fechas cuenta las demás, en singular y plural', () => {
    expect(whenText({ firstDate: '2026-11-05', dateCount: 2, startsAt: null, endsAt: null }).more).toBe('+1 fecha');
    expect(whenText({ firstDate: '2026-11-05', dateCount: 4, startsAt: null, endsAt: null }).more).toBe('+3 fechas');
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
