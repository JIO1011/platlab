import { afterAll, expect } from 'vitest';
import { errorResponse, product as productContract, entryList, receiptResponse } from '@platlab/contracts';
import { buildApp } from '../../app.js';
import { localPublicFiles } from '../../testing/storage.js';
import { createPool } from '../../platform/db/pool.js';
import {
  addLocation,
  addMember,
  createAdminPool,
  seedWorkspace,
  uniqueSuffix,
  type Member,
  type Workspace,
} from '../../testing/core-fixtures.js';
import { createTestSigner } from '../../testing/tokens.js';

/**
 * R-00 por HTTP contra la base local, con el rol de runtime y conexiones reales: el recorrido de
 * la demo y la evidencia de G0 (primer incremento, «Evidencia para cerrar G0»).
 */
export const admin = createAdminPool();
const pool = createPool({
  connectionString:
    process.env['DATABASE_URL_API'] ??
    'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  max: 4,
});
export const signer = await createTestSigner();
export const app = buildApp({ pool, verifyToken: signer.verifier, publicFiles: localPublicFiles });

afterAll(async () => {
  await app.close();
  await pool.end();
  await admin.end();
});

interface Call {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: unknown;
  key?: string;
}

export async function call(subject: string, url: string, { method = 'GET', body, key }: Call = {}) {
  const response = await app.inject({
    method,
    url: `/v1${url}`,
    headers: {
      authorization: `Bearer ${await signer.sign(subject)}`,
      ...(key ? { 'idempotency-key': key } : {}),
    },
    ...(body === undefined ? {} : { payload: body as Record<string, unknown> }),
  });
  return { status: response.statusCode, body: response.json() as unknown };
}

export const errorCode = (body: unknown) => errorResponse.parse(body).error.code;

export interface Lab {
  workspace: Workspace;
  base: string;
  adminMember: Member;
  operator: Member;
  storage: string;
  otherStorage: string;
}

/** Espacio con Reactivos, un Administrador, un Operador y dos almacenes bajo una sede. */
export async function createLab(): Promise<Lab> {
  const workspace = await seedWorkspace(admin, { modules: ['reagents'] });
  const site = await addLocation(admin, workspace.id, { kind: 'site' });
  const storage = await addLocation(admin, workspace.id, { kind: 'storage', parentId: site });
  const otherStorage = await addLocation(admin, workspace.id, { kind: 'storage', parentId: site });
  return {
    workspace,
    base: `/workspaces/${workspace.id}/reagents`,
    adminMember: await addMember(admin, workspace.id, { roles: [{ role: 'admin' }], displayName: 'Administradora' }),
    operator: await addMember(admin, workspace.id, { roles: [{ role: 'operator' }], displayName: 'Operador' }),
    storage,
    otherStorage,
  };
}

/** El Administrador crea un reactivo por la API; el código es automático (ADR 0015). */
export async function createProduct(lab: Lab, unit = 'g', name = 'Cloruro de sodio') {
  const created = await call(lab.adminMember.subject, `${lab.base}/products`, {
    method: 'POST',
    body: { name, baseUnit: unit, casNumber: '7647-14-5', physicalState: unit === 'g' || unit === 'kg' ? 'solid' : 'liquid' },
  });
  expect(created.status).toBe(201);
  return productContract.parse(created.body);
}

/** Códigos de frasco únicos para un ingreso de prueba. */
export const freshCodes = (count = 1) => Array.from({ length: count }, () => `F-${uniqueSuffix()}`);

/** Ingreso de un frasco (ADR 0015): cada ingreso abre un lote nuevo del reactivo. */
export async function receive(
  lab: Lab,
  productId: string,
  quantity: string,
  location = lab.storage,
  subject = lab.operator.subject,
  extra: Record<string, unknown> = {},
) {
  return call(subject, `${lab.base}/receipts`, {
    method: 'POST',
    body: { productId, locationId: location, quantity, unit: 'g', codes: freshCodes(), ...extra },
  });
}

export const listEntry = entryList.shape.items.element;

/** Posición del primer frasco de un ingreso (ADR 0012: la posición es frasco + ubicación). */
export const receivedPosition = (response: { body: unknown }) => receiptResponse.parse(response.body).containers[0]!.positionId;

export const count = async (sql: string, params: unknown[]) =>
  Number((await admin.query<{ n: string }>(sql, params)).rows[0]!.n);
export const operationsIn = (workspaceId: string) =>
  count('select count(*) as n from inventory.operations where workspace_id = $1', [workspaceId]);
export const auditsIn = (workspaceId: string) =>
  count('select count(*) as n from core.audit_events where workspace_id = $1', [workspaceId]);
