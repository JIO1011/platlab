import { describe, expect, it } from 'vitest';
import { assetApiSearch, assetQueryFrom, assetSearch, isFiltered } from './asset-filters';

const type = '0b5a2c1e-7f3d-4c1a-9e2b-8d6f4a3c2b1e';

describe('filtros del Inventario de Equipos', () => {
  it('lee la URL en español y la devuelve igual', () => {
    const search = new URLSearchParams(`q=centrífuga&condicion=fuera-de-servicio&condicion=restringido&tipo=${type}`);
    const query = assetQueryFrom(search);
    expect(query).toEqual({ q: 'centrífuga', conditions: ['faulted', 'restricted'], types: [type], locations: [] });
    expect(assetSearch(query).toString()).toBe(search.toString());
  });

  it('ignora lo desconocido, lo repetido y una búsqueda de menos de dos letras', () => {
    const query = assetQueryFrom(new URLSearchParams(`q=a&condicion=rota&condicion=baja&condicion=baja&tipo=no-es-id&ubicacion=${type}&ubicacion=${type}`));
    expect(query).toEqual({ q: '', conditions: ['retired'], types: [], locations: [type] });
    expect(isFiltered(query)).toBe(true);
    expect(isFiltered(assetQueryFrom(new URLSearchParams()))).toBe(false);
  });

  it('envía a la API los códigos, el cursor y el límite', () => {
    const query = assetQueryFrom(new URLSearchParams('condicion=operativo'));
    expect(assetApiSearch(query, 'abc', 20).toString()).toBe('limit=20&condition=operational&cursor=abc');
  });
});
