import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { ActionClass, WorkspaceSummary } from '@platlab/contracts';
import { visibleWorkspaceStatus } from '@platlab/contracts';
import { setActor, setRequestScope } from '../../../platform/db/context.queries.js';
import { withTransaction } from '../../../platform/db/transaction.js';
import { AppError, accessDenied } from '../../../platform/errors.js';
import {
  admitModule,
  admitWorkspace,
  findIdentity,
  findMembershipClasses,
  hasPermissionAt as hasPermissionAtQuery,
  hasWorkspacePermission as hasWorkspacePermissionQuery,
  listPermissionScope,
  listMemberRoles as listMemberRolesQuery,
  listMyWorkspaces as listMyWorkspacesQuery,
  listPermissionCodes,
  type IAdmitWorkspaceResult,
} from '../infrastructure/access.queries.js';

/** Miembro admitido dentro de la transacción del caso de uso (02 §5). */
export interface WorkspaceAccess {
  client: pg.PoolClient;
  workspace: {
    id: string;
    code: string;
    name: string;
    status: WorkspaceSummary['status'];
    timeZone: string;
  };
  identityId: string;
  displayName: string;
  membershipId: string;
  principalId: string;
  isOwner: boolean;
  /** Une la auditoría de todo lo que hace este caso de uso. */
  correlationId: string;
}

interface AccessRequest {
  subject: string;
  workspaceId: string;
  actionClass: ActionClass;
}

/** Traduce la decisión de core.admission; cualquier valor desconocido se deniega. */
function rejection(decision: string): AppError {
  switch (decision) {
    case 'module_unavailable':
      return new AppError('MODULE_UNAVAILABLE', 'Módulo no disponible');
    case 'module_read_only':
      return new AppError('MODULE_READ_ONLY', 'El módulo no admite esta acción en su estado actual');
    case 'workspace_restricted':
      return new AppError('WORKSPACE_RESTRICTED', 'El espacio no admite esta acción en su estado actual');
    default:
      return accessDenied();
  }
}

/** Fija el actor solo después de la admisión y arma el contexto del caso de uso. */
async function enter(client: pg.PoolClient, row: IAdmitWorkspaceResult): Promise<WorkspaceAccess> {
  if (row.decision !== 'admitted') throw rejection(row.decision);
  await setActor.run({ identityId: row.identity_id, principalId: row.principal_id }, client);
  return {
    client,
    workspace: {
      id: row.workspace_id,
      code: row.code,
      name: row.name,
      status: visibleWorkspaceStatus.parse(row.status),
      timeZone: row.time_zone,
    },
    identityId: row.identity_id,
    displayName: row.display_name,
    membershipId: row.membership_id,
    principalId: row.principal_id,
    isOwner: row.is_owner,
    correlationId: randomUUID(),
  };
}

/**
 * Abre la transacción de una ruta de Core con el miembro admitido (02 §5, pasos 2–4): fija el
 * contexto, lee espacio y membresía con FOR SHARE, decide con el eje espacio y solo entonces fija
 * el actor. Un espacio inexistente, ajeno o sin membresía activa recibe la misma denegación.
 *
 * Invariante: junto con withModuleAccess es la única entrada a un espacio, y la admisión es la
 * primera consulta tras fijar el espacio de la URL.
 */
export function withWorkspaceAccess<T>(
  pool: pg.Pool,
  request: AccessRequest,
  work: (access: WorkspaceAccess) => Promise<T>,
): Promise<T> {
  return withTransaction(pool, async (client) => {
    await setRequestScope.run(
      { authSubject: request.subject, workspaceId: request.workspaceId },
      client,
    );
    const [row] = await admitWorkspace.run(
      { workspaceId: request.workspaceId, subject: request.subject, actionClass: request.actionClass },
      client,
    );
    if (!row) throw accessDenied();
    return work(await enter(client, row));
  });
}

/**
 * Igual que withWorkspaceAccess, para una operación de un módulo: decide con los dos ejes y bloquea
 * también el derecho del módulo dueño del recurso (02 §6, ADR 0009). Sin derecho, un miembro recibe
 * «módulo no disponible» y quien no es miembro, la denegación de siempre.
 */
