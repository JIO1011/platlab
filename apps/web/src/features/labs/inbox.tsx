import { Badge, Button, Skeleton, StatePanel } from '@platlab/ui';
import { CalendarX, CircleCheck, Clock, FilePenLine, Inbox, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { SectionHeader } from '../../app/section-header';
import { StatButton } from '../../app/stat-button';
import { QueryErrorState } from '../../app/states';
import { useLabs } from './context';
import { useRequests } from './queries';
import { RequestItem, RequestList, RequestSection } from './request-list';
import { exceptionsText, filterInbox, firstDateText, inboxCounts, type InboxFilter } from './request-summary';

/** Lo que dice la lista de cada filtro: su título, la frase bajo él y qué decir si no hay ninguna. */
const filterTexts: Record<InboxFilter, { title: string; hint: string; empty: string }> = {
  submitted: { title: 'Por revisar', hint: 'Lo más urgente primero.', empty: 'No hay solicitudes por revisar' },
  late: { title: 'Fuera de plazo', hint: 'Entraron sin la anticipación que pide el espacio y aún esperan respuesta.', empty: 'Ninguna solicitud está fuera de plazo' },
  resources: { title: 'Con recursos por revisar', hint: 'Tienen líneas con aviso o error en sus recursos.', empty: 'Ninguna solicitud tiene recursos por revisar' },
  changes: { title: 'Cambios pedidos', hint: 'Esperan a que quien las pidió las corrija y las vuelva a enviar.', empty: 'Ninguna solicitud espera cambios' },
  all: { title: 'Todas las recibidas', hint: 'Toca una cifra de arriba para ver solo esas.', empty: 'Aún no recibes solicitudes' },
};

const figureSkeleton = [0, 1, 2, 3];

/** Una cifra con su filtro: ámbar solo la que avisa de algo fuera de lo normal (`attention`) y solo si hay algo; sin nada, el texto lo dice. */
function Figure({
  filter,
  active,
  onPress,
  count,
  idle,
  hint,
  icon,
  idleIcon = icon,
  attention = true,
}: {
  filter: InboxFilter;
  active: InboxFilter;
  onPress: (filter: InboxFilter) => void;
  count: number;
  idle: string;
  hint: string;
  icon: LucideIcon;
  idleIcon?: LucideIcon;
  attention?: boolean;
}) {
  const quiet = count === 0 || !attention;
  return (
    <StatButton
      pressed={active === filter}
      onPress={() => onPress(filter)}
      label={filterTexts[filter].title}
      value={count}
      hint={count === 0 ? idle : hint}
      hintTone={count === 0 ? (filter === 'submitted' ? 'success' : 'neutral') : attention ? 'warning' : 'neutral'}
      icon={count === 0 ? idleIcon : icon}
      tone={count === 0 ? (filter === 'submitted' ? 'success' : 'neutral') : quiet ? 'neutral' : 'warning'}
      compact
    />
  );
}

/**
 * Recibidas (ADR 0023, L-01b): las solicitudes enviadas por los solicitantes, lo urgente primero (el servidor las
 * ordena). Cuatro cifras al estilo del Resumen de Reactivos hacen de filtro: por defecto, las que esperan respuesta;
 * «Ver todas» suma las que ya tienen una.
 */
export function LabsInboxPage() {
  const { workspaceId } = useLabs();
  const requests = useRequests(workspaceId, 'inbox');
  const [filter, setFilter] = useState<InboxFilter>('submitted');
  const received = requests.data?.items ?? [];
  const items = filterInbox(received, filter);
  const counts = inboxCounts(received);
  const texts = filterTexts[filter];

  return (
    <>
      <SectionHeader title="Recibidas" updatedAt={requests.dataUpdatedAt} />
      <div className="mt-6 grid gap-5 sm:gap-6">
        {requests.isPending ? (
          <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-5 sm:gap-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
              {figureSkeleton.map((key) => (
                <Skeleton key={key} className="h-28 rounded-card" />
              ))}
            </div>
            <Skeleton className="h-40 rounded-card" />
          </div>
        ) : requests.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={requests.error} onRetry={() => void requests.refetch()} />
          </div>
        ) : (
          <>
            <section aria-label="Filtros por cifra" className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
              <Figure filter="submitted" active={filter} onPress={setFilter} count={counts.submitted} idle="Al día" hint="Esperan tu respuesta" icon={Clock} idleIcon={CircleCheck} attention={false} />
              <Figure filter="late" active={filter} onPress={setFilter} count={counts.late} idle="Ninguna" hint="Sin la anticipación pedida" icon={CalendarX} />
              <Figure filter="resources" active={filter} onPress={setFilter} count={counts.resources} idle="Ninguna" hint="Con líneas por mirar" icon={TriangleAlert} />
              <Figure filter="changes" active={filter} onPress={setFilter} count={counts.changes} idle="Ninguna" hint="Esperan al solicitante" icon={FilePenLine} attention={false} />
            </section>
            {received.length === 0 ? (
              <div className="rounded-card bg-surface shadow-raised">
                <StatePanel icon={Inbox} title="Aún no recibes solicitudes" description="Cuando alguien envíe una solicitud, aparecerá aquí con lo más urgente primero." />
              </div>
            ) : (
              <RequestSection
                title={texts.title}
                count={items.length}
                hint={texts.hint}
                action={
                  filter === 'all' ? (
                    <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => setFilter('submitted')}>
                      Solo por revisar
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => setFilter('all')}>
                      Ver todas ({received.length})
                    </Button>
                  )
                }
              >
                {items.length === 0 ? (
                  <StatePanel icon={CircleCheck} title={texts.empty} description={filter === 'submitted' ? 'Las demás ya tienen respuesta o esperan a quien las pidió.' : 'Pulsa «Ver todas» para ver las demás.'} className="py-8" />
                ) : (
                  <RequestList label={texts.title}>
                    {items.map((request) => {
                      const pending = exceptionsText(request.exceptions);
                      return (
                        <RequestItem
                          key={request.id}
                          to={`/e/${workspaceId}/laboratorios/recibidas/${request.id}`}
                          request={request}
                          hideStatus={filter === 'submitted'}
                          facts={[request.requesterName, request.formName, firstDateText(request)]}
                          badges={pending ? <Badge tone="warning">{pending}</Badge> : undefined}
                        />
                      );
                    })}
                  </RequestList>
                )}
              </RequestSection>
            )}
          </>
        )}
      </div>
    </>
  );
}
