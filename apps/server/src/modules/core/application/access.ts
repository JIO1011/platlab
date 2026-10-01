import type pg from 'pg';
import type { WorkspaceSummary } from '@platlab/contracts';
import { visibleWorkspaceStatus } from '@platlab/contracts';
import { setActor, setRequestScope } from '../../../platform/db/context.queries.js';
import { withTransaction } from '../../../platform/db/transaction.js';
import { accessDenied } from '../../../platform/errors.js';
import {
  findIdentity,
  hasPermissionAt as hasPermissionAtQuery,
  listMyWorkspaces as listMyWorkspacesQuery,
  listPermissionCodes,
  lockMembership,
} from '../infrastructure/access.queries.js';

/** Miembro verificado dentro de la transacción del caso de uso (02 §5). */
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
}

/**
 * Abre la transacción del caso de uso con el miembro verificado (02 §5, pasos 2–4):
 * fija el contexto, lee espacio y membresía con FOR SHARE y solo entonces fija el actor.
 * La membresía se comprueba en cada petición, así que una revocación aplica en la siguiente.
 * Un espacio inexistente, ajeno o sin membresía activa recibe la misma denegación.
 *
 * Invariante: es la única entrada a un espacio y `lockMembership` es la primera consulta tras
 * fijar el espacio de la URL. Nada se lee ni se escribe antes de verificar la membresía.
 */
export function withWorkspaceAccess<T>(
  pool: pg.Pool,
  request: { subject: string; workspaceId: string },
  work: (access: WorkspaceAccess) => Promise<T>,
): Promise<T> {
  return withTransaction(pool, async (client) => {
    await setRequestScope.run(
      { authSubject: request.subject, workspaceId: request.workspaceId },
      client,
    );
    const [member] = await lockMembership.run(
      { workspaceId: request.workspaceId, subject: request.subject },
      client,
    );
    if (!member) throw accessDenied();
    await setActor.run(
      { identityId: member.identity_id, principalId: member.principal_id },
      client,
    );
    return work({
      client,
      workspace: {
        id: member.workspace_id,
        code: member.code,
        name: member.name,
        status: visibleWorkspaceStatus.parse(member.status),
        timeZone: member.time_zone,
      },
      identityId: member.identity_id,
      displayName: member.display_name,
      membershipId: member.membership_id,
      principalId: member.principal_id,
      isOwner: member.is_owner,
    });
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
    }));
  });
}

/** Permisos vigentes del miembro en algún ámbito; sirven para componer la interfaz. */
export async function listEffectivePermissions(access: WorkspaceAccess): Promise<string[]> {
  const rows = await listPermissionCodes.run(
    { workspaceId: access.workspace.id, principalId: access.principalId },
    access.client,
  );
  return rows.map((row) => row.permission_code);
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
