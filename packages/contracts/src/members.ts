import { z } from 'zod';
import { text } from './common.js';

/**
 * Usuarios del Núcleo (ADR 0027), bajo /v1/workspaces/:workspaceId: la lista blanca, los roles y el último acceso.
 * Solo el Propietario los consulta y los cambia; cada comando es idempotente.
 */

/** Roles que se asignan en Usuarios: uno por persona. Docente, Estudiante y Visita tienen los mismos permisos. */
export const memberRole = z.enum(['admin', 'operator', 'teacher', 'student', 'visitor']);

/** Un correo en minúsculas y sin espacios, como lo guarda la base. */
export const memberEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^@\s]+@[^@\s]+$/, 'Correo no válido');

export const member = z.object({
  membershipId: z.uuid(),
  principalId: z.uuid(),
  name: z.string(),
  /** Se conoce desde que la persona se une con su correo; null en cuentas anteriores a la lista blanca. */
  email: z.string().nullable(),
  isOwner: z.boolean(),
  /** Su rol en Usuarios; null si no tiene ninguno de ellos (el Propietario opera sin rol asignado). */
  role: memberRole.nullable(),
  status: z.enum(['active', 'revoked']),
  joinedAt: z.iso.datetime({ offset: true }),
  revokedAt: z.iso.datetime({ offset: true }).nullable(),
  /** Último acceso al espacio; null si nunca entró. */
  lastSeenAt: z.iso.datetime({ offset: true }).nullable(),
  /** Activo sin entrar en más de 30 días (o nunca, si se unió hace más de 30) (02 §12). */
  inactive: z.boolean(),
});

export const pendingInvitation = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: memberRole,
  invitedAt: z.iso.datetime({ offset: true }),
});

/** GET /members: miembros (también los quitados) y la lista blanca pendiente. */
export const memberDirectory = z.object({
  members: z.array(member),
  invitations: z.array(pendingInvitation),
  inactiveAfterDays: z.number().int().positive(),
});

/** POST /members: suma a la lista blanca. Un correo que ya es miembro o ya está pendiente responde EMAIL_TAKEN. */
export const inviteMemberRequest = z.object({ name: text(200), email: memberEmail, role: memberRole }).strict();

/** PATCH /members/:membershipId: cambia su rol. */
export const changeMemberRoleRequest = z.object({ role: memberRole }).strict();

export const memberParams = z.object({ workspaceId: z.uuid(), membershipId: z.uuid() });
export const invitationParams = z.object({ workspaceId: z.uuid(), invitationId: z.uuid() });

/** GET /v1/me/invitations: invitaciones pendientes para el correo de la sesión, en cualquier espacio. */
export const myInvitations = z.object({
  invitations: z.array(
    z.object({
      id: z.uuid(),
      workspaceId: z.uuid(),
      workspaceName: z.string(),
      institution: z.string().nullable(),
      role: memberRole,
    }),
  ),
});

/** POST …/invitations/:invitationId/accept: la persona ya es miembro del espacio. */
export const acceptedInvitation = z.object({ workspaceId: z.uuid(), membershipId: z.uuid() });

export type MemberRole = z.infer<typeof memberRole>;
export type Member = z.infer<typeof member>;
export type PendingInvitation = z.infer<typeof pendingInvitation>;
export type MemberDirectory = z.infer<typeof memberDirectory>;
export type InviteMemberRequest = z.infer<typeof inviteMemberRequest>;
export type MyInvitations = z.infer<typeof myInvitations>;
export type AcceptedInvitation = z.infer<typeof acceptedInvitation>;
