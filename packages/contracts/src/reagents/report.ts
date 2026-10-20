import { z } from 'zod';
import { homeActivity, homeTrend } from '../access.js';
import { decimalString } from '../decimal.js';
import { list, many, page } from '../common.js';
import { operationType } from './shared.js';

/**
 * Filtros del libro de Movimientos (ADR 0014), comunes a la lista, a los conteos por opción y a los
 * totales. Cada filtro con varios valores admite cualquiera de ellos; los filtros se combinan entre
 * sí. Ninguno amplía el ámbito de ubicaciones del miembro: la ubicación se cruza con él.
 */
const operationFilterFields = {
  type: many(operationType),
  productId: many(z.uuid()),
  /** Quien pidió la salida si hubo solicitud; si no, quien registró la operación. */
  responsibleId: many(z.uuid()),
  /** Texto exacto guardado en la operación (ADR 0012). */
  destination: many(z.string().min(1).max(200)),
  reason: many(z.string().min(1).max(500)),
  locationId: many(z.uuid()),
  positionId: z.uuid().optional(),
  /** Los últimos N días civiles en la zona del espacio, hoy incluido: la misma ventana del gráfico. */
  days: z.coerce.number().int().min(1).max(90).optional(),
  /** Días civiles en la zona del espacio, ambos incluidos; cada uno puede ir solo. */
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
};

type PeriodFields = { days?: number | undefined; from?: string | undefined; to?: string | undefined };
const periodRules = <T extends z.ZodType<PeriodFields>>(schema: T) =>
  schema
    .refine((value) => value.days === undefined || (value.from === undefined && value.to === undefined), {
      message: 'El periodo es por días o por fechas, no ambos',
      path: ['days'],
    })
    .refine((value) => value.from === undefined || value.to === undefined || value.from <= value.to, {
      message: 'La fecha inicial es posterior a la final',
      path: ['from'],
    });

export const operationListQuery = periodRules(z.object({ ...page, ...operationFilterFields }).strict());

/** GET /operations/facets: los mismos filtros; `productQuery` busca dentro del grupo de reactivos. */
export const operationFacetsQuery = periodRules(
  z.object({ ...operationFilterFields, productQuery: z.string().trim().min(1).max(100).optional() }).strict(),
);

export const operationGroupBy = z.enum(['product', 'responsible', 'destination', 'month']);
/** GET /operations/totals: los mismos filtros, agrupados por reactivo, responsable, destino o mes. */
export const operationTotalsQuery = periodRules(z.object({ ...operationFilterFields, groupBy: operationGroupBy }).strict());

/** GET /operations/export: el Excel del libro con los mismos filtros, sin paginar (ADR 0017, 0021). */
export const operationExportQuery = periodRules(z.object(operationFilterFields).strict());

/** Un asiento del historial: un ingreso de varios frascos son varios asientos de una operación. */
export const operation = z.object({
  id: z.uuid(),
  entryId: z.uuid(),
  type: operationType,
  effectiveAt: z.iso.datetime({ offset: true }),
  actor: z.object({ principalId: z.uuid(), displayName: z.string().nullable() }),
  /** Quién pidió la salida que el actor aprobó (ADR 0012); null si no hubo solicitud. */
  requestedBy: z.object({ displayName: z.string().nullable() }).nullable(),
  reason: z.string().nullable(),
  destination: z.string().nullable(),
  reference: z.string().nullable(),
  positionId: z.uuid(),
  product: z.object({ id: z.uuid(), code: z.string(), name: z.string() }),
  lot: z.object({ code: z.string() }),
  container: z.object({ code: z.string() }).nullable(),
  /** `path`, como en `position`: nombres desde el primer nivel bajo la sede; la sede, solo si es ella. */
  location: z.object({ code: z.string(), name: z.string(), path: z.array(z.string()) }),
  quantity: decimalString,
  balanceAfter: decimalString,
  unit: z.string(),
});

const optionCount = z.number().int().nonnegative();
const productRef = z.object({ id: z.uuid(), code: z.string(), name: z.string() });

