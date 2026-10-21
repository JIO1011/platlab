import { closure, labsForm, labsSettings, space } from '@platlab/contracts';
import { toast } from '@platlab/ui';
import { useQueryClient } from '@tanstack/react-query';
import { isApiError } from '../../app/api';
import { commonErrorMessage, useModuleCommand } from '../../app/commands';
import { useLabsKey } from './queries';

/**
 * Comandos de Laboratorios (ADR 0023): cada hoja abre el suyo, con su clave idempotente, y la pantalla cambia solo con
 * lo que el servidor confirmó. Un cambio de aforo, de horario o de un cierre mueve lo que ve el resto de la pantalla:
 * se refresca toda la caché de Laboratorios.
 */

/** La anticipación del espacio de trabajo (0 a 90 días). */
export function useSaveSettings(workspaceId: string) {
  return useModuleCommand(workspaceId, '/labs/settings', labsSettings, useLabsKey(workspaceId), 'PUT');
}

/** «Habilitar área»: un área activa del Núcleo con su aforo y su horario; un espacio archivado se reactiva con estos datos. */
export function useCreateSpace(workspaceId: string) {
  return useModuleCommand(workspaceId, '/labs/spaces', space, useLabsKey(workspaceId));
}

/** Editar el aforo o el horario con la versión que se vio. */
export function useUpdateSpace(workspaceId: string, areaId: string) {
  return useModuleCommand(workspaceId, `/labs/spaces/${areaId}`, space, useLabsKey(workspaceId), 'PATCH');
}

/** Archivar un espacio: deja de agendarse y sus cierres siguen; el área sigue en «Áreas». */
export function useArchiveSpace(workspaceId: string, areaId: string) {
  return useModuleCommand(workspaceId, `/labs/spaces/${areaId}/archive`, space, useLabsKey(workspaceId));
}

/** «Nuevo cierre»: de un espacio o, sin área, un feriado común a todos. */
export function useCreateClosure(workspaceId: string) {
  return useModuleCommand(workspaceId, '/labs/closures', closure, useLabsKey(workspaceId));
}

/** Anular un cierre: deja de contar y no se borra. */
export function useVoidClosure(workspaceId: string, closureId: string) {
  return useModuleCommand(workspaceId, `/labs/closures/${closureId}/void`, closure, useLabsKey(workspaceId));
}

/** «Nuevo formato»: parte de la plantilla estándar o duplica la última revisión de otro. */
export function useCreateForm(workspaceId: string) {
  return useModuleCommand(workspaceId, '/labs/forms', labsForm, useLabsKey(workspaceId));
}

/** Renombrar un formato con la versión que se vio. */
export function useRenameForm(workspaceId: string, formId: string) {
  return useModuleCommand(workspaceId, `/labs/forms/${formId}`, labsForm, useLabsKey(workspaceId), 'PATCH');
}

/** Archivar un formato: deja de ofrecerse para llenar y no se borra; sus revisiones y solicitudes siguen. */
export function useArchiveForm(workspaceId: string, formId: string) {
  return useModuleCommand(workspaceId, `/labs/forms/${formId}/archive`, labsForm, useLabsKey(workspaceId));
}

/** «Publicar revisión»: la revisión siguiente e inmutable de la hoja del formato. */
export function usePublishForm(workspaceId: string, formId: string) {
  return useModuleCommand(workspaceId, `/labs/forms/${formId}/revisions`, labsForm, useLabsKey(workspaceId));
}

/**
 * Otra persona cambió lo mismo mientras se editaba (VERSION_CONFLICT): avisa y vuelve a pedir lo de Laboratorios, para
 * que la pantalla muestre la versión vigente. Lo editado no se aplica sobre ella a ciegas.
 */
export function useVersionConflict(workspaceId: string) {
  const queryClient = useQueryClient();
  const labsKey = useLabsKey(workspaceId);
  return (what: string) => {
    toast.error(`Otra persona cambió ${what}`, { description: 'Se cargó la versión vigente: revísala y vuelve a editar.' });
    return queryClient.invalidateQueries({ queryKey: labsKey });
  };
}

/** Mensaje para la persona según el código estable del error (02 §7). */
export function labsErrorMessage(error: unknown): string {
  if (isApiError(error, 'ACCESS_DENIED')) return 'No tienes permiso para esta acción.';
  if (isApiError(error, 'MODULE_READ_ONLY', 'MODULE_UNAVAILABLE', 'WORKSPACE_RESTRICTED')) {
    return 'Laboratorios no admite cambios en este momento. Puedes consultar.';
  }
  if (isApiError(error, 'NOT_FOUND')) return 'Ese espacio, ese cierre o ese formato ya no está disponible en este espacio.';
  return commonErrorMessage(error);
}
