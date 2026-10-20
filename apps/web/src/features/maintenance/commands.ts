import { asset, plan, provider, record, recordCreated, replacementDismissed } from '@platlab/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { api, isApiError } from '../../app/api';
import { commonErrorMessage, useModuleCommand } from '../../app/commands';
import { useUserKey, workspaceKey } from '../../app/queries';
import { useFileDownload } from '../../app/save-file';
import { historyApiSearch, type HistoryFilters } from './history-filters';
import { useMaintenanceKey } from './queries';

/**
 * Comandos de Mantenimiento (ADR 0020): cada hoja abre el suyo, con su clave idempotente, y la pantalla
 * cambia solo con lo que el servidor confirmó.
 */

/** «Nuevo proveedor» (Administrador). */
export function useCreateProvider(workspaceId: string) {
  return useModuleCommand(workspaceId, '/maintenance/providers', provider, useMaintenanceKey(workspaceId));
}

/** Editar un proveedor con la versión que se vio; `contact: null` lo borra. */
export function useUpdateProvider(workspaceId: string, providerId: string) {
  return useModuleCommand(workspaceId, `/maintenance/providers/${providerId}`, provider, useMaintenanceKey(workspaceId), 'PATCH');
}

/** Archivar un proveedor: deja de ofrecerse; sus registros lo conservan. */
export function useArchiveProvider(workspaceId: string, providerId: string) {
  return useModuleCommand(workspaceId, `/maintenance/providers/${providerId}/archive`, provider, useMaintenanceKey(workspaceId));
}

/** «Nuevo plan», de un tipo de equipo o de un equipo; el propio puede reemplazar al del tipo. */
export function useCreatePlan(workspaceId: string) {
  return useModuleCommand(workspaceId, '/maintenance/plans', plan, useMaintenanceKey(workspaceId));
}

/** Editar un plan con la versión que se vio. */
export function useUpdatePlan(workspaceId: string, planId: string) {
  return useModuleCommand(workspaceId, `/maintenance/plans/${planId}`, plan, useMaintenanceKey(workspaceId), 'PATCH');
}

/** Archivar un plan; si era propio de un equipo, este vuelve al plan de su tipo. */
export function useArchivePlan(workspaceId: string, planId: string) {
  return useModuleCommand(workspaceId, `/maintenance/plans/${planId}/archive`, plan, useMaintenanceKey(workspaceId));
}

/** Excluir un equipo del plan de su tipo, con motivo. */
export function useAddExclusion(workspaceId: string, planId: string) {
  return useModuleCommand(workspaceId, `/maintenance/plans/${planId}/exclusions`, plan, useMaintenanceKey(workspaceId));
}

/** Devolver un equipo excluido al plan: la exclusión se archiva, no se borra. */
export function useArchiveExclusion(workspaceId: string, planId: string, assetId: string) {
  return useModuleCommand(workspaceId, `/maintenance/plans/${planId}/exclusions/${assetId}/archive`, plan, useMaintenanceKey(workspaceId));
}

/**
 * «Registrar mantenimiento». Escribe en dos módulos (el estado físico lo aplica Equipos), así que refresca
 * toda la caché del espacio, no solo la de Mantenimiento.
 */
export function useCreateRecord(workspaceId: string) {
  return useModuleCommand(workspaceId, '/maintenance/records', recordCreated, workspaceKey(useUserKey(), workspaceId));
}

/**
 * «Corregir» (Administrador, M-01b): anula el registro y registra el correcto en un paso. Como registrar,
 * puede escribir en Equipos: refresca toda la caché del espacio.
 */
export function useCorrectRecord(workspaceId: string, recordId: string) {
  return useModuleCommand(workspaceId, `/maintenance/records/${recordId}/correction`, recordCreated, workspaceKey(useUserKey(), workspaceId));
}

/** «Anular» (Administrador, M-01b): el registro sigue a la vista y deja de contar para la próxima fecha. */
export function useVoidRecord(workspaceId: string, recordId: string) {
  return useModuleCommand(workspaceId, `/maintenance/records/${recordId}/void`, record, useMaintenanceKey(workspaceId));
}

/** «Descartar» de «Evaluar reemplazo» (Administrador, M-01c): oculta el aviso del equipo 6 meses, con motivo. */
export function useDismissReplacement(workspaceId: string, assetId: string) {
  return useModuleCommand(
    workspaceId,
    `/maintenance/assets/${assetId}/replacement-review`,
    replacementDismissed,
    useMaintenanceKey(workspaceId),
  );
}

/**
 * Adjunta el certificado PDF de un registro (uno por registro). La clave es la del registro: un reintento
 * tras un corte recibe la respuesta guardada y nunca sube un segundo archivo.
 */
export function useAttachCertificate(workspaceId: string) {
  const queryClient = useQueryClient();
  const maintenanceKey = useMaintenanceKey(workspaceId);
  const keys = useRef(new Map<string, string>());
  return useMutation({
    mutationFn: ({ recordId, file }: { recordId: string; file: Blob }) => {
      const idempotencyKey = keys.current.get(recordId) ?? crypto.randomUUID();
      keys.current.set(recordId, idempotencyKey);
      return api(`/workspaces/${workspaceId}/maintenance/records/${recordId}/certificate`, {
        method: 'POST',
        file: { body: file, type: 'application/pdf' },
        idempotencyKey,
        schema: record,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: maintenanceKey }),
  });
}

/**
 * «Cambiar estado» tras un No conforme: lo aplica Equipos con su permiso (`equipment.condition.change`) y su
 * historial, por su propia ruta. Cambia la ficha y el Inventario: refresca toda la caché del espacio.
 */
export function useChangeAssetCondition(workspaceId: string, assetId: string) {
  return useModuleCommand(workspaceId, `/equipment/assets/${assetId}/condition`, asset, workspaceKey(useUserKey(), workspaceId));
}

/** Mensaje para la persona según el código estable del error (02 §7). */
export function maintenanceErrorMessage(error: unknown): string {
  if (isApiError(error, 'VERSION_CONFLICT')) return 'Otra persona cambió el plan mientras lo llenabas: revisa la lista.';
  if (isApiError(error, 'NAME_TAKEN')) return error.message;
  if (isApiError(error, 'ACCESS_DENIED')) return 'No tienes permiso para esta acción.';
  if (isApiError(error, 'MODULE_READ_ONLY', 'MODULE_UNAVAILABLE', 'WORKSPACE_RESTRICTED')) {
    return 'Mantenimiento no admite cambios en este momento. Puedes consultar.';
  }
  if (isApiError(error, 'TRANSIENT_CONFLICT')) return 'Otra persona está cambiando este equipo. Vuelve a intentarlo: no se duplicará.';
  if (isApiError(error, 'REQUEST_RESOLVED')) return 'Otra persona ya solucionó ese incidente. Elige «Ninguno» o vuelve a abrir la hoja.';
  if (isApiError(error, 'NOT_FOUND')) return 'Ese equipo, ese plan o ese incidente ya no está disponible en este espacio.';
  return commonErrorMessage(error);
}

/**
 * «Excel» del Historial (M-01d), del Administrador: lo filtrado, con el nombre de archivo del servidor. Es una
 * consulta: no cambia nada, así que no lleva clave idempotente ni refresca la caché.
 */
export function useExportRecords(workspaceId: string) {
  return useFileDownload((filters: HistoryFilters) => `/workspaces/${workspaceId}/maintenance/records/export?${historyApiSearch(filters)}`);
}
