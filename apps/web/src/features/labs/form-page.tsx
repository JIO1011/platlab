import { publishFormRequest } from '@platlab/contracts';
import { Button, Skeleton, toast } from '@platlab/ui';
import { Printer } from 'lucide-react';
import { useCallback, useState } from 'react';
import { isApiError } from '../../app/api';
import { formatDateTime } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, usePublishForm, useVersionConflict } from './commands';
import { useLabs } from './context';
import { draftFrom, formIssues, publishPayload, type Draft, type FormIssues } from './form-draft';
import { FormPaper } from './form-paper';
import { FormPrint } from './form-print';
import { useLabsForm } from './queries';

const noIssues: FormIssues = { fields: {} };

const alertClass = 'rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger';

/**
 * Formato estándar de la solicitud (ADR 0023): una sola vista, la hoja A4 de la plantilla, que el Administrador edita en el
 * mismo lugar. Cada publicación es una versión nueva e inmutable. Lo que se edita es un borrador en pantalla, sobre la
 * versión en que se empezó; si otra persona publicó antes, el servidor lo rechaza y se carga la vigente. Quien no puede
 * gestionar el Formato ve la hoja sin edición. «Imprimir» saca la hoja en A4, sin la barra ni los controles.
 */
export function LabsFormPage() {
  const { workspaceId, me, canManageForm } = useLabs();
  const form = useLabsForm(workspaceId);
  const publish = usePublishForm(workspaceId);
  const conflict = useVersionConflict(workspaceId);
  // Sin edición en curso (`null`), la pantalla muestra la versión vigente.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [issues, setIssues] = useState<FormIssues>(noIssues);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const donePrinting = useCallback(() => setPrinting(false), []);

  const current = form.data;
  const shown = draft ?? (current ? draftFrom(current) : null);
  const revision = shown ? (draft ? draft.baseVersion + 1 : shown.baseVersion) : 0;
  const edit = (next: Draft) => {
    setDraft(next);
    setIssues(noIssues);
    setGeneralError(null);
  };
  const discard = () => {
    setDraft(null);
    setIssues(noIssues);
    setGeneralError(null);
  };

  const submit = async () => {
    if (!draft) return;
    setIssues(noIssues);
    setGeneralError(null);
    const parsed = publishFormRequest.safeParse(publishPayload(draft));
    if (!parsed.success) {
      setIssues(formIssues(parsed.error, draft));
      return;
    }
    try {
      const published = await publish.mutateAsync(parsed.data);
      toast.success(`Versión ${published.version} publicada`, { description: published.title ?? '' });
      setDraft(null);
    } catch (error) {
      if (isApiError(error, 'VERSION_CONFLICT')) {
        void conflict('el formato');
        discard();
        return;
      }
      setGeneralError(labsErrorMessage(error));
    }
  };

  return (
    <>
      <SectionHeader title="Formato" updatedAt={form.dataUpdatedAt} />
      <div className="mt-6 grid gap-4 pb-28 md:pb-0">
        {form.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : form.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={form.error} onRetry={() => void form.refetch()} />
          </div>
        ) : current && shown ? (
          <>
            {/* En el móvil la barra queda abajo, al alcance del pulgar; en escritorio, fija arriba bajo la barra de la app (`min-h-16` más su borde de 1 px; la app no expone esa altura como variable). */}
            <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-2 border-t border-line bg-surface/90 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:sticky md:inset-x-auto md:bottom-auto md:top-[calc(4rem+1px)] md:justify-between md:rounded-control md:border md:px-4 md:py-2">
              <p className="min-w-0 flex-1 basis-40 text-[13px] text-ink-muted">
                {current.publishedAt
                  ? `Versión vigente: ${current.version}, del ${formatDateTime(current.publishedAt, me.workspace.timeZone)}`
                  : 'Aún no hay versión publicada: la primera será la 1'}
              </p>
              <Button className="h-11 max-md:w-11 max-md:px-0 md:h-10" aria-label="Imprimir" onClick={() => setPrinting(true)}>
                <Printer aria-hidden />
                <span className="max-md:sr-only">Imprimir</span>
              </Button>
              {canManageForm ? (
                <>
                  {draft ? (
                    <Button className="h-11 max-md:flex-1 md:h-10" disabled={publish.isPending} onClick={discard}>
                      Descartar cambios
                    </Button>
                  ) : null}
                  <Button variant="primary" className="h-11 max-md:flex-1 md:h-10" disabled={!draft} loading={publish.isPending} onClick={() => void submit()}>
                    Publicar versión {current.version + 1}
                  </Button>
                </>
              ) : null}
            </div>
            {canManageForm ? (
              <p className="text-sm text-ink-muted">Haz clic en el título, el código o una etiqueta para cambiarlos, y arrastra el asa de un dato extra para ordenarlo. Los datos con candado los pone el sistema.</p>
            ) : null}
            {generalError ? (
              <p role="alert" className={alertClass}>
                {generalError}
              </p>
            ) : null}
            {issues.general ? (
              <p role="alert" className={alertClass}>
                {issues.general}
              </p>
            ) : null}
            <FormPaper draft={shown} workspaceName={me.workspace.name} revision={revision} issues={issues} {...(canManageForm ? { onChange: edit } : {})} />
            {printing ? <FormPrint draft={shown} workspaceName={me.workspace.name} revision={revision} onDone={donePrinting} /> : null}
          </>
        ) : null}
      </div>
    </>
  );
}
