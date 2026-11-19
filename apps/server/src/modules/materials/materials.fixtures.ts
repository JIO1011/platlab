import { expect } from 'vitest';
import { material as materialContract, materialMovementResponse, materialStockList } from '@platlab/contracts';
import { admin, call } from '../../testing/api.js';
import { addLocation, addMember, seedWorkspace, uniqueSuffix, type Member, type Workspace } from '../../testing/core-fixtures.js';

/** MA-01a por HTTP contra la base local (ADR 0025): el arnés común y el laboratorio de Materiales. */
export { admin, call, count, errorCode } from '../../testing/api.js';

export interface MaterialsLab {
  workspace: Workspace;
  base: string;
  adminMember: Member;
  operator: Member;
  teacher: Member;
  /** Laboratorio bajo la sede, con un estante dentro. */
  lab: string;
  shelf: string;
}

/** Espacio con Materiales, un Administrador, un Operador, un Docente y ubicaciones en dos niveles. */
export async function createMaterialsLab(modules: string[] = ['materials']): Promise<MaterialsLab> {
  const workspace = await seedWorkspace(admin, { modules });
  const site = await addLocation(admin, workspace.id, { kind: 'site' });
  const lab = await addLocation(admin, workspace.id, { kind: 'room', parentId: site });
  const shelf = await addLocation(admin, workspace.id, { kind: 'storage', parentId: lab });
  return {
    workspace,
    base: `/workspaces/${workspace.id}/materials`,
    adminMember: await addMember(admin, workspace.id, { roles: [{ role: 'admin' }], displayName: 'Administradora' }),
    operator: await addMember(admin, workspace.id, { roles: [{ role: 'operator' }], displayName: 'Operador' }),
    teacher: await addMember(admin, workspace.id, { roles: [{ role: 'teacher' }], displayName: 'Docente' }),
    lab,
    shelf,
  };
}

/** El Administrador da de alta un material con nombre único; por defecto, un consumible en piezas. */
export async function createMaterial(lab: MaterialsLab, body: Record<string, unknown> = {}) {
  const created = await call(lab.adminMember.subject, `${lab.base}/products`, {
    method: 'POST',
    body: { name: `Guantes ${uniqueSuffix()}`, class: 'consumable', baseUnit: 'u', ...body },
  });
  expect(created.status).toBe(201);
  return materialContract.parse(created.body);
}

/** Ingreso de un material a una ubicación, por quien se indique (por defecto, el Operador). */
export const receive = (lab: MaterialsLab, productId: string, quantity: string, locationId = lab.shelf, subject = lab.operator.subject) =>
  call(subject, `${lab.base}/receipts`, { method: 'POST', body: { productId, locationId, quantity, unit: 'u' } });

/** Ingresa un material y devuelve su posición (la que usan salidas y ajustes). */
export async function receivedPosition(lab: MaterialsLab, productId: string, quantity = '10', locationId = lab.shelf) {
  const response = await receive(lab, productId, quantity, locationId);
  expect(response.status).toBe(201);
  return materialMovementResponse.parse(response.body).positionId;
}

export async function stockOf(lab: MaterialsLab, productId: string) {
  const response = await call(lab.operator.subject, `${lab.base}/stock?productId=${productId}`);
  expect(response.status).toBe(200);
  return materialStockList.parse(response.body).items;
}

/** Un reutilizable por cantidad con existencias ingresadas: devuelve su posición. */
export async function reusableWithStock(lab: MaterialsLab, quantity = '10') {
  const product = await createMaterial(lab, { name: `Vasos ${uniqueSuffix()}`, class: 'reusable_counted' });
  return { product, positionId: await receivedPosition(lab, product.id, quantity) };
}

/** Presta material como el Operador; por defecto, al Docente y con una sola línea. */
export const lend = (lab: MaterialsLab, lines: Array<{ positionId: string; quantity: string }>, extra: Record<string, unknown> = {}, subject = lab.operator.subject) =>
  call(subject, `${lab.base}/loans`, { method: 'POST', body: { borrowerId: lab.teacher.principalId, lines, ...extra } });

/** Registra una devolución como el Operador. */
export const giveBack = (lab: MaterialsLab, loanId: string, expectedVersion: number, lines: Array<Record<string, unknown>>, subject = lab.operator.subject) =>
  call(subject, `${lab.base}/loans/${loanId}/returns`, { method: 'POST', body: { expectedVersion, lines } });
