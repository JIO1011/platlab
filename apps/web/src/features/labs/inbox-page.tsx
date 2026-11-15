import { cn } from '@platlab/ui';
import { CodeTag } from '../../app/code-tag';
import { useLabs } from './context';
import { ReviewActions } from './inbox-resolution';
import type { RequestView } from './request-draft';
import { RequestHistory } from './request-history';
import { RequestHolds } from './request-holds';
import { RequestNotices } from './request-notices';
import { OpenRequest } from './request-page';
import { PaperSheet } from './request-readonly';
import { PracticeCode, RequestBadges } from './request-status';

/** Si quien mira puede responder esta solicitud: la revisa (`labs.request.review`) y está enviada. */
const reviewing = (canReview: boolean, request: Pick<RequestView, 'status'>): boolean => canReview && request.status === 'submitted';

/** La línea bajo el título: «SOL-0002», el código de su práctica si está programada, su estado y «Fuera de plazo». */
function RequestMeta({ request }: { request: RequestView }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <CodeTag>{request.code}</CodeTag>
      <PracticeCode codes={request.blockCodes} />
      <RequestBadges status={request.status} late={request.late} />
    </div>
  );
}

/**
 * Una solicitud recibida, de solo lectura, en una sola columna ancha: los avisos (solo si los hay), la planilla del
 * formato llena, la misma de Formatos, con el ✔ ⚠ ✖ de cada línea, el área e «Imprimir»; lo apartado por fecha (donde
 * quien lleva el bloque lo prepara, inicia y cierra) y el historial plegado al pie. Las acciones de quien revisa van
 * junto al título (y, en el móvil, al pie).
 */
function InboxSheet({ request }: { request: RequestView }) {
  const { canReview, me } = useLabs();
  return (
    // Con la barra de acciones fija al pie en el móvil, la pantalla deja su alto para que no tape nada.
    <div className={cn('mx-auto grid w-full max-w-[900px] gap-4 sm:gap-5', reviewing(canReview, request) && 'max-sm:-mt-4 max-sm:pb-24')}>
      <RequestMeta request={request} />
      <RequestNotices request={request} />
      <PaperSheet request={request} />
      <RequestHolds request={request} />
      <RequestHistory events={request.events} timeZone={me.workspace.timeZone} collapsible />
    </div>
  );
}

/** La hoja de una solicitud recibida (ADR 0023, L-01b): «Aprobar», «Pedir cambios» y «Rechazar» solo con la solicitud enviada y el permiso. Su título es el nombre del formato. */
export function LabsInboxRequestPage() {
  const { workspaceId, canReview, canSchedule } = useLabs();
  return (
    <OpenRequest
      parent="recibidas"
      titleOf={(request) => request.formName}
      actions={(request) => (reviewing(canReview, request) ? <ReviewActions key={request.id} workspaceId={workspaceId} request={request} canSchedule={canSchedule} /> : null)}
    >
      {(request) => <InboxSheet key={request.id} request={request} />}
    </OpenRequest>
  );
}
