import { useMemo } from 'react';
import { useLabs } from './context';
import { ResolveRequest } from './inbox-resolution';
import { useSpaces } from './queries';
import { draftFrom, type RequestView } from './request-draft';
import { OpenRequest } from './request-page';
import { ReviewStep } from './request-review-step';
import { RequestHeading } from './request-status';

/**
 * Una solicitud recibida, de solo lectura: quién la pide, lo que llenó, los recursos con su ✔ ⚠ ✖ y el historial. Al
 * Administrador, con la solicitud enviada, se le suman «Pedir cambios» y «Rechazar».
 */
function InboxSheet({ request }: { request: RequestView }) {
  const { workspaceId, me, canReview } = useLabs();
  const spaces = useSpaces(workspaceId);
  const stored = useMemo(() => draftFrom(request), [request]);

  return (
    <div className="grid gap-4">
      <RequestHeading request={request} />
      <p className="break-words text-sm text-ink-muted">
        Pedida por <span className="font-medium text-ink">{request.requesterName}</span>
      </p>
      {canReview && request.status === 'submitted' ? <ResolveRequest workspaceId={workspaceId} request={request} /> : null}
      <ReviewStep request={request} draft={stored} spaces={spaces.data?.items ?? []} saved={request.lines} timeZone={me.workspace.timeZone} />
    </div>
  );
}

/** La hoja de una solicitud recibida (ADR 0023, L-01b). */
export function LabsInboxRequestPage() {
  return <OpenRequest parent="recibidas">{(request) => <InboxSheet key={request.id} request={request} />}</OpenRequest>;
}
