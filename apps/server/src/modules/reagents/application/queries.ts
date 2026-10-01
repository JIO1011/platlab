import type pg from 'pg';
import type { z } from 'zod';
import type {
  OperationList,
  operationListQuery,
  PositionList,
  positionListQuery,
  ProductList,
  productListQuery,
  Product,
} from '@platlab/contracts';
import { listOperationPage, listPositionPage } from '../../../capabilities/inventory/index.js';
import { AppError } from '../../../platform/errors.js';
import {
  permissionScope,
  requirePermission,
  withModuleAccess,
  type WorkspaceAccess,
} from '../../core/index.js';
import { homeSummary, listProducts as listProductsQuery } from '../infrastructure/products.queries.js';
import { inventoryContext } from './commands.js';

const READ = 'reagents.catalog.read';

interface QueryRequest {
  subject: string;
  workspaceId: string;
}

/** Consultas de Reactivos: admisión de consulta y lectura del catálogo en algún ámbito. */
function runQuery<T>(pool: pg.Pool, request: QueryRequest, work: (access: WorkspaceAccess) => Promise<T>) {
  return withModuleAccess(
    pool,
    { ...request, moduleCode: 'reagents', actionClass: 'read_export' },
    async (access) => {
      await requirePermission(access, READ);
      return work(access);
    },
  );
}

function decodeProductCursor(cursor: string | undefined): [string, string] | null {
  if (cursor === undefined) return null;
  try {
    const values: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(values) && values.length === 2 && values.every((v) => typeof v === 'string')) {
      return [values[0] as string, values[1] as string];
    }
  } catch {
    // Se responde abajo como datos inválidos.
  }
  throw new AppError('VALIDATION_FAILED', 'Cursor inválido');
}

/** El catálogo del espacio no depende de la ubicación; las existencias sí se filtran por ámbito. */
export function listProducts(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof productListQuery>,
): Promise<ProductList> {
  return runQuery(pool, request, async (access) => {
    const after = decodeProductCursor(query.cursor);
    const rows = await listProductsQuery.run(
      {
        workspaceId: access.workspace.id,
        afterCode: after?.[0] ?? null,
        afterId: after?.[1] ?? null,
        limit: query.limit + 1,
      },
      access.client,
    );
    const visible = rows.slice(0, query.limit);
    const last = visible.at(-1);
    return {
      items: visible.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        baseUnit: row.base_unit,
        casNumber: row.cas_number,
        physicalState: row.physical_state as Product['physicalState'],
      })),
      nextCursor:
        rows.length > query.limit && last
          ? Buffer.from(JSON.stringify([last.sort_code, last.id])).toString('base64url')
          : null,
    };
  });
}

export function listPositions(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof positionListQuery>,
): Promise<PositionList> {
  return runQuery(pool, request, async (access) =>
    listPositionPage(inventoryContext(access), {
      locationIds: await permissionScope(access, READ),
      itemId: query.productId,
      cursor: query.cursor,
      limit: query.limit,
    }),
  );
}

export function listOperations(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof operationListQuery>,
): Promise<OperationList> {
  return runQuery(pool, request, async (access) =>
    listOperationPage(inventoryContext(access), {
      locationIds: await permissionScope(access, READ),
      itemId: query.productId,
      locationId: query.locationId,
      positionId: query.positionId,
      cursor: query.cursor,
      limit: query.limit,
    }),
  );
}

/** Tarjeta de Inicio (01 §7): productos del catálogo y posiciones con existencias consultables. */
export async function reagentsHomeSummary(access: WorkspaceAccess): Promise<Record<string, number>> {
  const [row] = await homeSummary.run(
    { workspaceId: access.workspace.id, locationIds: await permissionScope(access, READ) },
    access.client,
  );
  return {
    products: Number(row?.products ?? 0),
    positionsWithStock: Number(row?.positions_with_stock ?? 0),
  };
}
