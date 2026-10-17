import { describe, expect, it } from 'vitest';
import { assetApiSearch, assetQueryFrom, assetSearch, emptyAssetQuery, isFiltered } from './asset-filters';

const type = '0b5a2c1e-7f3d-4c1a-9e2b-8d6f4a3c2b1e';

describe('filtros del Inventario de Equipos', () => {
  it('lee la URL en español y la devuelve igual', () => {
    const search = new URLSearchParams(`q=centrífuga&condicion=fuera-de-servicio&condicion=restringido&tipo=${type}`);
    const query = assetQueryFrom(search);
    expect(query).toEqual({ ...emptyAssetQuery, q: 'centrífuga', conditions: ['faulted', 'restricted'], types: [type] });
    expect(assetSearch(query).toString()).toBe(search.toString());
  });

  it('ignora lo desconocido, lo repetido y una búsqueda de menos de dos letras', () => {
    const query = assetQueryFrom(new URLSearchParams(`q=a&condicion=rota&condicion=baja&condicion=baja&tipo=no-es-id&ubicacion=${type}&ubicacion=${type}`));
    expect(query).toEqual({ ...emptyAssetQuery, conditions: ['retired'], locations: [type] });
    expect(isFiltered(query)).toBe(true);
    expect(isFiltered(assetQueryFrom(new URLSearchParams()))).toBe(false);
  });

  it('lee y escribe los filtros del Informe: responsable, estado físico, garantía y vida útil (E-01c)', () => {
    const search = new URLSearchParams(
      `responsable=${type}&responsable=sin&estado-fisico=regular&estado-fisico=sin-dato&garantia=por-vencer&vida-util=cumplida`,
    );
    const query = assetQueryFrom(search);
    expect(query).toEqual({
      ...emptyAssetQuery,
      responsibles: [type, 'none'],
      conservations: ['fair', 'none'],
      warranties: ['expiring'],
      usefulLives: ['reached'],
    });
    expect(assetSearch(query).toString()).toBe(search.toString());
    expect(assetApiSearch(query).toString()).toBe(
      `responsible=${type}&responsible=none&conservation=fair&conservation=none&warranty=expiring&usefulLife=reached&limit=50`,
    );
    expect(isFiltered(query)).toBe(true);
    // Lo desconocido se ignora: un enlace viejo o mal escrito no rompe.
    expect(assetQueryFrom(new URLSearchParams('responsable=otro&garantia=eterna'))).toEqual(emptyAssetQuery);
  });

  it('envía a la API los códigos, el cursor y el límite', () => {
    const query = assetQueryFrom(new URLSearchParams('condicion=operativo'));
    expect(assetApiSearch(query, 'abc', 20).toString()).toBe('condition=operational&limit=20&cursor=abc');
  });
});
