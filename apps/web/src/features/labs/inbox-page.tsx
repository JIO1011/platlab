import { useLabs } from './context';
import { ResolveRequest } from './inbox-resolution';
import type { RequestView } from './request-draft';
import { OpenRequest } from './request-page';
import { ReviewCard } from './request-review';
import { FilledRequest } from './request-readonly';
import { RequestHeading } from './request-status';

/**
 * Una solicitud recibida, de solo lectura: quién la pide, la tarjeta de revisión (lo que el servidor comprobó, ✔ ⚠ ✖, y, al
 * Administrador con la solicitud enviada, «Pedir cambios» y «Rechazar») y la hoja del formato llena, que se puede imprimir; el historial va al pie.
 */
function InboxSheet({ request }: { request: RequestView }) {
  const { workspaceId, canReview } = useLabs();

  return (
    <div className="grid gap-6">
      <RequestHeading request={request}>
        <span className="min-w-0 break-words text-sm text-ink-muted">
          Pedida por <span className="font-medium text-ink">{request.requesterName}</span>
        </span>
      </RequestHeading>
      <ReviewCard request={request}>{canReview && request.status === 'submitted' ? <ResolveRequest workspaceId={workspaceId} request={request} /> : null}</ReviewCard>
      <FilledRequest request={request} />
    </div>
  );
}

/** La hoja de una solicitud recibida (ADR 0023, L-01b). */
export function LabsInboxRequestPage() {
  return <OpenRequest parent="recibidas">{(request) => <InboxSheet key={request.id} request={request} />}</OpenRequest>;
}
