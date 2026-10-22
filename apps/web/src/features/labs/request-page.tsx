import { REQUEST_CANCELLABLE, REQUEST_EDITABLE } from '@platlab/contracts';
import { Button, Skeleton, toast } from '@platlab/ui';
import { useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { isApiError } from '../../app/api';
import { WithBack } from '../../app/back-button';
import { ConfirmArchive } from '../../app/confirm-archive';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, useCancelRequest, useVersionConflict } from './commands';
import { useLabs } from './context';
import { useRequest, useSpaces } from './queries';
import { RequestEditor } from './request-editor';
import { draftFrom, type RequestView } from './request-draft';
import { ReviewStep } from './request-review-step';
import { RequestHeading } from './request-status';

/** Cancelar la solicitud con su confirmación aquí mismo: no se deshace desde esta pantalla. */
function CancelRequest({ workspaceId, request, onDismiss }: { workspaceId: string; request: RequestView; onDismiss: () => void }) {
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

/** Lo que pidió quien revisó, arriba y a la vista, mientras la solicitud espera su corrección. */
function ChangesNotice({ request }: { request: RequestView }) {
  const asked = [...request.events].reverse().find((event) => event.action === 'changes_requested');
  if (request.status !== 'changes_requested' || !asked) return null;
  return (
    <div role="status" className="grid gap-0.5 rounded-control bg-warning-soft px-3 py-2.5 text-sm">
      <p className="font-semibold text-warning">Pidieron cambios</p>
      {asked.reason ? <p className="break-words text-ink">{asked.reason}</p> : null}
      <p className="text-ink-muted">Corrígela y vuelve a enviarla.</p>
    </div>
  );
}

/**
 * La solicitud abierta: su código y estado, el aviso de cambios solicitados y, si es de quien la mira y el estado lo
 * admite, el llenado en tres pasos; si no, el resumen de solo lectura con su historial.
 */
function RequestSheet({ request }: { request: RequestView }) {
  const { workspaceId, me, canOperate } = useLabs();
  const spaces = useSpaces(workspaceId);
  const [cancelling, setCancelling] = useState(false);
  const editable = canOperate && request.mine && REQUEST_EDITABLE.includes(request.status);
  const cancellable = canOperate && request.mine && REQUEST_CANCELLABLE.includes(request.status);
  const items = spaces.data?.items ?? [];
  const stored = useMemo(() => draftFrom(request), [request]);

  return (
    <div className="grid gap-4">
      <RequestHeading request={request}>
        {cancellable && !cancelling ? (
          <Button variant="ghost" size="sm" className="h-11 sm:ml-auto sm:h-8" aria-haspopup="dialog" onClick={() => setCancelling(true)}>
            Cancelar solicitud
          </Button>
        ) : null}
      </RequestHeading>
      {cancelling && cancellable ? <CancelRequest workspaceId={workspaceId} request={request} onDismiss={() => setCancelling(false)} /> : null}
      <ChangesNotice request={request} />
      {editable ? (
        <RequestEditor request={request} spaces={items} />
      ) : (
        <ReviewStep request={request} draft={stored} spaces={items} saved={request.lines} timeZone={me.workspace.timeZone} />
      )}
    </div>
  );
}

/**
 * Abre una solicitud por su id en la sección de la que viene (`parent`): su código, la carga y el error. Quien la usa
 * pone lo que se ve de la solicitud ya leída.
 */
export function OpenRequest({ parent, children }: { parent: 'solicitudes' | 'recibidas'; children: (request: RequestView) => ReactNode }) {
  const { requestId = '' } = useParams();
  const { workspaceId } = useLabs();
  const request = useRequest(workspaceId, requestId);

  return (
    <WithBack parent={`/e/${workspaceId}/laboratorios/${parent}`}>
      <SectionHeader title={request.data?.code ?? 'Solicitud'} updatedAt={request.dataUpdatedAt} />
      <div className="mt-6">
        {request.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : request.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={request.error} onRetry={() => void request.refetch()} />
          </div>
        ) : (
          children(request.data)
        )}
      </div>
    </WithBack>
  );
}

/** La hoja de una solicitud propia (ADR 0023, L-01b): se llena en tres pasos, se guarda como borrador y se envía. */
export function LabsRequestPage() {
  return <OpenRequest parent="solicitudes">{(request) => <RequestSheet key={request.id} request={request} />}</OpenRequest>;
}
