import type { RequestSummary } from '@platlab/contracts';
import { Badge, Button, Segmented, Skeleton, StatePanel } from '@platlab/ui';
import { Inbox } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useLabs } from './context';
import { useRequests } from './queries';
import { RequestBadges } from './request-status';
import { exceptionsText, filterInbox, firstDateText, inboxFilters, type InboxFilter } from './request-summary';

/** Un dato por línea en el móvil y todos en una, separados por puntos, desde `sm`. */
function Facts({ facts }: { facts: readonly string[] }) {
  return (
    <span className="grid gap-0.5 text-sm text-ink-muted sm:flex sm:flex-wrap sm:gap-x-2">
      {facts.map((fact, at) => (
        <Fragment key={`${at}-${fact}`}>
          {at > 0 ? (
            <span aria-hidden className="max-sm:hidden">
              ·
            </span>
          ) : null}
          <span className="min-w-0 break-words">{fact}</span>
        </Fragment>
      ))}
    </span>
  );
}

/** Una solicitud recibida: código, estado, quién la pide, formato y primera fecha, y los recursos que faltan por revisar. */
function InboxRow({ workspaceId, request }: { workspaceId: string; request: RequestSummary }) {
  const pending = exceptionsText(request.exceptions);
  return (
    <li className="rounded-card bg-surface shadow-raised">
      <Link
        to={`/e/${workspaceId}/laboratorios/recibidas/${request.id}`}
        className="grid gap-1.5 rounded-card px-4 py-4 transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:px-5"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <CodeTag>{request.code}</CodeTag>
          <RequestBadges status={request.status} late={request.late} />
          {pending ? <Badge tone="warning">{pending}</Badge> : null}
        </span>
        <span className={request.title ? 'break-words font-semibold text-ink' : 'text-ink-muted'}>{request.title ?? 'Sin título'}</span>
        <Facts facts={[request.requesterName, request.formName, firstDateText(request)]} />
      </Link>
    </li>
  );
}

/**
 * Recibidas (ADR 0023, L-01b): las solicitudes enviadas por los solicitantes, lo urgente primero (el servidor las
 * ordena). Por defecto, las que esperan respuesta; «Todas» suma las que ya tienen una.
 */
export function LabsInboxPage() {
  const { workspaceId } = useLabs();
  const requests = useRequests(workspaceId, 'inbox');
  const [filter, setFilter] = useState<InboxFilter>('submitted');
  const received = requests.data?.items ?? [];
  const items = filterInbox(received, filter);
  const othersOnly = filter === 'submitted' && received.length > 0;

  return (
    <>
      <SectionHeader title="Recibidas" updatedAt={requests.dataUpdatedAt} />
      <Segmented label="Qué solicitudes ver" value={filter} options={inboxFilters} onValueChange={setFilter} className="mt-6" />
      <div className="mt-4">
        {requests.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-40 rounded-card" />
          </div>
        ) : requests.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={requests.error} onRetry={() => void requests.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel
              icon={Inbox}
              title={othersOnly ? 'No hay solicitudes por revisar' : 'Aún no recibes solicitudes'}
              description={
                othersOnly
                  ? 'Las demás ya tienen respuesta o esperan a quien las pidió. Pásate a «Todas» para verlas.'
                  : 'Cuando alguien envíe una solicitud, aparecerá aquí con lo más urgente primero.'
              }
              action={
                othersOnly ? (
                  <Button className="h-11 sm:h-10" onClick={() => setFilter('all')}>
                    Ver todas
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="grid gap-3 sm:gap-4">
            {items.map((request) => (
              <InboxRow key={request.id} workspaceId={workspaceId} request={request} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
