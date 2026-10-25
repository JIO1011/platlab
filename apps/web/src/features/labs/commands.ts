import { closure, formLogo, labsForm, labsRequest, labsSettings, period, scheduledActivity, space } from '@platlab/contracts';
import { toast } from '@platlab/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, isApiError } from '../../app/api';
import { commonErrorMessage, useModuleCommand } from '../../app/commands';
import { workspaceKey } from '../../app/queries';
import { useSession } from '../../app/session';
import type { LogoFile } from './form-logo';
import { useLabsKey } from './queries';
import type { DropPlan } from './schedule-placement';

/**
 * Comandos de Laboratorios (ADR 0023): cada hoja abre el suyo, con su clave idempotente, y la pantalla cambia solo con
 * lo que el servidor confirmó. Un cambio de aforo, de horario o de un cierre mueve lo que ve el resto de la pantalla:
 * se refresca toda la caché de Laboratorios.
 */

/** La anticipación del espacio de trabajo (0 a 90 días). */
export function useSaveSettings(workspaceId: string) {
  return useModuleCommand(workspaceId, '/labs/settings', labsSettings, useLabsKey(workspaceId), 'PUT');
}

/** «Habilitar para prácticas»: un área activa del Núcleo con su aforo y su horario; un espacio archivado se reactiva con estos datos. */
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

/** «Nuevo período» (sin `periodId`) o editar uno con la versión que se vio. */
export function useSavePeriod(workspaceId: string, periodId?: string) {
  return useModuleCommand(workspaceId, periodId ? `/labs/periods/${periodId}` : '/labs/periods', period, useLabsKey(workspaceId), periodId ? 'PATCH' : 'POST');
}

/** Archivar un período: deja de contar para agendar y no se borra; las solicitudes que ya lo llevan en su código siguen. */
export function useArchivePeriod(workspaceId: string, periodId: string) {
  return useModuleCommand(workspaceId, `/labs/periods/${periodId}/archive`, period, useLabsKey(workspaceId));
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

/** «Nueva solicitud» (`{ formId }`) o «Duplicar» (`{ from }`): un borrador con su número fijo. */
export function useCreateRequest(workspaceId: string) {
  return useModuleCommand(workspaceId, '/labs/requests', labsRequest, useLabsKey(workspaceId));
}

/** «Guardar borrador»: la solicitud entera, con la versión que la persona vio. */
export function useSaveRequest(workspaceId: string, requestId: string) {
  return useModuleCommand(workspaceId, `/labs/requests/${requestId}`, labsRequest, useLabsKey(workspaceId), 'PUT');
}

/** «Enviar»: el servidor valida lo esencial, las fechas y los períodos. */
export function useSubmitRequest(workspaceId: string, requestId: string) {
  return useModuleCommand(workspaceId, `/labs/requests/${requestId}/submit`, labsRequest, useLabsKey(workspaceId));
}

/** «Cancelar solicitud»: mientras no esté programada ni cerrada. */
export function useCancelRequest(workspaceId: string, requestId: string) {
  return useModuleCommand(workspaceId, `/labs/requests/${requestId}/cancel`, labsRequest, useLabsKey(workspaceId));
}

/** «Pedir cambios»: la solicitud enviada vuelve a quien la pidió, con el motivo. */
export function useRequestChanges(workspaceId: string, requestId: string) {
  return useModuleCommand(workspaceId, `/labs/requests/${requestId}/request-changes`, labsRequest, useLabsKey(workspaceId));
}

/** «Rechazar»: la solicitud enviada queda rechazada, con el motivo. */
export function useRejectRequest(workspaceId: string, requestId: string) {
  return useModuleCommand(workspaceId, `/labs/requests/${requestId}/reject`, labsRequest, useLabsKey(workspaceId));
}

/** «Programar»: una fecha de una solicitud enviada pasa a ser un bloque, con la versión de la solicitud que se vio. */
export function useScheduleActivity(workspaceId: string) {
  return useModuleCommand(workspaceId, '/labs/activities', scheduledActivity, useLabsKey(workspaceId));
}

/** «Mover»: otra área, otra hora u otro responsable el mismo día, con la versión del bloque que se vio. */
export function useMoveActivity(workspaceId: string, activityId: string) {
  return useModuleCommand(workspaceId, `/labs/activities/${activityId}`, scheduledActivity, useLabsKey(workspaceId), 'PATCH');
}

/**
 * Soltar un bloque o una solicitud en el Cronograma: programa (POST) o mueve (PATCH) sin hoja de confirmación. Cada soltar
 * es un envío distinto, con su propia clave idempotente; la respuesta llega cuando la caché de Laboratorios y el Inicio ya
 * muestran lo confirmado, sin pintar nada antes.
 */
export function useDropActivity(workspaceId: string) {
  const queryClient = useQueryClient();
  const labsKey = useLabsKey(workspaceId);
  const user = useSession().session?.user.id ?? 'anónimo';
  return useMutation({
    mutationFn: (plan: DropPlan) =>
      api(`/workspaces/${workspaceId}/labs/activities${plan.kind === 'move' ? `/${plan.activityId}` : ''}`, {
        method: plan.kind === 'move' ? 'PATCH' : 'POST',
        body: plan.body,
        idempotencyKey: crypto.randomUUID(),
        schema: scheduledActivity,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: labsKey }),
        queryClient.invalidateQueries({ queryKey: [...workspaceKey(user, workspaceId), 'home'] }),
      ]);
    },
  });
}

