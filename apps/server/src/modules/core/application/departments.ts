import type { Department } from '@platlab/contracts';
import { lockKey } from '../../../platform/db/codes.js';
import { AppError } from '../../../platform/errors.js';
import {
  archiveDepartment as archiveDepartmentQuery,
  departmentNamed,
  insertDepartment,
  listActiveDepartments,
  lockDepartment,
  setDepartmentName,
  shareDepartment,
} from '../infrastructure/departments.queries.js';
import type { WorkspaceAccess } from './access.js';
import { recordAudit } from './audit.js';

/** Departamentos del Núcleo (ADR 0024): dueños y carreras; renombrar cambia en todas partes. */

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

/** Serializa, por espacio, las altas y los nombres nuevos: un UPDATE no tiene ON CONFLICT. */
const namesLock = (access: WorkspaceAccess) => `core.departments/${access.workspace.id}`;

async function requireFreeName(access: WorkspaceAccess, name: string, exceptId: string | null): Promise<void> {
  await lockKey(access.client, namesLock(access));
  const [taken] = await departmentNamed.run({ workspaceId: access.workspace.id, name, exceptId }, access.client);
  if (taken) throw new AppError('NAME_TAKEN', `Ya existe el departamento «${taken.name}»`);
}

export function activeDepartments(access: WorkspaceAccess): Promise<Department[]> {
  return listActiveDepartments.run({ workspaceId: access.workspace.id }, access.client);
}

export async function createDepartment(access: WorkspaceAccess, name: string): Promise<Department> {
  await requireFreeName(access, name, null);
  const [row] = await insertDepartment.run({ workspaceId: access.workspace.id, name }, access.client);
  if (!row) throw new AppError('NAME_TAKEN', `Ya existe el departamento «${name}»`);
  await recordAudit(access, { action: 'core.department.create', entityType: 'core.department', entityId: row.id, changes: { ...row } });
  return row;
}

/** Renombra el departamento bloqueado; sin cambio, no escribe ni audita. */
export async function renameDepartment(access: WorkspaceAccess, departmentId: string, name: string): Promise<Department> {
  const [department] = await lockDepartment.run({ workspaceId: access.workspace.id, departmentId }, access.client);
  if (!department) throw notFound();
  if (department.name === name) return department;
  await requireFreeName(access, name, departmentId);
  await setDepartmentName.run({ workspaceId: access.workspace.id, departmentId, name }, access.client);
  await recordAudit(access, {
    action: 'core.department.rename',
    entityType: 'core.department',
    entityId: departmentId,
    changes: { name: { from: department.name, to: name } },
  });
  return { id: departmentId, name };
}

/** Archivar solo lo deja de ofrecer: lotes y equipos lo conservan (ADR 0024). */
export async function archiveDepartment(access: WorkspaceAccess, departmentId: string): Promise<{ id: string }> {
  const [row] = await archiveDepartmentQuery.run({ workspaceId: access.workspace.id, departmentId }, access.client);
  if (!row) throw notFound();
  await recordAudit(access, { action: 'core.department.archive', entityType: 'core.department', entityId: departmentId, changes: {} });
  return row;
}

/**
 * Para los módulos: el departamento elegido, activo y del espacio, bloqueado (compartido) hasta el final
 * de su transacción, así no se renombra ni se archiva mientras se enlaza.
 */
export async function requireActiveDepartment(access: WorkspaceAccess, departmentId: string): Promise<Department> {
  const [row] = await shareDepartment.run({ workspaceId: access.workspace.id, departmentId }, access.client);
  if (!row) throw new AppError('VALIDATION_FAILED', 'El departamento no existe o está archivado');
  return row;
}
