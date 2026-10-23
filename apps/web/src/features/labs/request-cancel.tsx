import { toast } from '@platlab/ui';
import { useState } from 'react';
import { isApiError } from '../../app/api';
import { ConfirmArchive } from '../../app/confirm-archive';
import { labsErrorMessage, useCancelRequest, useVersionConflict } from './commands';
import type { RequestView } from './request-draft';

/** Cancelar la solicitud con su confirmación aquí mismo: no se deshace desde esta pantalla. */
export function CancelRequest({ workspaceId, request, onDismiss }: { workspaceId: string; request: RequestView; onDismiss: () => void }) {
  const cancel = useCancelRequest(workspaceId, request.id);
  const conflict = useVersionConflict(workspaceId);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setError(null);
    try {
      await cancel.mutateAsync({ expectedVersion: request.version });
      toast.success('Solicitud cancelada', { description: request.code });
    } catch (failure) {
      if (isApiError(failure, 'VERSION_CONFLICT')) {
        void conflict('esta solicitud');
        onDismiss();
      } else {
        setError(labsErrorMessage(failure));
      }
    }
  };
  return (
    <ConfirmArchive
      label={`Cancelar la solicitud ${request.code}`}
      text={`${request.code} quedará cancelada y ya no se podrá abrir para editarla. Si después la necesitas, duplícala desde Mis solicitudes.`}
      action="Cancelar solicitud"
      dismiss="Conservarla"
      pending={cancel.isPending}
      error={error}
      onConfirm={() => void confirm()}
      onCancel={onDismiss}
    />
  );
}
