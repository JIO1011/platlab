import { describe, expect, it } from 'vitest';
import {
  emptyMovementFilters,
  operationSearch,
  parseMovementFilters,
  serializeMovementFilters,
  toOperationQuery,
  type MovementFilters,
} from './movement-filters';

const A = 'da000000-0000-4000-8000-00000000000a';
const B = 'db000000-0000-4000-8000-00000000000b';
const parse = (search: string) => parseMovementFilters(new URLSearchParams(search));
const zone = 'America/Guayaquil';

describe('filtros de Movimientos en la URL (ADR 0014)', () => {
  it('el enlace del Resumen sigue abriendo las salidas de los últimos 30 días', () => {
    const filters = parse('tipo=salida&dias=30');
    expect(filters).toEqual({ ...emptyMovementFilters, types: ['issue'], period: { kind: 'days', days: 30 } });
    expect(toOperationQuery(filters, zone)).toEqual({ type: ['issue'], days: 30 });
  });

  it('lee varios valores por filtro, sin repetidos', () => {
    const filters = parse(
      `tipo=salida&tipo=ajuste&tipo=salida&reactivo=${A}&reactivo=${B}&responsable=${A}&destino=Laboratorio%201&motivo=Pr%C3%A1ctica&ubicacion=${B}`,
    );
    expect(filters).toMatchObject({
      types: ['issue', 'adjustment'],
      productIds: [A, B],
      responsibleIds: [A],
      destinations: ['Laboratorio 1'],
      reasons: ['Práctica'],
      locationIds: [B],
    });
  });

  it('ignora lo inválido sin romper la página', () => {
    const filters = parse(
      'tipo=baja&tipo=traslado&reactivo=no-es-uuid&responsable=&destino=%20%20&dias=0&vista=otra&agrupar=color&ubicacion=123',
    );
    expect(filters).toEqual({ ...emptyMovementFilters, types: ['transfer'] });
    expect(parse('dias=91').period).toEqual({ kind: 'all' });
    expect(parse('dias=7.5').period).toEqual({ kind: 'all' });
    expect(parse('periodo=semana').period).toEqual({ kind: 'all' });
    // Un rango al revés o con una fecha imposible no filtra; los días del enlace siguen valiendo.
    expect(parse('desde=2026-03-11&hasta=2026-03-10&dias=7').period).toEqual({ kind: 'days', days: 7 });
    expect(parse('desde=2026-02-30').period).toEqual({ kind: 'all' });
    expect(parse('tipo=__proto__').types).toEqual([]);
  });

  it('el periodo simbólico manda sobre las fechas, y las fechas sobre los días', () => {
    expect(parse('periodo=mes&desde=2026-01-01&dias=7').period).toEqual({ kind: 'month' });
    expect(parse('periodo=mes-anterior').period).toEqual({ kind: 'previous-month' });
    expect(parse('desde=2026-01-01&hasta=2026-01-31&dias=7').period).toEqual({
      kind: 'range',
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(parse('hasta=2026-01-31').period).toEqual({ kind: 'range', from: null, to: '2026-01-31' });
  });

  it('la vista y el agrupamiento viajan en la URL', () => {
    expect(parse('vista=totales&agrupar=mes')).toMatchObject({ view: 'totals', groupBy: 'month' });
    expect(parse('vista=totales')).toMatchObject({ view: 'totals', groupBy: 'product' });
  });

  it('escribir y leer devuelve los mismos filtros', () => {
    const cases: MovementFilters[] = [
      emptyMovementFilters,
      { ...emptyMovementFilters, types: ['receipt', 'transfer'], period: { kind: 'days', days: 30 } },
      {
        types: ['issue'],
        productIds: [A, B],
        responsibleIds: [B],
        destinations: ['Laboratorio 1', 'Aula 2'],
        reasons: ['Práctica'],
        locationIds: [A],
        period: { kind: 'range', from: '2026-01-01', to: null },
        view: 'totals',
        groupBy: 'destination',
      },
      { ...emptyMovementFilters, period: { kind: 'previous-month' }, groupBy: 'responsible' },
      { ...emptyMovementFilters, period: { kind: 'month' } },
    ];
    for (const filters of cases) expect(parseMovementFilters(serializeMovementFilters(filters))).toEqual(filters);
    // Lo que coincide con el valor por omisión no ensucia el enlace.
    expect(serializeMovementFilters(emptyMovementFilters).toString()).toBe('');
    expect(serializeMovementFilters({ ...emptyMovementFilters, types: ['issue'], period: { kind: 'days', days: 30 } }).toString()).toBe(
      'tipo=salida&dias=30',
    );
  });

  it('«Este mes» y «Mes anterior» se resuelven con el calendario de la zona del espacio', () => {
    // 1 de marzo a las 03:00 UTC: en Guayaquil (UTC−5) todavía es 28 de febrero.
    const now = new Date('2026-03-01T03:00:00Z');
    expect(toOperationQuery({ ...emptyMovementFilters, period: { kind: 'month' } }, zone, now)).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(toOperationQuery({ ...emptyMovementFilters, period: { kind: 'previous-month' } }, zone, now)).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(toOperationQuery({ ...emptyMovementFilters, period: { kind: 'month' } }, 'UTC', now)).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
    });
    // Enero menos un mes es diciembre del año anterior; los bisiestos tienen 29 de febrero.
    expect(
      toOperationQuery({ ...emptyMovementFilters, period: { kind: 'previous-month' } }, zone, new Date('2028-03-15T12:00:00Z')),
    ).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(
      toOperationQuery({ ...emptyMovementFilters, period: { kind: 'previous-month' } }, zone, new Date('2026-01-10T12:00:00Z')),
    ).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('la consulta a la API ordena los valores y repite los parámetros', () => {
    const query = toOperationQuery({ ...emptyMovementFilters, types: ['transfer', 'issue'], productIds: [B, A] }, zone);
    expect(query).toEqual({ type: ['issue', 'transfer'], productId: [A, B] });
    expect(operationSearch(query).toString()).toBe(`type=issue&type=transfer&productId=${A}&productId=${B}`);
    expect(operationSearch({ from: '2026-01-01', to: '2026-01-31' }).toString()).toBe('from=2026-01-01&to=2026-01-31');
    expect(operationSearch({}).toString()).toBe('');
  });
});
