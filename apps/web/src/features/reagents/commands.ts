import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { z } from 'zod';
import { api, isApiError } from '../../app/api';
import { useReagentsKey, workspaceKey } from '../../app/queries';
import { useSession } from '../../app/session';

/**
 * Envío de un comando de Reactivos. La clave idempotente nace al abrir la hoja y se reutiliza
 * en cada reintento del mismo envío (02 §7): un doble clic o un reintento tras un corte nunca
 * registra dos veces. Sin actualización optimista: la tabla se refresca con lo confirmado.
 */
export function useCommand<S extends z.ZodType>(workspaceId: string, path: string, schema: S) {
  const queryClient = useQueryClient();
  const reagentsKey = useReagentsKey(workspaceId);
  const user = useSession().session?.user.id ?? 'anónimo';
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  return useMutation({
    mutationFn: (body: unknown) =>
      api(`/workspaces/${workspaceId}/reagents${path}`, { method: 'POST', body, idempotencyKey, schema }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reagentsKey }),
        queryClient.invalidateQueries({ queryKey: [...workspaceKey(user, workspaceId), 'home'] }),
      ]);
    },
  });
}

/** Mensaje para la persona según el código estable del error (02 §7). */
export function commandErrorMessage(error: unknown): string {
  if (isApiError(error, 'INSUFFICIENT_STOCK')) return 'No hay saldo disponible suficiente en ese frasco.';
  if (isApiError(error, 'REQUEST_RESOLVED')) return 'Otra persona ya resolvió esta solicitud.';
  if (isApiError(error, 'ACCESS_DENIED')) return 'No tienes permiso para esta acción en esta ubicación.';
  if (isApiError(error, 'MODULE_READ_ONLY', 'MODULE_UNAVAILABLE', 'WORKSPACE_RESTRICTED')) {
    return 'Reactivos no admite registrar movimientos en este momento. Puedes consultar el inventario.';
  }
  if (isApiError(error, 'TRANSIENT_CONFLICT')) {
    return 'Otra persona está registrando en la misma ubicación. Vuelve a intentarlo: no se duplicará.';
  }
  if (isApiError(error, 'NOT_FOUND')) return 'Ese registro ya no está disponible en este espacio.';
  if (isApiError(error, 'NETWORK')) return 'Sin conexión. Vuelve a intentarlo: si ya se registró, no se duplicará.';
  if (isApiError(error, 'VALIDATION_FAILED')) return error.message;
  return 'PlatLab no pudo registrar la acción. Vuelve a intentarlo.';
}

/** Errores de un contrato Zod por campo, con mensajes en español para los casos genéricos. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    if (result[field]) continue;
    if (issue.code === 'too_small' || (issue.code === 'invalid_type' && issue.input === undefined)) {
      result[field] = 'Este dato es obligatorio.';
    } else if (issue.code === 'invalid_format' && issue.format === 'uuid') {
      result[field] = 'Elige una opción de la lista.';
    } else if (issue.code === 'too_big') {
      result[field] = 'El texto es demasiado largo.';
    } else {
      result[field] = issue.message;
    }
  }
  return result;
}
