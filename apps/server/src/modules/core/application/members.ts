import type pg from 'pg';
import {
  memberRole,
  type AcceptedInvitation,
  type InviteMemberRequest,
  type MemberDirectory,
  type MemberRole,
  type MyInvitations,
  type PendingInvitation,
} from '@platlab/contracts';
import { setActor, setAuthEmail, setRequestScope } from '../../../platform/db/context.queries.js';
import { withTransaction } from '../../../platform/db/transaction.js';
import { AppError, accessDenied } from '../../../platform/errors.js';
import { withIdempotency } from '../../../platform/idempotency/idempotency.js';
import {
  acceptInvitation as acceptInvitationQuery,
  admitJoin,
  currentRole,
  ensurePrincipal,
  findEmailUse,
  findInvitation,
  grantRole,
  insertInvitation,
  joinMembership,
  listMembers,
  listMyInvitations as listMyInvitationsQuery,
  listPendingInvitations,
  lockMember,
  revokeInvitation as revokeInvitationQuery,
  revokeMembership,
  revokeRoles,
  touchPresence,
  upsertIdentity,
} from '../infrastructure/members.queries.js';
import { admitMember, withWorkspaceAccess, type WorkspaceAccess } from './access.js';
import { recordAudit } from './audit.js';
import type { CommandRequest, QueryRequest } from './module-operations.js';

/**
 * Usuarios del Núcleo (ADR 0027): la lista blanca, el rol de cada miembro y su último acceso. Los gestiona solo el
 * Propietario; quien fue invitado se une con el correo verificado de su sesión, con una acción explícita.
 */

/** Sin entrar en el espacio por más de estos días, un miembro activo aparece «Sin actividad» (02 §12). */
const INACTIVE_AFTER_DAYS = 30;

/** Los roles de Usuarios, en el orden en que se elige el de quien tuviera varios. */
const memberRoles: string[] = memberRole.options;

const roleOf = (code: string | null | undefined): MemberRole | null => {
  const parsed = memberRole.safeParse(code);
  return parsed.success ? parsed.data : null;
};

function requireOwner(access: WorkspaceAccess): void {
  if (!access.isOwner) throw new AppError('ACCESS_DENIED', 'Solo el Propietario gestiona los usuarios');
}

/** Consulta del Propietario: la admisión de Core para consultar. */
function ownerQuery<T>(pool: pg.Pool, request: QueryRequest, work: (access: WorkspaceAccess) => Promise<T>): Promise<T> {
  return withWorkspaceAccess(pool, { ...request, actionClass: 'read_export' }, (access) => {
    requireOwner(access);
    return work(access);
  });
}

/**
 * Comando del Propietario: invitar y cambiar el rol son operación nueva; quitar acceso es resolver lo pendiente, que el
 * espacio admite también suspendido o en cierre. El acceso se comprueba antes de la clave idempotente.
 */
function ownerCommand<T>(
  pool: pg.Pool,
  request: CommandRequest,
  actionClass: 'new_operation' | 'resolve_pending',
  operation: string,
  input: unknown,
  work: (access: WorkspaceAccess) => Promise<T>,
): Promise<T> {
  return withWorkspaceAccess(pool, { ...request, actionClass }, (access) => {
    requireOwner(access);
    return withIdempotency(
      access.client,
      { workspaceId: access.workspace.id, principalId: access.principalId, operation, key: request.idempotencyKey, input },
      () => work(access),
    );
  });
}

/** GET /members: miembros, también los quitados, y la lista blanca pendiente. */
export function memberDirectory(pool: pg.Pool, request: QueryRequest): Promise<MemberDirectory> {
  return ownerQuery(pool, request, async (access) => {
    const workspaceId = access.workspace.id;
    const [members, invitations] = await Promise.all([
      listMembers.run({ workspaceId, roles: memberRoles, inactiveDays: INACTIVE_AFTER_DAYS }, access.client),
      listPendingInvitations.run({ workspaceId }, access.client),
    ]);
    return {
      members: members.map((row) => ({
        membershipId: row.membership_id,
        principalId: row.principal_id,
        name: row.name,
        email: row.email,
        isOwner: row.is_owner,
        role: roleOf(row.role),
        status: row.status === 'revoked' ? 'revoked' : 'active',
        joinedAt: row.joined_at.toISOString(),
        revokedAt: row.revoked_at?.toISOString() ?? null,
        lastSeenAt: row.last_seen_at?.toISOString() ?? null,
        inactive: row.inactive,
      })),
      invitations: invitations.flatMap((row): PendingInvitation[] => {
        const role = roleOf(row.role_code);
        return role
          ? [{ id: row.id, name: row.name, email: row.email, role, invitedAt: row.invited_at.toISOString() }]
          : [];
      }),
      inactiveAfterDays: INACTIVE_AFTER_DAYS,
    };
  });
}

