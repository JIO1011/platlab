import type { z } from 'zod';
import { WARRANTY_EXPIRING_DAYS, type assetFilterQuery } from '@platlab/contracts';
import { todayIn } from '../../../platform/dates.js';

/** Los filtros del Inventario y del Informe (ADR 0019, E-01c), sin paginar. */
export type AssetFilters = z.infer<typeof assetFilterQuery>;

/** `YYYY-MM-DD` más unos días: aritmética de calendario, no de cantidades. */
function addDays(iso: string, days: number): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * Los filtros en los parámetros de listAssets y assetTotals. «Sin dato» (`none`) de responsable y estado
 * físico va aparte; garantía y vida útil se miden a hoy en el huso del espacio.
 */
export function assetFilterParams(timeZone: string, filters: AssetFilters) {
  const today = todayIn(timeZone);
  const responsibles = filters.responsible ?? [];
  const conservations = filters.conservation ?? [];
  const responsibleIds = responsibles.filter((value) => value !== 'none');
  const conservationStates = conservations.filter((value) => value !== 'none');
  return {
    q: filters.q ?? null,
    typeIds: filters.type ?? null,
    conditions: filters.condition ?? null,
    locationIds: filters.location ?? null,
    departmentIds: filters.departamento ?? null,
    responsibleIds: responsibleIds.length > 0 ? responsibleIds : null,
    withoutResponsible: responsibles.includes('none'),
    conservations: conservationStates.length > 0 ? conservationStates : null,
    withoutConservation: conservations.includes('none'),
    warranties: filters.warranty ?? null,
    usefulLives: filters.usefulLife ?? null,
    today,
    warrantyHorizon: addDays(today, WARRANTY_EXPIRING_DAYS),
  };
}
