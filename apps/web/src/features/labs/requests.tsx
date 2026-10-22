import type { FormSummary, RequestSummary } from '@platlab/contracts';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Skeleton, StatePanel, toast } from '@platlab/ui';
import { ChevronDown, Copy, FilePenLine, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, useCreateRequest } from './commands';
import { useLabs } from './context';
import { useLabsForms, useRequests } from './queries';
import { RequestBadges } from './request-status';
import { firstDateText } from './request-summary';

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

/** «Nueva solicitud»: con un solo formato activo lo llena directo; con varios, se elige cuál. */
function NewRequest({ workspaceId, forms, large = false }: { workspaceId: string; forms: readonly FormSummary[]; large?: boolean }) {
  const { start, pending } = useStartRequest(workspaceId);
  const only = forms.length === 1 ? forms[0] : undefined;
  const button = (
    <Button variant="primary" className={large ? 'h-12 sm:h-10' : 'h-11 sm:h-10'} loading={pending} disabled={forms.length === 0} onClick={only ? () => void start({ formId: only.id }) : undefined}>
      <Plus aria-hidden />
      Nueva solicitud
      {only || forms.length === 0 ? null : <ChevronDown className="-mr-1" aria-hidden />}
    </Button>
  );
  if (only || forms.length === 0) return button;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {forms.map((form) => (
          <DropdownMenuItem key={form.id} className="h-11 sm:h-10" onSelect={() => void start({ formId: form.id })}>
            {form.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** «Duplicar»: un borrador nuevo con los datos de esta solicitud. */
function DuplicateRequest({ workspaceId, request }: { workspaceId: string; request: RequestSummary }) {
  const { start, pending } = useStartRequest(workspaceId);
  return (
    <Button size="sm" className="h-11 sm:h-8" loading={pending} aria-label={`Duplicar ${request.code}`} onClick={() => void start({ from: request.id })}>
      <Copy aria-hidden />
      Duplicar
    </Button>
  );
}

/** Una solicitud propia: código, título, formato, primera fecha y estado; abre su hoja. */
function RequestRow({ workspaceId, request, canRequest }: { workspaceId: string; request: RequestSummary; canRequest: boolean }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-card bg-surface px-4 py-4 shadow-raised sm:px-5">
      <Link
        to={`/e/${workspaceId}/laboratorios/solicitudes/${request.id}`}
        className="-m-2 grid min-w-0 flex-1 basis-64 gap-1.5 rounded-control p-2 transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <CodeTag>{request.code}</CodeTag>
          <RequestBadges status={request.status} late={request.late} />
        </span>
        <span className={request.title ? 'break-words font-semibold text-ink' : 'text-ink-muted'}>{request.title ?? 'Sin título'}</span>
        <span className="break-words text-sm text-ink-muted">
          {request.formName} · {firstDateText(request)}
        </span>
      </Link>
      {canRequest ? <DuplicateRequest workspaceId={workspaceId} request={request} /> : null}
    </li>
  );
}

/**
 * Mis solicitudes (ADR 0023, L-01b): las que la persona ha llenado, con su estado. «Nueva solicitud» parte de un
 * formato activo y «Duplicar» de otra solicitud propia; las dos dejan un borrador que se llena en tres pasos.
 */
export function LabsRequestsPage() {
  const { workspaceId, canRequest } = useLabs();
  const requests = useRequests(workspaceId, 'mine');
  const forms = useLabsForms(workspaceId);
  const active = (forms.data?.items ?? []).filter((form) => form.archivedAt === null);
  const items = requests.data?.items ?? [];

  const create = canRequest ? <NewRequest workspaceId={workspaceId} forms={active} large /> : undefined;

  return (
    <>
      <SectionHeader title="Mis solicitudes" updatedAt={Math.min(requests.dataUpdatedAt, forms.dataUpdatedAt)} actions={create} />
      <div className="mt-6">
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
                forms.isSuccess && active.length === 0
                  ? 'Todavía no hay formatos para llenar. Quien administra el espacio los crea; cuando existan, podrás empezar aquí.'
                  : 'Elige un formato y llénalo en tres pasos: datos, recursos y revisión. Lo guardas como borrador y lo envías cuando esté listo.'
              }
              action={canRequest ? <NewRequest workspaceId={workspaceId} forms={active} /> : undefined}
            />
          </div>
        ) : (
          <ul className="grid gap-3 sm:gap-4">
            {items.map((request) => (
              <RequestRow key={request.id} workspaceId={workspaceId} request={request} canRequest={canRequest} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
