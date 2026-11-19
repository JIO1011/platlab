import { loan, material, materialMinimumResponse, materialMovementResponse } from '@platlab/contracts';
import { isApiError } from '../../app/api';
import { commonErrorMessage, useModuleCommand } from '../../app/commands';
import { useMaterialsKey } from './queries';

/**
 * Comandos de Materiales (ADR 0025): cada hoja abre el suyo, con su clave idempotente, y la pantalla cambia solo con
 * lo que el servidor confirmó (nada de UI optimista sobre existencias).
 */

/** «Registrar material» (Administrador). */
export const useCreateMaterial = (workspaceId: string) =>
  useModuleCommand(workspaceId, '/materials/products', material, useMaterialsKey(workspaceId));

/** Editar nombre y unidad de un material. */
export const useUpdateMaterial = (workspaceId: string, productId: string) =>
  useModuleCommand(workspaceId, `/materials/products/${productId}`, material, useMaterialsKey(workspaceId), 'PATCH');

/** Fijar o quitar el mínimo de un material. */
export const useSetMinimum = (workspaceId: string, productId: string) =>
  useModuleCommand(workspaceId, `/materials/products/${productId}/minimum`, materialMinimumResponse, useMaterialsKey(workspaceId), 'PUT');

/** «Ingresar», «Dar salida» y «Ajustar»: cada uno es una operación del libro. */
export const useReceipt = (workspaceId: string) =>
  useModuleCommand(workspaceId, '/materials/receipts', materialMovementResponse, useMaterialsKey(workspaceId));
export const useIssue = (workspaceId: string) =>
  useModuleCommand(workspaceId, '/materials/issues', materialMovementResponse, useMaterialsKey(workspaceId));
export const useAdjustment = (workspaceId: string) =>
  useModuleCommand(workspaceId, '/materials/adjustments', materialMovementResponse, useMaterialsKey(workspaceId));

/** «Nuevo préstamo»: el vale con sus líneas. */
export const useLend = (workspaceId: string) => useModuleCommand(workspaceId, '/materials/loans', loan, useMaterialsKey(workspaceId));

/** «Registrar devolución» de un vale, con la versión que se vio. */
export const useReturn = (workspaceId: string, loanId: string) =>
  useModuleCommand(workspaceId, `/materials/loans/${loanId}/returns`, loan, useMaterialsKey(workspaceId));

/** Mensaje para la persona según el código estable del error (02 §7). */
export function materialsErrorMessage(error: unknown): string {
  if (isApiError(error, 'INSUFFICIENT_STOCK')) return 'No hay disponible suficiente. Revisa la cantidad: lo prestado no se puede sacar.';
  if (isApiError(error, 'VERSION_CONFLICT')) return 'Otra persona cambió este préstamo mientras lo llenabas. Ciérralo y ábrelo de nuevo.';
  if (isApiError(error, 'NAME_TAKEN')) return error.message;
  if (isApiError(error, 'ACCESS_DENIED')) return 'No tienes permiso para esta acción.';
  if (isApiError(error, 'MODULE_READ_ONLY', 'MODULE_UNAVAILABLE', 'WORKSPACE_RESTRICTED')) {
    return 'Materiales no admite cambios en este momento. Puedes consultar.';
  }
  if (isApiError(error, 'TRANSIENT_CONFLICT')) return 'Otra persona está cambiando este material. Vuelve a intentarlo: no se duplicará.';
  if (isApiError(error, 'NOT_FOUND')) return 'Ese material, esa ubicación o ese préstamo ya no está disponible en este espacio.';
  return commonErrorMessage(error);
}
