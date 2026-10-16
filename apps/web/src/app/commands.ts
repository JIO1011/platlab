import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import type { z } from 'zod';
import { api } from './api';
import { workspaceKey } from './queries';
import { useSession } from './session';

/**
 * Envío de un comando de un módulo. La clave idempotente nace al abrir la hoja y se reutiliza en cada
 * reintento del mismo envío (02 §7): un doble clic o un reintento tras un corte nunca registra dos
 * veces. Confirmado un envío, la clave se renueva: la misma hoja puede enviar otro distinto. Sin
 * actualización optimista: se refrescan la caché del módulo (`moduleKey`) y el Inicio con lo confirmado.
 */
export function useModuleCommand<S extends z.ZodType>(
  workspaceId: string,
  /** Ruta bajo el espacio, con el módulo: `/reagents/issues`, `/equipment/assets`. */
  path: string,
  schema: S,
  moduleKey: QueryKey,
  method: 'POST' | 'PUT' | 'PATCH' = 'POST',
) {
  const queryClient = useQueryClient();
  const user = useSession().session?.user.id ?? 'anónimo';
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  return useMutation({
    mutationFn: (body: unknown) => api(`/workspaces/${workspaceId}${path}`, { method, body, idempotencyKey, schema }),
    onSuccess: async () => {
      setIdempotencyKey(crypto.randomUUID());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: moduleKey }),
        queryClient.invalidateQueries({ queryKey: [...workspaceKey(user, workspaceId), 'home'] }),
      ]);
    },
  });
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
