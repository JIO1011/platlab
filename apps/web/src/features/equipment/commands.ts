import { useMutation, useQueryClient } from '@tanstack/react-query';
import { asset, assetType, fault, location } from '@platlab/contracts';
import { api, isApiError } from '../../app/api';
import { useModuleCommand } from '../../app/commands';
import type { PhotoType } from './photo';
import { useEquipmentKey } from './queries';

/**
 * Comandos de Equipos (ADR 0019): cada hoja abre el suyo, con su clave idempotente, y la pantalla
 * cambia solo con lo que el servidor confirmó.
 */

/** «Registrar equipo»: devuelve la ficha creada. */
export function useCreateAsset(workspaceId: string) {
  return useModuleCommand(workspaceId, '/equipment/assets', asset, useEquipmentKey(workspaceId));
}

/** «Editar ficha»: solo lo enviado; null borra el dato. */
export function useUpdateAsset(workspaceId: string, assetId: string) {
  return useModuleCommand(workspaceId, `/equipment/assets/${assetId}`, asset, useEquipmentKey(workspaceId), 'PATCH');
}

/** «Cambiar condición»: motivo siempre; resultado al volver a operativo. Dar de baja es definitivo. */
export function useChangeCondition(workspaceId: string, assetId: string) {
  return useModuleCommand(workspaceId, `/equipment/assets/${assetId}/condition`, asset, useEquipmentKey(workspaceId));
}

/** «Trasladar equipo»: destino activo del espacio y nota opcional. */
export function useTransferAsset(workspaceId: string, assetId: string) {
  return useModuleCommand(workspaceId, `/equipment/assets/${assetId}/transfers`, asset, useEquipmentKey(workspaceId));
}

/** «+ Agregar» tipo de equipo desde el alta (Administrador). */
export function useCreateAssetType(workspaceId: string) {
  return useModuleCommand(workspaceId, '/equipment/asset-types', assetType, useEquipmentKey(workspaceId));
}

/** Crear una ubicación de Core desde el selector por niveles (Administrador, ADR 0015). */
export function useCreateEquipmentLocation(workspaceId: string) {
  return useModuleCommand(workspaceId, '/equipment/locations', location, useEquipmentKey(workspaceId));
}

/**
 * Sube la foto del equipo (ADR 0019), ya reducida con `shrinkPhoto`; reemplaza a la vigente. El equipo va
 * en cada envío: en el alta solo se conoce al confirmarlo. Cada envío lleva su clave; repetirlo deja otra
 * foto en el historial, nunca otro equipo.
 */
export function useUploadAssetPhoto(workspaceId: string) {
  const queryClient = useQueryClient();
  const equipmentKey = useEquipmentKey(workspaceId);
  return useMutation({
    mutationFn: ({ assetId, photo }: { assetId: string; photo: { body: Blob; type: PhotoType } }) =>
      api(`/workspaces/${workspaceId}/equipment/assets/${assetId}/photo`, {
        method: 'PUT',
        file: photo,
        idempotencyKey: crypto.randomUUID(),
        schema: asset,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: equipmentKey }),
  });
}

/** «Reportar falla»: tipo, descripción y si el equipo se puede seguir usando. */
export function useReportFault(workspaceId: string) {
  return useModuleCommand(workspaceId, '/equipment/faults', fault, useEquipmentKey(workspaceId));
}

/** «Atender», «Resolver» y «Cerrar» una falla; resolver lleva el resultado y si vuelve a operativo. */
export function useFaultStep(workspaceId: string, faultId: string, step: 'attend' | 'resolve' | 'close') {
  return useModuleCommand(workspaceId, `/equipment/faults/${faultId}/${step}`, fault, useEquipmentKey(workspaceId));
}

/** Mensaje para la persona según el código estable del error (02 §7). */
export function equipmentErrorMessage(error: unknown): string {
  if (isApiError(error, 'CODE_TAKEN')) return `${error.message}: cambia el código o déjalo vacío para que se genere.`;
  if (isApiError(error, 'NAME_TAKEN')) return error.message;
  if (isApiError(error, 'REQUEST_RESOLVED')) return 'Otra persona ya avanzó esta falla: actualiza para ver su estado.';
  if (isApiError(error, 'ACCESS_DENIED')) return 'No tienes permiso para esta acción.';
  if (isApiError(error, 'MODULE_READ_ONLY', 'MODULE_UNAVAILABLE', 'WORKSPACE_RESTRICTED')) {
    return 'Equipos no admite cambios en este momento. Puedes consultar el inventario.';
  }
  if (isApiError(error, 'TRANSIENT_CONFLICT')) return 'Otra persona está cambiando este equipo. Vuelve a intentarlo: no se duplicará.';
  if (isApiError(error, 'NOT_FOUND')) return 'Ese equipo ya no está disponible en este espacio.';
  if (isApiError(error, 'NETWORK')) return 'Sin conexión. Vuelve a intentarlo: si ya se registró, no se duplicará.';
  if (isApiError(error, 'VALIDATION_FAILED')) return error.message;
  return 'PlatLab no pudo registrar el cambio. Vuelve a intentarlo.';
}
