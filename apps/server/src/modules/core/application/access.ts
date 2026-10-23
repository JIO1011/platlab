import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { ActionClass, WorkspaceSummary } from '@platlab/contracts';
import { visibleWorkspaceStatus } from '@platlab/contracts';
import { setActor, setRequestScope } from '../../../platform/db/context.queries.js';
import { withTransaction } from '../../../platform/db/transaction.js';
import { AppError, accessDenied } from '../../../platform/errors.js';
import {
  admitAnyModule,
  admitModule,
  admitWorkspace,
  findIdentity,
  findMembershipClasses,
  listActiveMembers as listActiveMembersQuery,
  moduleAdmits as moduleAdmitsQuery,
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
 * «módulo no disponible» y quien no es miembro, la denegación de siempre. Con `alsoModule`, una
 * operación que escribe en dos módulos (ADR 0020) exige y bloquea también ese derecho.
 */
export function withModuleAccess<T>(
  pool: pg.Pool,
  request: AccessRequest & { moduleCode: string; alsoModule?: string | undefined },
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
        alsoModule: request.alsoModule ?? null,
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

/**
 * Para lo común a varios módulos, sin derecho propio (áreas y departamentos, ADR 0024): decide con los dos
 * ejes para cada módulo de `grants` y bloquea espacio, sus derechos y membresía como withModuleAccess. Lo
 * admite un módulo admitido para la clase de acción cuyo permiso (`grants[módulo]`) tiene el miembro;
 * `work` recibe esos módulos. Sin ninguno admitido, la decisión del primero; admitidos sin permiso, la
 * denegación de siempre.
 */
export function withAnyModuleAccess<T>(
  pool: pg.Pool,
  request: AccessRequest & { grants: Readonly<Record<string, string>> },
  work: (access: WorkspaceAccess, modules: string[]) => Promise<T>,
): Promise<T> {
  return withTransaction(pool, async (client) => {
    await setRequestScope.run({ authSubject: request.subject, workspaceId: request.workspaceId }, client);
    const rows = await admitAnyModule.run(
      {
        workspaceId: request.workspaceId,
        subject: request.subject,
        moduleCodes: Object.keys(request.grants),
        actionClass: request.actionClass,
      },
      client,
    );
    const admitted = rows.filter((row) => row.decision === 'admitted');
    const [first] = admitted.length > 0 ? admitted : rows;
    if (!first) {
      const [member] = await findMembershipClasses.run(
        { workspaceId: request.workspaceId, subject: request.subject },
        client,
      );
      throw member && member.workspace_classes.length > 0 ? rejection('module_unavailable') : accessDenied();
    }
    const access = await enter(client, first);
    const granted = await listGrantedPermissions(access);
    const modules = admitted
      .map((row) => row.module_code)
      .filter((code) => granted.includes(request.grants[code] ?? ''));
    if (modules.length === 0) throw new AppError('ACCESS_DENIED', 'No tienes permiso para esta acción');
    return work(access, modules);
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

/**
 * Permisos del miembro, leídos una vez por transacción: cada comprobación posterior no vuelve a la
 * base. Es seguro porque la admisión bloqueó la membresía (FOR SHARE) y un cambio de roles la
 * modifica, así que espera a que termine esta operación (02 §6).
 */
const grantedByAccess = new WeakMap<WorkspaceAccess, Promise<string[]>>();

/** Permisos vigentes del miembro, sin filtrar por módulo. */
export function listGrantedPermissions(access: WorkspaceAccess): Promise<string[]> {
  let granted = grantedByAccess.get(access);
  if (!granted) {
    granted = listPermissionCodes
      .run({ workspaceId: access.workspace.id, principalId: access.principalId }, access.client)
      .then((rows) => rows.map((row) => row.permission_code));
    grantedByAccess.set(access, granted);
  }
  return granted;
}

/** Miembros activos del espacio, por nombre: a quién se asigna un equipo o el encargo de un área. */
export function listActiveMembers(access: WorkspaceAccess): Promise<Array<{ id: string; name: string }>> {
  return listActiveMembersQuery.run({ workspaceId: access.workspace.id }, access.client);
}

/** Nombres de los roles vigentes del miembro, para mostrarlos; no autorizan nada. */
export async function listMemberRoles(access: WorkspaceAccess): Promise<string[]> {
  const rows = await listMemberRolesQuery.run(
    { workspaceId: access.workspace.id, principalId: access.principalId },
    access.client,
  );
  return rows.map((row) => row.name);
}

/** ¿Tiene el miembro el permiso? Los roles valen para todo el espacio (ADR 0008). */
export async function hasPermission(access: WorkspaceAccess, permission: string): Promise<boolean> {
  return (await listGrantedPermissions(access)).includes(permission);
}

/** Exige el permiso; sin él, la denegación de siempre. */
export async function requirePermission(access: WorkspaceAccess, permission: string): Promise<void> {
  if (!(await hasPermission(access, permission))) {
    throw new AppError('ACCESS_DENIED', 'No tienes permiso para esta acción');
  }
}

/**
 * ¿Admite hoy el módulo esta clase de acción en el espacio? Sin bloquear su derecho: solo para mostrar lo que un
 * módulo consulta de otro sin decidir nada con ello (ADR 0023). Lo que escribe en dos módulos usa `alsoModule`.
 */
export async function moduleAdmits(access: WorkspaceAccess, moduleCode: string, actionClass: ActionClass): Promise<boolean> {
  const [row] = await moduleAdmitsQuery.run({ workspaceId: access.workspace.id, moduleCode, actionClass }, access.client);
  return row?.admitted ?? false;
}