/** POST /members: suma a la lista blanca; la persona queda pendiente hasta unirse con ese correo. */
export function inviteMember(pool: pg.Pool, request: CommandRequest, input: InviteMemberRequest): Promise<PendingInvitation> {
  return ownerCommand(pool, request, 'new_operation', 'core.member.invite', input, async (access) => {
    const workspaceId = access.workspace.id;
    const [use] = await findEmailUse.run({ workspaceId, email: input.email }, access.client);
    if (use?.member) throw new AppError('EMAIL_TAKEN', `${input.email} ya es miembro del espacio`);
    if (use?.pending) throw new AppError('EMAIL_TAKEN', `${input.email} ya está en la lista, pendiente de unirse`);
    const [row] = await insertInvitation.run(
      { workspaceId, email: input.email, name: input.name, role: input.role, principalId: access.principalId },
      access.client,
    );
    if (!row) throw new Error('La invitación no devolvió su identificador');
    await recordAudit(access, {
      action: 'core.member.invite',
      entityType: 'core.invitation',
      entityId: row.id,
      changes: { email: input.email, role: input.role },
    });
    return { id: row.id, name: input.name, email: input.email, role: input.role, invitedAt: row.invited_at.toISOString() };
  });
}

/** POST /invitations/:invitationId/revoke: la saca de la lista blanca antes de que se una. */
export function revokeInvitation(pool: pg.Pool, request: CommandRequest, invitationId: string): Promise<{ id: string }> {
  return ownerCommand(pool, request, 'resolve_pending', 'core.invitation.revoke', { invitationId }, async (access) => {
    const [row] = await revokeInvitationQuery.run(
      { workspaceId: access.workspace.id, invitationId, principalId: access.principalId },
      access.client,
    );
    if (!row) throw new AppError('NOT_FOUND', 'La invitación ya no está pendiente');
    await recordAudit(access, { action: 'core.invitation.revoke', entityType: 'core.invitation', entityId: row.id, changes: { email: row.email } });
    return { id: row.id };
  });
}

/** Bloquea al miembro para cambiarlo: activo y no Propietario, que no cambia aquí (O-02). */
async function lockTarget(access: WorkspaceAccess, membershipId: string) {
  const [target] = await lockMember.run({ workspaceId: access.workspace.id, membershipId }, access.client);
  if (!target || target.status !== 'active') throw new AppError('NOT_FOUND', 'El usuario ya no está activo en el espacio');
  if (target.is_owner) throw new AppError('VALIDATION_FAILED', 'El Propietario no cambia de rol ni se quita aquí');
  return target;
}

/** Deja al principal con un solo rol de Usuarios; sus otros roles (Responsable de fiscalizados) no cambian. */
async function replaceRole(access: WorkspaceAccess, principalId: string, role: MemberRole): Promise<void> {
  const workspaceId = access.workspace.id;
  await revokeRoles.run({ workspaceId, principalId, roles: memberRoles }, access.client);
  await grantRole.run({ workspaceId, principalId, role }, access.client);
}

/** PATCH /members/:membershipId: cambia su rol; los permisos nuevos valen desde la siguiente operación. */
export function changeMemberRole(
  pool: pg.Pool,
  request: CommandRequest,
  membershipId: string,
  role: MemberRole,
): Promise<{ membershipId: string; role: MemberRole }> {
  return ownerCommand(pool, request, 'new_operation', 'core.member.role', { membershipId, role }, async (access) => {
    const target = await lockTarget(access, membershipId);
    const [current] = await currentRole.run(
      { workspaceId: access.workspace.id, principalId: target.principal_id, roles: memberRoles },
      access.client,
    );
    if (current?.role_code !== role) {
      await replaceRole(access, target.principal_id, role);
      await recordAudit(access, {
        action: 'core.member.role',
        entityType: 'core.membership',
        entityId: membershipId,
        changes: { role: { from: current?.role_code ?? null, to: role } },
      });
    }
    return { membershipId, role };
  });
}

/** POST /members/:membershipId/revoke: le quita el acceso y todos sus roles; sus registros quedan. */
export function revokeMember(pool: pg.Pool, request: CommandRequest, membershipId: string): Promise<{ membershipId: string }> {
  return ownerCommand(pool, request, 'resolve_pending', 'core.member.revoke', { membershipId }, async (access) => {
    const workspaceId = access.workspace.id;
    const target = await lockTarget(access, membershipId);
    const revoked = await revokeRoles.run({ workspaceId, principalId: target.principal_id, roles: null }, access.client);
    await revokeMembership.run({ workspaceId, membershipId }, access.client);
    await recordAudit(access, {
      action: 'core.member.revoke',
      entityType: 'core.membership',
      entityId: membershipId,
      changes: { roles: revoked.map((row) => row.role_code) },
    });
    return { membershipId };
  });
}

