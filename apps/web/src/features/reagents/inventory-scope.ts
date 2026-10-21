import type { StockedProduct } from '@platlab/contracts';
import { z } from 'zod';

/**
 * El alcance del Inventario que trae la sección Áreas (ADR 0024): `?area=…` y `?departamento=…`, cada uno un
 * identificador. Se suma a la búsqueda y a los avisos; un valor que no es un identificador se ignora.
 */
export interface InventoryScope {
  areaId: string | null;
  departmentId: string | null;
}

export const emptyScope: InventoryScope = { areaId: null, departmentId: null };

const idOf = (params: URLSearchParams, key: string): string | null => {
  const parsed = z.uuid().safeParse(params.get(key));
  return parsed.success ? parsed.data : null;
};

export const readScope = (params: URLSearchParams): InventoryScope => ({
  areaId: idOf(params, 'area'),
  departmentId: idOf(params, 'departamento'),
});

/** El reactivo tiene existencias en el área y es del departamento, para cada filtro puesto. */
export const inScope = (product: Pick<StockedProduct, 'areaIds' | 'departmentIds'>, scope: InventoryScope): boolean =>
  (scope.areaId === null || product.areaIds.includes(scope.areaId)) &&
  (scope.departmentId === null || product.departmentIds.includes(scope.departmentId));