/**
 * Sube el logo del membrete del formato (ADR 0023): el cuerpo es la imagen y devuelve su dirección, que va en el borrador
 * y se publica con la revisión siguiente. No cambia nada visible hasta publicar, así que no refresca la caché.
 */
export function useUploadFormLogo(workspaceId: string, formId: string) {
  return useMutation({
    mutationFn: (logo: LogoFile) =>
      api(`/workspaces/${workspaceId}/labs/forms/${formId}/logo`, { method: 'PUT', file: logo, idempotencyKey: crypto.randomUUID(), schema: formLogo }),
  });
}

/** Vuelve a pedir lo de Laboratorios para que la pantalla muestre lo vigente. */
export function useRefreshLabs(workspaceId: string) {
  const queryClient = useQueryClient();
  const labsKey = useLabsKey(workspaceId);
  return () => queryClient.invalidateQueries({ queryKey: labsKey });
}

/**
 * Otra persona cambió lo mismo mientras se editaba (VERSION_CONFLICT): avisa y vuelve a pedir lo de Laboratorios, para
 * que la pantalla muestre la versión vigente. Lo editado no se aplica sobre ella a ciegas.
 */
export function useVersionConflict(workspaceId: string) {
  const refresh = useRefreshLabs(workspaceId);
  return (what: string) => {
    toast.error(`Otra persona cambió ${what}`, { description: 'Se cargó la versión vigente: revísala y vuelve a editar.' });
    return refresh();
  };
}

/** Otra persona ya resolvió la solicitud (REQUEST_RESOLVED): avisa y carga su estado vigente. */
export function useRequestResolved(workspaceId: string) {
  const refresh = useRefreshLabs(workspaceId);
  return () => {
    toast.error('Otra persona ya resolvió esta solicitud', { description: 'Se cargó su estado vigente.' });
    return refresh();
  };
}

/** Mensaje para la persona según el código estable del error (02 §7). */
export function labsErrorMessage(error: unknown): string {
  if (isApiError(error, 'ACCESS_DENIED')) return 'No tienes permiso para esta acción.';
  if (isApiError(error, 'MODULE_READ_ONLY', 'MODULE_UNAVAILABLE', 'WORKSPACE_RESTRICTED')) {
    return 'Laboratorios no admite cambios en este momento. Puedes consultar.';
  }
  if (isApiError(error, 'NOT_FOUND')) return 'Ese espacio, cierre, período, formato o solicitud ya no está disponible en este espacio.';
  return commonErrorMessage(error);
}
