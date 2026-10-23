import type { RequestSummary } from '@platlab/contracts';
import { Button, Skeleton, StatePanel, toast } from '@platlab/ui';
import { Copy, FilePenLine, FilePlus2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { QuickActions, quickActionSecondary } from '../../app/quick-actions';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, useCreateRequest } from './commands';
import { useLabs } from './context';
import { useLabsForms, useRequests } from './queries';
import { RequestItem, RequestList, RequestSection } from './request-list';
import { firstDateText, groupMine } from './request-summary';

/** Crea un borrador, o la copia de otra solicitud propia, y abre su hoja. Si falla, lo dice y se queda en la lista. */
function useStartRequest(workspaceId: string) {
  const create = useCreateRequest(workspaceId);
  const navigate = useNavigate();
  const start = async (body: { formId: string } | { from: string }) => {
    try {
      const created = await create.mutateAsync(body);
      void navigate(`/e/${workspaceId}/laboratorios/solicitudes/${created.id}`);
    } catch (error) {
      toast.error('No se creó la solicitud', { description: labsErrorMessage(error) });
    }
  };
  return { start, pending: create.isPending };
}

/** Una opción de la banda: el nombre del formato y, debajo, su título. Un clic y se abre el borrador. */
const formOption =
  'inline-flex min-h-11 flex-col items-start justify-center rounded-control border border-white/40 px-4 py-2 text-left backdrop-blur-sm transition-[background-color,opacity] duration-150 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-60 sm:max-w-72';

/**
 * «Nueva solicitud» (ADR 0023): la banda destacada de la página, con cada formato activo como opción a un clic y lo que
 * pasa después. Sin formatos, lo dice; mientras cargan o si fallan, lo dice también.
 */
function NewRequestBand({ workspaceId, forms }: { workspaceId: string; forms: ReturnType<typeof useLabsForms> }) {
  const { start, pending } = useStartRequest(workspaceId);
  const active = (forms.data?.items ?? []).filter((form) => form.archivedAt === null);
  const none = forms.isSuccess && active.length === 0;
  return (
    <QuickActions
      moduleCode="labs"
      title="Nueva solicitud"
      badge={{ icon: FilePlus2, label: 'Elige un formato' }}
      description={
        none
          ? 'Todavía no hay formatos para llenar. Quien administra el espacio los crea; cuando existan, podrás empezar aquí.'
          : 'Elige un formato y se abre un borrador. Lo llenas en tres pasos y, al enviarlo, el laboratorio lo revisa y te responde aquí.'
      }
    >
      {forms.isPending ? (
        <div role="status" aria-busy="true" aria-label="Cargando formatos" className="h-11 w-48 animate-pulse rounded-control bg-white/20 motion-reduce:animate-none" />
      ) : forms.isError ? (
        <button type="button" className={quickActionSecondary} onClick={() => void forms.refetch()}>
          No se cargaron los formatos. Reintentar
        </button>
      ) : (
        active.map((form) => (
          <button key={form.id} type="button" className={formOption} disabled={pending} onClick={() => void start({ formId: form.id })}>
            <span className="text-sm font-bold">{form.name}</span>
            {form.title !== form.name ? <span className="break-words text-xs text-on-action">{form.title}</span> : null}
          </button>
        ))
      )}
    </QuickActions>
  );
}

/** «Duplicar»: un borrador nuevo con los datos de esta solicitud. */
function DuplicateRequest({ workspaceId, request }: { workspaceId: string; request: RequestSummary }) {
  const { start, pending } = useStartRequest(workspaceId);
  return (
    <Button variant="ghost" size="sm" className="h-11 sm:h-8" loading={pending} aria-label={`Duplicar ${request.code}`} onClick={() => void start({ from: request.id })}>
      <Copy aria-hidden />
      Duplicar
    </Button>
  );
}

/** Las filas de un grupo: cada una abre su hoja; `note` es la frase bajo los datos de las que piden algo. */
function MineRows({ label, workspaceId, items, canRequest, note }: { label: string; workspaceId: string; items: readonly RequestSummary[]; canRequest: boolean; note?: string }) {
  return (
    <RequestList label={label}>
      {items.map((request) => (
        <RequestItem
          key={request.id}
          to={`/e/${workspaceId}/laboratorios/solicitudes/${request.id}`}
          request={request}
          facts={[request.formName, firstDateText(request)]}
          {...(note ? { note } : {})}
          action={canRequest ? <DuplicateRequest workspaceId={workspaceId} request={request} /> : undefined}
        />
      ))}
    </RequestList>
  );
}

/**
 * Mis solicitudes (ADR 0023, L-01b): las que la persona ha llenado, agrupadas por lo que le toca hacer: las que piden
 * cambios, los borradores, las enviadas y, plegadas al final, las cerradas. «Nueva solicitud» parte de un formato
 * activo y «Duplicar» de otra solicitud propia; las dos dejan un borrador que se llena en tres pasos.
 */
export function LabsRequestsPage() {
  const { workspaceId, canRequest } = useLabs();
  const requests = useRequests(workspaceId, 'mine');
  const forms = useLabsForms(workspaceId);
  const items = requests.data?.items ?? [];
  const groups = groupMine(items);

  return (
    <>
      <SectionHeader title="Mis solicitudes" updatedAt={Math.min(requests.dataUpdatedAt, forms.dataUpdatedAt)} />
      <div className="mt-6 grid gap-5 sm:gap-6">
        {canRequest ? <NewRequestBand workspaceId={workspaceId} forms={forms} /> : null}
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
              icon={FilePenLine}
              title="Aún no tienes solicitudes"
              description={
                canRequest
                  ? 'Cuando elijas un formato y lo llenes, tu solicitud aparecerá aquí con su estado: borrador, enviada o con cambios por hacer.'
                  : 'Las solicitudes que llenes aparecerán aquí con su estado.'
              }
            />
          </div>
        ) : (
          <>
            {groups.attention.length > 0 ? (
              <RequestSection title="Necesitan tu atención" count={groups.attention.length} hint="El laboratorio pidió cambios. Corrígelos y vuelve a enviarlas.">
                <MineRows label="Solicitudes con cambios solicitados" workspaceId={workspaceId} items={groups.attention} canRequest={canRequest} note="Abre la solicitud para ver qué cambios pidieron." />
              </RequestSection>
            ) : null}
            {groups.drafts.length > 0 ? (
              <RequestSection title="Borradores" count={groups.drafts.length} hint="Aún no se envían. Termínalos cuando estén listos.">
                <MineRows label="Borradores" workspaceId={workspaceId} items={groups.drafts} canRequest={canRequest} />
              </RequestSection>
            ) : null}
            {groups.sent.length > 0 ? (
              <RequestSection title="Enviadas" count={groups.sent.length} hint="Esperan la respuesta del laboratorio.">
                <MineRows label="Solicitudes enviadas" workspaceId={workspaceId} items={groups.sent} canRequest={canRequest} />
              </RequestSection>
            ) : null}
            {groups.closed.length > 0 ? (
              <RequestSection title="Cerradas" count={groups.closed.length} hint="Rechazadas y canceladas. Duplícalas para empezar de nuevo." collapsible>
                <MineRows label="Solicitudes cerradas" workspaceId={workspaceId} items={groups.closed} canRequest={canRequest} />
              </RequestSection>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
