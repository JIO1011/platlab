import { useMutation, useQueryClient } from '@tanstack/react-query';
import { product } from '@platlab/contracts';
import { z } from 'zod';
import { api, isApiError } from '../../app/api';
import { useModuleCommand } from '../../app/commands';
import { useReagentsKey } from './queries';

/** Envío de un comando de Reactivos: clave idempotente por envío y caché refrescada (`useModuleCommand`). */
export function useCommand<S extends z.ZodType>(
  workspaceId: string,
  path: string,
  schema: S,
  method: 'POST' | 'PUT' | 'PATCH' = 'POST',
) {
  return useModuleCommand(workspaceId, `/reagents${path}`, schema, useReagentsKey(workspaceId), method);
}

const archived = z.object({ id: z.string() });

/**
 * Quita una opción de las listas de motivos, destinos o áreas (la archiva: lo ya registrado la
 * conserva). Cada clic lleva su propia clave idempotente; refresca las listas con lo confirmado.
 */
export function useArchiveEntry(workspaceId: string, path: '/reasons' | '/destinations' | '/areas') {
  const queryClient = useQueryClient();
  const reagentsKey = useReagentsKey(workspaceId);
  return useMutation({
    mutationFn: (id: string) =>
      api(`/workspaces/${workspaceId}/reagents${path}/${id}/archive`, {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        schema: archived,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reagentsKey }),
  });
}

/**
 * Sube el PDF de la ficha de seguridad (ADR 0017), que reemplaza a la vigente. El reactivo va en cada
 * envío: en el ingreso solo se conoce al confirmarlo. Cada envío lleva su clave; repetirlo deja otra
 * ficha en el historial, nunca otro movimiento.
 */
export function useUploadSafetySheet(workspaceId: string) {
  const queryClient = useQueryClient();
  const reagentsKey = useReagentsKey(workspaceId);
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: Blob }) =>
      api(`/workspaces/${workspaceId}/reagents/products/${productId}/safety-sheet`, {
        method: 'PUT',
        file: { body: file, type: 'application/pdf' },
        idempotencyKey: crypto.randomUUID(),
        schema: product,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reagentsKey }),
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
  if (isApiError(error, 'CODE_TAKEN')) return `${error.message}: cambia el código o usa el sugerido.`;
  if (isApiError(error, 'NOT_FOUND')) return 'Ese registro ya no está disponible en este espacio.';
  if (isApiError(error, 'NETWORK')) return 'Sin conexión. Vuelve a intentarlo: si ya se registró, no se duplicará.';
  if (isApiError(error, 'VALIDATION_FAILED')) return error.message;
  return 'PlatLab no pudo registrar la acción. Vuelve a intentarlo.';
}
