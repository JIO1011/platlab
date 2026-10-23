import { useLabs } from './context';
import { ResolveRequest } from './inbox-resolution';
import type { RequestView } from './request-draft';
import { OpenRequest } from './request-page';
import { FilledRequest } from './request-readonly';
import { RequestHeading } from './request-status';

/**
 * Una solicitud recibida, de solo lectura: quién la pide y la hoja del formato llena, con los recursos y su ✔ ⚠ ✖, que se
 * puede imprimir; el historial va al pie. Al Administrador, con la solicitud enviada, se le suman «Pedir cambios» y «Rechazar».
 */
function InboxSheet({ request }: { request: RequestView }) {
  const { workspaceId, canReview } = useLabs();

  return (
    <div className="grid gap-4">
      <RequestHeading request={request} />
      <p className="break-words text-sm text-ink-muted">
        Pedida por <span className="font-medium text-ink">{request.requesterName}</span>
      </p>
      {canReview && request.status === 'submitted' ? <ResolveRequest workspaceId={workspaceId} request={request} /> : null}
      <FilledRequest request={request} />
    </div>
  );
}

/** La hoja de una solicitud recibida (ADR 0023, L-01b). */
export function LabsInboxRequestPage() {
  return <OpenRequest parent="recibidas">{(request) => <InboxSheet key={request.id} request={request} />}</OpenRequest>;
}
