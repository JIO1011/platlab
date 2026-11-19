import { memberDirectory, memberRole, pendingInvitation } from '@platlab/contracts';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { api, isApiError } from '../../app/api';
import { commonErrorMessage, useModuleCommand } from '../../app/commands';
import { useUserKey, workspaceKey } from '../../app/queries';

/**
 * Usuarios del Núcleo (ADR 0027): la lista del Propietario y sus comandos. Cada hoja abre el suyo, con su clave
 * idempotente, y la lista cambia solo con lo que el servidor confirmó.
 */
const membersKey = (user: string, workspaceId: string) => [...workspaceKey(user, workspaceId), 'members'] as const;

export function useMemberDirectory(workspaceId: string, enabled: boolean) {
  const user = useUserKey();
  return useQuery({
    queryKey: membersKey(user, workspaceId),
    queryFn: () => api(`/workspaces/${workspaceId}/members`, { schema: memberDirectory }),
    enabled,
  });
}

function useMembersCommand<S extends z.ZodType>(workspaceId: string, path: string, schema: S, method: 'POST' | 'PATCH' = 'POST') {
  return useModuleCommand(workspaceId, path, schema, membersKey(useUserKey(), workspaceId), method);
}

/** Suma un correo a la lista blanca; repetido o de un miembro responde EMAIL_TAKEN. */
export const useInviteMember = (workspaceId: string) => useMembersCommand(workspaceId, '/members', pendingInvitation);

export const useChangeRole = (workspaceId: string, membershipId: string) =>
  useMembersCommand(workspaceId, `/members/${membershipId}`, z.object({ membershipId: z.uuid(), role: memberRole }), 'PATCH');

/** Quita el acceso de un miembro o saca de la lista a quien todavía no se unió. */
export const useRevoke = (workspaceId: string, kind: 'member' | 'invitation', id: string) =>
  useMembersCommand(workspaceId, `${kind === 'member' ? '/members' : '/invitations'}/${id}/revoke`, z.unknown());

/** Mensaje para la persona según el código estable del error (02 §7). El correo repetido lo trata su campo. */
export function usersErrorMessage(error: unknown): string {
  if (isApiError(error, 'ACCESS_DENIED')) return 'Solo el Propietario gestiona los usuarios.';
  if (isApiError(error, 'NOT_FOUND')) return 'Ya cambió: actualiza la página para ver el estado actual.';
  if (isApiError(error, 'MODULE_READ_ONLY', 'MODULE_UNAVAILABLE', 'WORKSPACE_RESTRICTED')) {
    return 'El espacio no admite este cambio en su estado actual.';
  }
  if (isApiError(error, 'TRANSIENT_CONFLICT')) return 'Otra operación está en curso. Vuelve a intentarlo: no se duplicará.';
  return commonErrorMessage(error);
}
