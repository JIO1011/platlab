import { requestReasonRequest } from '@platlab/contracts';
import { Button, Field, Textarea, toast } from '@platlab/ui';
import { useState } from 'react';
import { isApiError } from '../../app/api';
import { labsErrorMessage, useRejectRequest, useRequestChanges, useRequestResolved, useVersionConflict } from './commands';
import type { RequestView } from './request-draft';

type Resolution = 'changes' | 'reject';

const resolutions: Record<Resolution, { trigger: string; field: string; text: (requester: string) => string; action: string; done: string }> = {
  changes: {
    trigger: 'Pedir cambios',
    field: 'Qué debe corregir',
    text: (requester) => `${requester} verá este motivo, podrá corregir la solicitud y volver a enviarla.`,
    action: 'Pedir cambios',
    done: 'Cambios solicitados',
  },
  reject: {
    trigger: 'Rechazar',
    field: 'Motivo del rechazo',
    text: (requester) => `${requester} verá este motivo. La solicitud quedará rechazada y no se deshace desde esta pantalla.`,
    action: 'Rechazar solicitud',
    done: 'Solicitud rechazada',
  },
};

interface ReasonFormProps {
  workspaceId: string;
  request: RequestView;
  resolution: Resolution;
  mutation: ReturnType<typeof useRejectRequest>;
  onDismiss: () => void;
}

/** El motivo (hasta 500 caracteres) y la confirmación aquí mismo. Nada cambia hasta que el servidor confirma. */
function ReasonForm({ workspaceId, request, resolution, mutation, onDismiss }: ReasonFormProps) {
  const conflict = useVersionConflict(workspaceId);
  const resolved = useRequestResolved(workspaceId);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const copy = resolutions[resolution];

  const submit = async () => {
    const parsed = requestReasonRequest.safeParse({ expectedVersion: request.version, reason });
    if (!parsed.success) {
      setError('Escribe el motivo: quien la pidió lo verá.');
      return;
    }
    try {
      await mutation.mutateAsync(parsed.data);
      toast.success(copy.done, { description: request.code });
    } catch (failure) {
      if (isApiError(failure, 'VERSION_CONFLICT')) {
        void conflict('esta solicitud');
        onDismiss();
      } else if (isApiError(failure, 'REQUEST_RESOLVED')) {
        void resolved();
        onDismiss();
      } else {
        setError(labsErrorMessage(failure));
      }
    }
  };

  return (
    <form
      aria-label={copy.trigger}
      className="grid gap-3 rounded-control bg-surface-sunken p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <p className="text-sm text-ink">{copy.text(request.requesterName)}</p>
      <Field label={copy.field} required hint="Hasta 500 caracteres." error={error}>
        <Textarea
          autoFocus
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError(undefined);
          }}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          variant={resolution === 'reject' ? 'secondary' : 'primary'}
          className={resolution === 'reject' ? 'h-11 border-transparent bg-danger text-white hover:bg-danger/90 sm:h-10' : 'h-11 sm:h-10'}
          loading={mutation.isPending}
        >
          {copy.action}
        </Button>
        <Button variant="ghost" className="h-11 sm:h-10" disabled={mutation.isPending} onClick={onDismiss}>
          Volver
        </Button>
      </div>
    </form>
  );
}

/**
 * «Pedir cambios» y «Rechazar» de una solicitud enviada (`labs.request.review`): cada uno abre aquí mismo el motivo
 * obligatorio y su confirmación.
 */
export function ResolveRequest({ workspaceId, request }: { workspaceId: string; request: RequestView }) {
  const changes = useRequestChanges(workspaceId, request.id);
  const reject = useRejectRequest(workspaceId, request.id);
  const [open, setOpen] = useState<Resolution | null>(null);

  if (open !== null) {
    return (
      <ReasonForm
        key={open}
        workspaceId={workspaceId}
        request={request}
        resolution={open}
        mutation={open === 'changes' ? changes : reject}
        onDismiss={() => setOpen(null)}
      />
    );
  }
  return (
    <div className="flex flex-wrap gap-2 max-sm:[&>*]:flex-1">
      {(Object.keys(resolutions) as Resolution[]).map((resolution) => (
        <Button key={resolution} className="h-11 sm:h-10" onClick={() => setOpen(resolution)}>
          {resolutions[resolution].trigger}
        </Button>
      ))}
    </div>
  );
}