/** Último acceso del miembro al abrir el espacio (GET /me), como máximo una escritura por hora. */
export async function recordPresence(access: WorkspaceAccess): Promise<void> {
  await touchPresence.run({ workspaceId: access.workspace.id, membershipId: access.membershipId }, access.client);
}

/** GET /v1/me/invitations: las pendientes para el correo de la sesión; sin correo, ninguna. */
export function listMyInvitations(pool: pg.Pool, subject: string, email: string | null): Promise<MyInvitations> {
  if (!email) return Promise.resolve({ invitations: [] });
  return withTransaction(pool, async (client) => {
    await setRequestScope.run({ authSubject: subject, workspaceId: '' }, client);
    await setAuthEmail.run({ authEmail: email }, client);
    const rows = await listMyInvitationsQuery.run({ email }, client);
    return {
      invitations: rows.flatMap((row) => {
        const role = roleOf(row.role_code);
        return role
          ? [{ id: row.id, workspaceId: row.workspace_id, workspaceName: row.workspace_name, institution: row.institution_name, role }]
          : [];
      }),
    };
  });
}

/**
 * POST /workspaces/:workspaceId/invitations/:invitationId/accept: une a la persona con el rol de su invitación, en una
 * transacción. Bloquea en el orden fijo: espacio, su membresía (nueva o reactivada) y después la invitación (02 §6).
 * Repetirlo cuando ya se unió devuelve lo mismo.
 */
export function acceptInvitation(
  pool: pg.Pool,
  request: QueryRequest & { email: string | null },
  invitationId: string,
): Promise<AcceptedInvitation> {
  const { subject, workspaceId, email } = request;
  if (!email) return Promise.reject(new AppError('NOT_FOUND', 'No hay una invitación para tu correo'));
  return withTransaction(pool, async (client) => {
    await setRequestScope.run({ authSubject: subject, workspaceId }, client);
    await setAuthEmail.run({ authEmail: email }, client);
    const [admission] = await admitJoin.run({ workspaceId }, client);
    if (!admission) throw accessDenied();
    if (admission.decision !== 'admitted') throw new AppError('WORKSPACE_RESTRICTED', 'El espacio no admite nuevos miembros en su estado actual');

    const [invitation] = await findInvitation.run({ workspaceId, invitationId, email }, client);
    if (!invitation || invitation.status === 'revoked') throw new AppError('NOT_FOUND', 'No hay una invitación para tu correo');
    const role = roleOf(invitation.role_code);
    if (!role) throw new Error(`Rol desconocido en la invitación: ${invitation.role_code}`);

    const [identity] = await upsertIdentity.run({ subject, displayName: invitation.display_name, email }, client);
    if (!identity) throw new Error('La identidad no devolvió su identificador');
    // RLS solo deja crear la membresía y el principal de la identidad del contexto.
    await setActor.run({ identityId: identity.id, principalId: '' }, client);
    if (invitation.status === 'accepted') {
      const access = await admitMember(client, { subject, workspaceId, actionClass: 'read_export' });
      if (access.membershipId !== invitation.membership_id) throw new AppError('NOT_FOUND', 'No hay una invitación para tu correo');
      return { workspaceId, membershipId: access.membershipId };
    }

    const [membership] = await joinMembership.run({ workspaceId, identityId: identity.id }, client);
    if (!membership) throw new Error('La membresía no devolvió su identificador');
    const [accepted] = await acceptInvitationQuery.run({ workspaceId, invitationId, membershipId: membership.id }, client);
    // Otra pestaña la aceptó o el Propietario la anuló mientras tanto: se revierte todo.
    if (!accepted) throw new AppError('NOT_FOUND', 'La invitación ya no está pendiente');
    const [principal] = await ensurePrincipal.run({ workspaceId, membershipId: membership.id }, client);
    if (!principal) throw new Error('El principal no devolvió su identificador');

    const access = await admitMember(client, { subject, workspaceId, actionClass: 'new_operation' });
    await replaceRole(access, principal.id, role);
    await recordAudit(access, {
      action: 'core.invitation.accept',
      entityType: 'core.invitation',
      entityId: invitationId,
      changes: { role },
    });
    return { workspaceId, membershipId: membership.id };
  });
}
