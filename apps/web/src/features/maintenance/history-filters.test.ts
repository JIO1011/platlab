import { describe, expect, it } from 'vitest';
import { emptyHistoryFilters, historyApiSearch, historySearch, isHistoryFiltered, parseHistoryFilters } from './history-filters';

const asset = '0b8f6a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const area = '1c9a7b4f-2d3e-4f5a-9b8c-1d2e3f4a5b6c';
const provider = '2dab8c5a-3e4f-4a6b-8c9d-2e3f4a5b6c7d';
const parse = (search: string) => parseHistoryFilters(new URLSearchParams(search));

describe('parseHistoryFilters', () => {
  it('lee la URL en español, con varios valores por filtro', () => {
    expect(
      parse(
        `equipo=${asset}&tipo=calibracion&tipo=limpieza&resultado=no-conforme&area=${area}&proveedor=interno&proveedor=${provider}&desde=2026-01-01&hasta=2026-06-30`,
      ),
    ).toEqual({
      assetId: asset,
      kinds: ['calibration', 'cleaning'],
      results: ['fail'],
      areas: [area],
      providers: ['internal', provider],
      from: '2026-01-01',
      to: '2026-06-30',
    });
  });

  it('ignora lo inválido y lo repetido: un enlace viejo nunca rompe', () => {
    expect(parse('equipo=abc&tipo=reparacion&tipo=limpieza&tipo=limpieza&resultado=perfecto&area=1&proveedor=nadie&desde=2026-13-01')).toEqual({
      ...emptyHistoryFilters,
      kinds: ['cleaning'],
    });
  });

  it('un periodo al revés se descarta entero; un extremo solo vale', () => {
    expect(parse('desde=2026-06-30&hasta=2026-01-01')).toMatchObject({ from: null, to: null });
    expect(parse('desde=2026-06-30')).toMatchObject({ from: '2026-06-30', to: null });
    expect(parse('hasta=2026-06-30')).toMatchObject({ from: null, to: '2026-06-30' });
  });
});

describe('historySearch', () => {
  it('vuelve a la misma URL que lee', () => {
    const search = `equipo=${asset}&tipo=correctivo&resultado=con-observaciones&area=${area}&proveedor=interno&desde=2026-01-01&hasta=2026-06-30`;
    expect(historySearch(parse(search)).toString()).toBe(search);
  });

  it('sin filtros, sin parámetros', () => {
    expect(historySearch(emptyHistoryFilters).toString()).toBe('');
  });
});

describe('historyApiSearch', () => {
  it('pasa los códigos de la API, ordenados para compartir caché', () => {
    const filters = parse(`tipo=limpieza&tipo=calibracion&proveedor=${provider}&proveedor=interno&desde=2026-01-01`);
    expect(historyApiSearch(filters).toString()).toBe(`from=2026-01-01&kind=calibration&kind=cleaning&provider=${provider}&provider=internal`);
  });
});

describe('isHistoryFiltered', () => {
  it('el equipo de la ficha no cuenta como filtro; lo demás sí', () => {
    expect(isHistoryFiltered({ ...emptyHistoryFilters, assetId: asset })).toBe(false);
    expect(isHistoryFiltered({ ...emptyHistoryFilters, to: '2026-06-30' })).toBe(true);
    expect(isHistoryFiltered({ ...emptyHistoryFilters, providers: ['internal'] })).toBe(true);
  });
});
