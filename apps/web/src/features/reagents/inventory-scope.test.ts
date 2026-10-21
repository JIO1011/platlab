import { describe, expect, it } from 'vitest';
import { emptyScope, inScope, readScope } from './inventory-scope';

const AREA = 'da000000-0000-4000-8000-00000000000a';
const DEPARTMENT = 'db000000-0000-4000-8000-00000000000b';
const parse = (search: string) => readScope(new URLSearchParams(search));

describe('alcance del Inventario desde Áreas (ADR 0024)', () => {
  it('lee el área y el departamento de la URL', () => {
    expect(parse(`area=${AREA}`)).toEqual({ areaId: AREA, departmentId: null });
    expect(parse(`departamento=${DEPARTMENT}`)).toEqual({ areaId: null, departmentId: DEPARTMENT });
    expect(parse(`area=${AREA}&departamento=${DEPARTMENT}`)).toEqual({ areaId: AREA, departmentId: DEPARTMENT });
  });

  it('ignora lo que no es un identificador, sin romper la página', () => {
    expect(parse('')).toEqual(emptyScope);
    expect(parse('area=no-es-uuid&departamento=')).toEqual(emptyScope);
  });

  it('sin filtros deja pasar todo reactivo', () => {
    expect(inScope({ areaIds: [], departmentIds: [] }, emptyScope)).toBe(true);
  });

  it('el área exige existencias en ella', () => {
    const scope = { ...emptyScope, areaId: AREA };
    expect(inScope({ areaIds: [AREA], departmentIds: [] }, scope)).toBe(true);
    expect(inScope({ areaIds: [DEPARTMENT], departmentIds: [AREA] }, scope)).toBe(false);
  });

  it('el departamento exige que el reactivo sea suyo', () => {
    const scope = { ...emptyScope, departmentId: DEPARTMENT };
    expect(inScope({ areaIds: [], departmentIds: [DEPARTMENT] }, scope)).toBe(true);
    expect(inScope({ areaIds: [DEPARTMENT], departmentIds: [] }, scope)).toBe(false);
  });

  it('con ambos, cumple los dos', () => {
    const scope = { areaId: AREA, departmentId: DEPARTMENT };
    expect(inScope({ areaIds: [AREA], departmentIds: [DEPARTMENT] }, scope)).toBe(true);
    expect(inScope({ areaIds: [AREA], departmentIds: [] }, scope)).toBe(false);
  });
});