/**
 * Conteo de asientos por opción de cada filtro (ADR 0014). `total` aplica todos los filtros; cada
 * grupo, todos menos el suyo, para poder sumar opciones. Solo llegan las opciones con asientos y las
 * ya elegidas aunque queden en cero, por `count` descendente y luego por nombre.
 */
export const operationFacets = z.object({
  total: optionCount,
  types: z.array(z.object({ value: operationType, count: optionCount })),
  /** Como mucho 300 más las elegidas; `more` dice que hay más y conviene buscar con `productQuery`. */
  products: z.object({ options: z.array(productRef.extend({ count: optionCount })), more: z.boolean() }),
  responsibles: z.array(z.object({ principalId: z.uuid(), displayName: z.string().nullable(), count: optionCount })),
  destinations: z.array(z.object({ value: z.string(), count: optionCount })),
  reasons: z.array(z.object({ value: z.string(), count: optionCount })),
  locations: z.array(z.object({ id: z.uuid(), code: z.string(), name: z.string(), count: optionCount })),
});

/**
 * Totales del libro filtrado (ADR 0014), calculados en el servidor. Cada fila es un reactivo con su
 * unidad base: nunca se suman unidades distintas. Las sumas llevan signo y son null si el tipo no tiene
 * asientos; `net` es ingresos + salidas + ajustes. `transfers` cuenta traslados (operaciones, no sus
 * dos asientos) y no suma cantidad; `count` sí cuenta asientos, como las filas del libro.
 */
const operationTotalsRow = z.object({
  product: productRef,
  unit: z.string(),
  count: optionCount,
  receipts: decimalString.nullable(),
  issues: decimalString.nullable(),
  adjustments: decimalString.nullable(),
  net: decimalString,
  transfers: optionCount,
});

export const operationTotals = z.object({
  groupBy: operationGroupBy,
  /**
   * Por `count` descendente (por mes, del más reciente al más antiguo). `key`: id del reactivo o del
   * responsable, texto del destino (null: «Sin destino») o mes `AAAA-MM` en la zona del espacio.
   */
  groups: z.array(
    z.object({
      key: z.string().nullable(),
      label: z.string().nullable(),
      count: optionCount,
      rows: z.array(operationTotalsRow),
    }),
  ),
  /** Hay más de 1000 grupos y solo llegan los primeros. */
  truncated: z.boolean(),
});

export const operationList = list(operation);

/**
 * GET /reagents/summary: el Resumen de la app de Reactivos (ADR 0011). Las mismas cifras, el mismo
 * gráfico y la misma actividad que su tarjeta de Inicio, en el ámbito del miembro.
 */
export const reagentsSummary = z.object({
  summary: z.object({
    productsWithStock: z.number().int().nonnegative(),
    containersWithStock: z.number().int().nonnegative(),
    /** Frascos con saldo vencidos y por vencer (ADR 0012, 05-10-2026; plazo en 02 §12). */
    expiredContainers: z.number().int().nonnegative(),
    expiringContainers: z.number().int().nonnegative(),
    /** Reactivos con mínimo cuya existencia física es menor (ADR 0012, 05-10-2026). */
    belowMinimum: z.number().int().nonnegative(),
    /** Reactivos con mínimo fijado: sin ninguno, un «0 bajo mínimo» no significa «todo bien». */
    productsWithMinimum: z.number().int().nonnegative(),
    /** Solicitudes pendientes: la bandeja de quien aprueba o las propias del Operador. */
    pendingRequests: z.number().int().nonnegative(),
  }),
  activity: z.array(homeActivity).max(10),
  trend: homeTrend.nullable(),
});

export type Operation = z.infer<typeof operation>;
export type ReagentsSummary = z.infer<typeof reagentsSummary>;
export type OperationList = z.infer<typeof operationList>;
export type OperationFacets = z.infer<typeof operationFacets>;
export type OperationTotals = z.infer<typeof operationTotals>;
export type OperationGroupBy = z.infer<typeof operationGroupBy>;
