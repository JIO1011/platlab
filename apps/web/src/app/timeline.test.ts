import { CirclePlus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { combineSources, newestFirst, type TimelineEntry } from './timeline';

const entry = (key: string, day: string, at: string | null = null): TimelineEntry => ({ key, day, at, icon: CirclePlus, title: key, details: null, actor: null });

describe('newestFirst', () => {
  it('ordena por día y, dentro del día, por hora; lo que solo tiene día va después de lo que tiene hora', () => {
    const entries = [
      entry('trabajo del 10', '2026-10-10'),
      entry('traslado del 10 a las 9', '2026-10-10', '2026-10-10T14:00:00.000Z'),
      entry('estado del 11', '2026-10-11', '2026-10-11T13:00:00.000Z'),
      entry('estado del 10 a las 17', '2026-10-10', '2026-10-10T22:00:00.000Z'),
      entry('trabajo del 9', '2026-10-09'),
    ];
    expect(newestFirst(entries).map((item) => item.key)).toEqual([
      'estado del 11',
      'estado del 10 a las 17',
      'traslado del 10 a las 9',
      'trabajo del 10',
      'trabajo del 9',
    ]);
  });
});

describe('combineSources', () => {
  const done = (entries: TimelineEntry[], hasMore = false) => ({ status: 'success' as const, entries, hasMore });

  it('sin fuentes, nada que esperar', () => {
    expect(combineSources([])).toEqual({ status: 'success', entries: [], hasMore: false });
  });

  it('reúne los hechos y avisa si alguna llegó al límite', () => {
    const a = entry('a', '2026-10-01');
    const b = entry('b', '2026-10-02');
    expect(combineSources([done([a]), done([b], true)])).toEqual({ status: 'success', entries: [a, b], hasMore: true });
  });

  it('carga mientras alguna cargue', () => {
    expect(combineSources([done([]), { status: 'pending' }])).toEqual({ status: 'pending' });
  });

  it('falla si alguna falla, y el reintento repite solo las que fallaron', () => {
    const first = vi.fn();
    const second = vi.fn();
    const failed = combineSources([
      { status: 'error', error: 'uno', retry: first },
      { status: 'pending' },
      { status: 'error', error: 'dos', retry: second },
    ]);
    expect(failed).toMatchObject({ status: 'error', error: 'uno' });
    if (failed.status === 'error') failed.retry();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});
