import { expect } from 'vitest';
import { asset as assetContract, assetType as assetTypeContract } from '@platlab/contracts';
import { admin, call } from '../../testing/api.js';
import { addLocation, addMember, seedWorkspace, uniqueSuffix, type Member, type Workspace } from '../../testing/core-fixtures.js';

/** E-01a por HTTP contra la base local (ADR 0019): el arnés común y el laboratorio de Equipos. */
export { admin, auditsIn, call, count, download, errorCode } from '../../testing/api.js';

export interface EquipmentLab {
  workspace: Workspace;
  base: string;
  adminMember: Member;
  operator: Member;
  teacher: Member;
  /** Laboratorio bajo la sede, con un estante dentro; y otro laboratorio. */
  lab: string;
  shelf: string;
  otherLab: string;
}

/** Espacio con Equipos, un Administrador, un Operador, un Docente y ubicaciones en dos niveles. */
export async function createEquipmentLab(): Promise<EquipmentLab> {
  const workspace = await seedWorkspace(admin, { modules: ['equipment'] });
  const site = await addLocation(admin, workspace.id, { kind: 'site' });
  const lab = await addLocation(admin, workspace.id, { kind: 'room', parentId: site });
  const shelf = await addLocation(admin, workspace.id, { kind: 'storage', parentId: lab });
  const otherLab = await addLocation(admin, workspace.id, { kind: 'room', parentId: site });
  return {
    workspace,
    base: `/workspaces/${workspace.id}/equipment`,
    adminMember: await addMember(admin, workspace.id, { roles: [{ role: 'admin' }], displayName: 'Administradora' }),
    operator: await addMember(admin, workspace.id, { roles: [{ role: 'operator' }], displayName: 'Operador' }),
    teacher: await addMember(admin, workspace.id, { roles: [{ role: 'teacher' }], displayName: 'Docente' }),
    lab,
    shelf,
    otherLab,
  };
}

/** El Administrador crea un tipo de equipo con nombre único. */
export async function createType(lab: EquipmentLab, name = `Centrífuga ${uniqueSuffix()}`) {
  const created = await call(lab.adminMember.subject, `${lab.base}/asset-types`, { method: 'POST', body: { name } });
  expect(created.status).toBe(201);
  return assetTypeContract.parse(created.body);
}

/** El Administrador da de alta un equipo en el laboratorio; sin tipo, crea uno nuevo. */
export async function createAsset(lab: EquipmentLab, body: Record<string, unknown> = {}) {
  const typeId = body['typeId'] ?? (await createType(lab)).id;
  const created = await call(lab.adminMember.subject, `${lab.base}/assets`, {
    method: 'POST',
    body: { name: 'Centrífuga refrigerada', typeId, locationId: lab.lab, ...body },
  });
  expect(created.status).toBe(201);
  return assetContract.parse(created.body);
}