export function withModuleAccess<T>(
  pool: pg.Pool,
  request: AccessRequest & { moduleCode: string },
  work: (access: WorkspaceAccess) => Promise<T>,
): Promise<T> {
  return withTransaction(pool, async (client) => {
    await setRequestScope.run(
      { authSubject: request.subject, workspaceId: request.workspaceId },
      client,
    );
    const [row] = await admitModule.run(
      {
        workspaceId: request.workspaceId,
        subject: request.subject,
        moduleCode: request.moduleCode,
        actionClass: request.actionClass,
      },
      client,
    );
    if (!row) {
      const [member] = await findMembershipClasses.run(
        { workspaceId: request.workspaceId, subject: request.subject },
        client,
      );
      throw member && member.workspace_classes.length > 0
        ? rejection('module_unavailable')
        : accessDenied();
    }
    return work(await enter(client, row));
  });
}

/** Espacios donde la identidad del JWT tiene una membresía activa; sin identidad, ninguno. */
export function listMyWorkspaces(pool: pg.Pool, subject: string): Promise<WorkspaceSummary[]> {
  return withTransaction(pool, async (client) => {
    await setRequestScope.run({ authSubject: subject, workspaceId: '' }, client);
    const [identity] = await findIdentity.run({ subject }, client);
    if (!identity) return [];
    await setActor.run({ identityId: identity.id, principalId: '' }, client);
    const rows = await listMyWorkspacesQuery.run({ identityId: identity.id }, client);
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      status: visibleWorkspaceStatus.parse(row.status),
      isOwner: row.is_owner,
      institution: row.institution_name,
    }));
  });
}

/** Permisos vigentes del miembro en algún ámbito, sin filtrar por módulo. */
export async function listGrantedPermissions(access: WorkspaceAccess): Promise<string[]> {
  const rows = await listPermissionCodes.run(
    { workspaceId: access.workspace.id, principalId: access.principalId },
    access.client,
  );
  return rows.map((row) => row.permission_code);
}

/** Nombres de los roles vigentes del miembro, para mostrarlos; no autorizan nada. */
export async function listMemberRoles(access: WorkspaceAccess): Promise<string[]> {
  const rows = await listMemberRolesQuery.run(
    { workspaceId: access.workspace.id, principalId: access.principalId },
    access.client,
  );
  return rows.map((row) => row.name);
}

/** ¿Tiene el miembro el permiso en esa ubicación, por un rol de todo el espacio o de un ancestro? */
export async function hasPermissionAt(
  access: WorkspaceAccess,
  permission: string,
  locationId: string,
): Promise<boolean> {
  const [row] = await hasPermissionAtQuery.run(
    {
      workspaceId: access.workspace.id,
      principalId: access.principalId,
      permission,
      locationId,
    },
    access.client,
  );
  return row?.allowed ?? false;
}

const permissionDenied = () => new AppError('ACCESS_DENIED', 'No tienes permiso para esta acción');

/** Exige el permiso en algún ámbito: para consultas cuyo resultado se filtra después por ámbito. */
export async function requirePermission(access: WorkspaceAccess, permission: string): Promise<void> {
  if (!(await listGrantedPermissions(access)).includes(permission)) throw permissionDenied();
}

/** Exige el permiso con ámbito de todo el espacio: para lo que no pertenece a una ubicación. */
export async function requireWorkspacePermission(access: WorkspaceAccess, permission: string): Promise<void> {
  const [row] = await hasWorkspacePermissionQuery.run(
    { workspaceId: access.workspace.id, principalId: access.principalId, permission },
    access.client,
  );
  if (!row?.allowed) throw permissionDenied();
}

/** Exige el permiso en la ubicación de la operación (su ámbito o el de un ancestro). */
export async function requirePermissionAt(
  access: WorkspaceAccess,
  permission: string,
  locationId: string,
): Promise<void> {
  if (!(await hasPermissionAt(access, permission, locationId))) throw permissionDenied();
}

/** Ubicaciones donde aplica el permiso, con su descendencia; vacío si no lo tiene en ninguna. */
export async function permissionScope(access: WorkspaceAccess, permission: string): Promise<string[]> {
  const rows = await listPermissionScope.run(
    { workspaceId: access.workspace.id, principalId: access.principalId, permission },
    access.client,
  );
  return rows.map((row) => row.id);
}
