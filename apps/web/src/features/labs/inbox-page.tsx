import { Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@platlab/ui';
import { CodeTag } from '../../app/code-tag';
import { useLabs } from './context';
import { ReviewActions } from './inbox-resolution';
import type { RequestView } from './request-draft';
import { RequestFigures } from './request-figures';
import { RequestHistory } from './request-history';
import { RequestHolds } from './request-holds';
import { OpenRequest } from './request-page';
import { PaperSheet } from './request-readonly';
import { ResourcesCard } from './request-resources';
import { ReviewCard } from './request-review';
import { RequestBadges } from './request-status';

/** Si quien mira puede responder esta solicitud: la revisa (`labs.request.review`) y está enviada. */
const reviewing = (canReview: boolean, request: Pick<RequestView, 'status'>): boolean => canReview && request.status === 'submitted';

/** La línea bajo el título: «SOL-0002 · Diego Docente · Química Analítica · Ingeniería Química» y el estado. */
function RequestMeta({ request }: { request: RequestView }) {
  const facts = [request.requesterName, request.subject, request.career].filter((fact): fact is string => Boolean(fact));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <CodeTag>{request.code}</CodeTag>
      <span className="min-w-0 break-words text-sm text-ink-muted">
        {facts.map((fact, at) => (
          <span key={fact}>
            {at > 0 ? ' · ' : null}
            <span className={at === 0 ? 'font-medium text-ink' : undefined}>{fact}</span>
          </span>
        ))}
      </span>
      <RequestBadges status={request.status} late={request.late} />
    </div>
  );
}

/**
 * Una solicitud recibida, de solo lectura: quién la pide, las cuatro cifras de lo pedido y, en «Resumen», los recursos
 * con su barra, la revisión (lo que el servidor comprobó), lo apartado en cada fecha programada y el historial; en «Hoja»,
 * el formato llenado, que se puede imprimir. Las acciones de quien revisa van junto al título (y, en el móvil, al pie).
 */
function InboxSheet({ request }: { request: RequestView }) {
  const { me, canReview } = useLabs();
  return (
    // Con la barra de acciones fija al pie en el móvil, la pantalla deja su alto para que no tape nada.
    <div className={cn('grid gap-5 sm:gap-6', reviewing(canReview, request) && 'max-sm:-mt-4 max-sm:pb-24')}>
      <RequestMeta request={request} />
      <RequestFigures request={request} />
      <Tabs defaultValue="summary">
        <TabsList className="print:hidden">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="sheet">Hoja</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="grid gap-5 sm:gap-6">
              <ResourcesCard request={request} />
              <RequestHolds request={request} />
            </div>
            <div className="grid gap-5 sm:gap-6">
              <ReviewCard request={request} />
              <RequestHistory events={request.events} timeZone={me.workspace.timeZone} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="sheet">
          <PaperSheet request={request} showFormat />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** La hoja de una solicitud recibida (ADR 0023, L-01b): «Aprobar», «Pedir cambios» y «Rechazar» solo con la solicitud enviada y el permiso. */
export function LabsInboxRequestPage() {
  const { workspaceId, canReview, canSchedule } = useLabs();
  return (
    <OpenRequest
      parent="recibidas"
      actions={(request) => (reviewing(canReview, request) ? <ReviewActions key={request.id} workspaceId={workspaceId} request={request} canSchedule={canSchedule} /> : null)}
    >
      {(request) => <InboxSheet key={request.id} request={request} />}
    </OpenRequest>
  );
}
