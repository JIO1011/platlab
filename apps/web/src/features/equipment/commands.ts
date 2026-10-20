import { useMutation, useQueryClient } from '@tanstack/react-query';
import { areaManager, asset, assetDocument, assetType, fault, location, type AssetDocumentKind } from '@platlab/contracts';
import { api, isApiError } from '../../app/api';
import { commonErrorMessage, useModuleCommand } from '../../app/commands';
import { useFileDownload } from '../../app/save-file';
import { assetFilterSearch, type AssetQuery } from './asset-filters';
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

/** «Cambiar estado»: motivo siempre; resultado al volver a operativo. Dar de baja es definitivo. */
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

/**
 * Sube un PDF a los documentos del equipo (E-01e, Administrador): su tipo y su nombre van en la consulta y el archivo,
 * en el cuerpo. Cada envío lleva su clave; repetirlo agrega otro documento, nunca sobrescribe uno.
 */
export function useUploadAssetDocument(workspaceId: string, assetId: string) {
  const queryClient = useQueryClient();
  const equipmentKey = useEquipmentKey(workspaceId);
  return useMutation({
    mutationFn: ({ kind, title, file }: { kind: AssetDocumentKind; title: string; file: Blob }) =>
      api(`/workspaces/${workspaceId}/equipment/assets/${assetId}/documents?${new URLSearchParams({ kind, title })}`, {
        method: 'POST',
        file: { body: file, type: 'application/pdf' },
        idempotencyKey: crypto.randomUUID(),
        schema: assetDocument,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: equipmentKey }),
  });
}

/** «Quitar» un documento (E-01e, Administrador): lo archiva y deja de verse; el archivo se conserva y no hay deshacer. */
export function useArchiveAssetDocument(workspaceId: string, assetId: string) {
  const queryClient = useQueryClient();
  const equipmentKey = useEquipmentKey(workspaceId);
  return useMutation({
    mutationFn: (documentId: string) =>
      api(`/workspaces/${workspaceId}/equipment/assets/${assetId}/documents/${documentId}/archive`, {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        schema: assetDocument,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: equipmentKey }),
  });
}

/** Encargado de un área (E-01c, Administrador): un miembro activo, o `null` para quitarlo. */
export function useAssignAreaManager(workspaceId: string, areaId: string) {
  return useModuleCommand(workspaceId, `/equipment/areas/${areaId}/manager`, areaManager, useEquipmentKey(workspaceId), 'PUT');
}

/**
 * «Exportar a Excel» del Informe (ADR 0017, 0019): lo filtrado, con el nombre de archivo del servidor.
 * Es una consulta: no cambia nada, así que no lleva clave idempotente ni refresca la caché.
 */
export function useExportAssets(workspaceId: string) {
  return useFileDownload((query: AssetQuery) => `/workspaces/${workspaceId}/equipment/assets/export?${assetFilterSearch(query)}`);
}

/** «Reportar incidente»: tipo, descripción y si el equipo se puede seguir usando. */
export function useReportFault(workspaceId: string) {
  return useModuleCommand(workspaceId, '/equipment/faults', fault, useEquipmentKey(workspaceId));
}

/** «Empezar reparación» y «Marcar como solucionado»; solucionar lleva el resultado y si vuelve a operativo. */
export function useFaultStep(workspaceId: string, faultId: string, step: 'attend' | 'resolve') {
  return useModuleCommand(workspaceId, `/equipment/faults/${faultId}/${step}`, fault, useEquipmentKey(workspaceId));
}

/** Mensaje para la persona según el código estable del error (02 §7). */
export function equipmentErrorMessage(error: unknown): string {
  if (isApiError(error, 'CODE_TAKEN')) return `${error.message}: cambia el código o déjalo vacío para que se genere.`;
  if (isApiError(error, 'NAME_TAKEN')) return error.message;
  if (isApiError(error, 'REQUEST_RESOLVED')) return 'Otra persona ya avanzó este incidente: actualiza para ver su estado.';
  if (isApiError(error, 'ACCESS_DENIED')) return 'No tienes permiso para esta acción.';
  if (isApiError(error, 'MODULE_READ_ONLY', 'MODULE_UNAVAILABLE', 'WORKSPACE_RESTRICTED')) {
    return 'Equipos no admite cambios en este momento. Puedes consultar el inventario.';
  }
  if (isApiError(error, 'TRANSIENT_CONFLICT')) return 'Otra persona está cambiando este equipo. Vuelve a intentarlo: no se duplicará.';
  if (isApiError(error, 'NOT_FOUND')) return 'Ese equipo ya no está disponible en este espacio.';
  return commonErrorMessage(error);
}
