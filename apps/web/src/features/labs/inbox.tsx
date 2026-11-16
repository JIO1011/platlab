import type { RequestSummary } from '@platlab/contracts';
import { Input, Segmented, Skeleton, StatePanel, cn } from '@platlab/ui';
import { CalendarX, CircleCheck, Clock, FilePenLine, Inbox, Search, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { SectionHeader } from '../../app/section-header';
import { StatButton } from '../../app/stat-button';
import { QueryErrorState } from '../../app/states';
import { useMediaQuery } from '../../app/use-media-query';
import { useLabs } from './context';
import { InboxStack, InboxTable } from './inbox-rows';
import { useRequests } from './queries';
import { filterInbox, inboxCounts, initialInboxFilter, searchInbox, type InboxFilter } from './request-summary';
import { softCard } from './style';

/** Lo que dice la pestaña de cada filtro y qué decir si no hay ninguna solicitud. */
const filterTexts: Record<InboxFilter, { tab: string; empty: string }> = {
  all: { tab: 'Todas', empty: 'Aún no recibes solicitudes' },
  submitted: { tab: 'Por revisar', empty: 'No hay solicitudes por revisar' },
  resources: { tab: 'Con recursos', empty: 'Ninguna solicitud tiene recursos por revisar' },
  changes: { tab: 'Cambios', empty: 'Ninguna solicitud espera cambios' },
  late: { tab: 'Fuera de plazo', empty: 'Ninguna solicitud está fuera de plazo' },
};

/** Las pestañas, en su orden; comparten el filtro con las cifras. */
const tabOrder = ['all', 'submitted', 'resources', 'changes', 'late'] as const satisfies readonly InboxFilter[];

/** La tabla pide ancho: desde `lg`; debajo, filas apiladas. */
const tableQuery = '(min-width: 64rem)';

const figureSkeleton = [0, 1, 2, 3];

/** Una cifra con su filtro: ámbar solo la que avisa de algo fuera de lo normal (`attention`) y solo si hay algo; sin nada, el texto lo dice. */
function Figure({
  filter,
  label,
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
  label: string;
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
      label={label}
      value={count}
      hint={count === 0 ? idle : hint}
      hintTone={count === 0 ? (filter === 'submitted' ? 'success' : 'neutral') : attention ? 'warning' : 'neutral'}
      icon={count === 0 ? idleIcon : icon}
      tone={count === 0 ? (filter === 'submitted' ? 'success' : 'neutral') : quiet ? 'neutral' : 'warning'}
    />
  );
}

/** Lo que sigue a las cifras con las recibidas ya cargadas: abre en «Por revisar» si hay alguna y, si no, en «Todas». */
function InboxBody({ received }: { received: readonly RequestSummary[] }) {
  const { workspaceId } = useLabs();
  const table = useMediaQuery(tableQuery);
  const [filter, setFilter] = useState<InboxFilter>(() => initialInboxFilter(received));
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const items = searchInbox(filterInbox(received, filter), query);
  const counts = inboxCounts(received);

  const rows = {
    requests: items,
    hrefOf: (request: RequestSummary) => `/e/${workspaceId}/laboratorios/recibidas/${request.id}`,
  };

  return (
    <div className="grid gap-6 sm:gap-8">
      <section aria-label="Filtros por cifra" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Figure filter="submitted" label="Por revisar" active={filter} onPress={setFilter} count={counts.submitted} idle="Al día" hint="Esperan tu respuesta" icon={Clock} idleIcon={CircleCheck} attention={false} />
        <Figure filter="late" label="Fuera de plazo" active={filter} onPress={setFilter} count={counts.late} idle="Ninguna" hint="Sin la anticipación pedida" icon={CalendarX} />
        <Figure filter="resources" label="Recursos por revisar" active={filter} onPress={setFilter} count={counts.resources} idle="Ninguna" hint="Con líneas por mirar" icon={TriangleAlert} />
        <Figure filter="changes" label="Cambios pedidos" active={filter} onPress={setFilter} count={counts.changes} idle="Ninguna" hint="Esperan al solicitante" icon={FilePenLine} attention={false} />
      </section>
      {received.length === 0 ? (
        <div className={softCard}>
          <StatePanel icon={Inbox} title="Aún no recibes solicitudes" description="Cuando alguien envíe una solicitud, aparecerá aquí con lo más urgente primero." />
        </div>
      ) : (
        <section aria-label="Solicitudes recibidas" className={cn(softCard, 'min-w-0')}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6">
            <Segmented
              label="Filtrar solicitudes"
              value={filter}
              options={tabOrder.map((value) => ({ value, label: `${filterTexts[value].tab} (${counts[value]})` }))}
              onValueChange={setFilter}
              className="max-w-full overflow-x-auto [&>button]:shrink-0 [&>button]:whitespace-nowrap"
            />
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <Input
                type="search"
                aria-label="Buscar código, práctica o docente"
                placeholder="Buscar código, práctica o docente"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 pl-9 sm:h-10"
              />
            </div>
          </div>
          {items.length === 0 ? (
            <div className="border-t border-line">
              <StatePanel
                icon={searching ? Search : CircleCheck}
                title={searching ? 'Ninguna solicitud coincide con lo buscado' : filterTexts[filter].empty}
                description={searching ? 'Prueba con otro código, práctica o docente.' : filter === 'submitted' ? 'Las demás ya tienen respuesta o esperan a quien las pidió.' : 'Elige «Todas» para ver las demás.'}
                className="py-8"
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-b-card">{table ? <InboxTable {...rows} /> : <InboxStack {...rows} />}</div>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Recibidas (ADR 0023, L-01b): las solicitudes enviadas por los solicitantes, lo urgente primero (el servidor las
 * ordena). Cuatro cifras hacen de filtro y comparten estado con las pestañas, con su cuenta; el buscador filtra en el
 * navegador. Cada solicitud abre su hoja; se aprueba al programarla en el Cronograma.
 */
export function LabsInboxPage() {
  const { workspaceId } = useLabs();
  const requests = useRequests(workspaceId, 'inbox');

  return (
    <>
      <SectionHeader title="Recibidas" updatedAt={requests.dataUpdatedAt} />
      <div className="mt-8">
        {requests.isPending ? (
          <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-6 sm:gap-8">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {figureSkeleton.map((key) => (
                <Skeleton key={key} className="h-24 rounded-card" />
              ))}
            </div>
            <Skeleton className="h-40 rounded-card" />
          </div>
        ) : requests.isError ? (
          <div className={softCard}>
            <QueryErrorState error={requests.error} onRetry={() => void requests.refetch()} />
          </div>
        ) : (
          <InboxBody received={requests.data.items} />
        )}
      </div>
    </>
  );
}
