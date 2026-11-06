import { Button, Skeleton, StatePanel, cn, toast } from '@platlab/ui';
import { CalendarX, Check, CircleCheck, Clock, FilePenLine, Inbox, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { SectionHeader } from '../../app/section-header';
import { StatButton } from '../../app/stat-button';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, useApproveRequests } from './commands';
import { useLabs } from './context';
import { ApprovalSummaryCard, RowCheckbox } from './inbox-approval';
import { useRequests } from './queries';
import { approvalSummary, approveBody, isApprovable } from './request-approval';
import { RequestItem, RequestList, RequestSection } from './request-list';
import { Pill } from './request-status';
import { exceptionsText, filterInbox, firstDateText, inboxCounts, type InboxFilter } from './request-summary';
import { actionBar, primaryGradient, softCard } from './style';

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
 * «Ver todas» suma las que ya tienen una. Quien revisa y programa elige enviadas con su casilla y las aprueba juntas:
 * cada una se programa donde y cuando se pidió, y el resumen dice el resultado de cada una.
 */
export function LabsInboxPage() {
  const { workspaceId, canReview, canSchedule } = useLabs();
  const requests = useRequests(workspaceId, 'inbox');
  const approve = useApproveRequests(workspaceId);
  const [filter, setFilter] = useState<InboxFilter>('submitted');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [summary, setSummary] = useState<ReturnType<typeof approvalSummary> | null>(null);
  const received = requests.data?.items ?? [];
  const items = filterInbox(received, filter);
  const approvable = canReview && canSchedule ? items.filter(isApprovable) : [];
  // Solo cuentan las elegidas que se ven en este filtro: lo que no se ve no se aprueba.
  const chosen = approvable.filter((item) => selected.has(item.id));
  const toggle = (id: string, on: boolean) => setSelected((current) => new Set(on ? [...current, id] : [...current].filter((other) => other !== id)));

  const approveChosen = async () => {
    try {
      const done = await approve.mutateAsync(approveBody(chosen));
      setSummary(approvalSummary(done.items, chosen));
      setSelected(new Set());
    } catch (failure) {
      toast.error('No se pudieron aprobar las solicitudes', { description: labsErrorMessage(failure) });
    }
  };
  const counts = inboxCounts(received);
  const texts = filterTexts[filter];

  return (
    <>
      <SectionHeader title="Recibidas" updatedAt={requests.dataUpdatedAt} />
      <div className={cn('mt-8 grid gap-6 sm:gap-8', chosen.length > 0 && 'max-sm:pb-24')}>
        {requests.isPending ? (
          <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-6 sm:gap-8">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
              {figureSkeleton.map((key) => (
                <Skeleton key={key} className="h-28 rounded-card" />
              ))}
            </div>
            <Skeleton className="h-40 rounded-card" />
          </div>
        ) : requests.isError ? (
          <div className={softCard}>
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
            {summary ? <ApprovalSummaryCard summary={summary} onDismiss={() => setSummary(null)} /> : null}
            {received.length === 0 ? (
              <div className={softCard}>
                <StatePanel icon={Inbox} title="Aún no recibes solicitudes" description="Cuando alguien envíe una solicitud, aparecerá aquí con lo más urgente primero." />
              </div>
            ) : (
              <RequestSection
                title={texts.title}
                count={items.length}
                hint={texts.hint}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    {approvable.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11 sm:h-8"
                        onClick={() => setSelected(chosen.length === approvable.length ? new Set() : new Set(approvable.map((item) => item.id)))}
                      >
                        {chosen.length === approvable.length ? 'Quitar selección' : 'Elegir todas'}
                      </Button>
                    ) : null}
                    {filter === 'all' ? (
                      <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => setFilter('submitted')}>
                        Solo por revisar
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => setFilter('all')}>
                        Ver todas ({received.length})
                      </Button>
                    )}
                    {chosen.length > 0 ? (
                      <div className={actionBar}>
                        <Button variant="primary" className={`h-11 sm:h-10 ${primaryGradient}`} loading={approve.isPending} onClick={() => void approveChosen()}>
                          <Check aria-hidden />
                          Aprobar seleccionadas ({chosen.length})
                        </Button>
                      </div>
                    ) : null}
                  </div>
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
                          leading={approvable.includes(request) ? <RowCheckbox code={request.code} checked={selected.has(request.id)} onChange={(on) => toggle(request.id, on)} /> : undefined}
                          facts={[request.requesterName, request.formName, firstDateText(request)]}
                          badges={pending ? <Pill tone="warning">{pending}</Pill> : undefined}
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
