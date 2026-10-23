import { publishFormRequest, updateFormRequest, type LabsForm } from '@platlab/contracts';
import { Badge, Button, Field, Input, Skeleton, toast } from '@platlab/ui';
import { Printer } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router';
import { isApiError } from '../../app/api';
import { WithBack } from '../../app/back-button';
import { ConfirmArchive } from '../../app/confirm-archive';
import { formatDateTime } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, useArchiveForm, usePublishForm, useRenameForm, useUploadFormLogo, useVersionConflict } from './commands';
import { useLabs } from './context';
import { draftFrom, formIssues, noIssues, publishPayload, type Draft, type FormIssues } from './form-draft';
import { FormPaper } from './form-paper';
import { FormPrint } from './form-print';
import { useLabsForm } from './queries';

const alertClass = 'rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger';

/** El nombre del formato, que se edita aparte de la hoja: guardarlo no publica una revisión. */
function RenameForm({ workspaceId, form }: { workspaceId: string; form: LabsForm }) {
  const rename = useRenameForm(workspaceId, form.id);
  const conflict = useVersionConflict(workspaceId);
  const [name, setName] = useState(form.name);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    setError(undefined);
    const parsed = updateFormRequest.safeParse({ name: name.trim(), expectedVersion: form.version });
    if (!parsed.success) {
      setError('Escribe el nombre del formato (hasta 80 caracteres).');
      return;
    }
    try {
      await rename.mutateAsync(parsed.data);
      toast.success('Nombre guardado', { description: parsed.data.name });
    } catch (failure) {
      if (isApiError(failure, 'NAME_TAKEN')) setError(failure.message);
      else if (isApiError(failure, 'VERSION_CONFLICT')) void conflict('el formato');
      else setError(labsErrorMessage(failure));
    }
  };

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field label="Nombre del formato" error={error} className="min-w-0 flex-1 basis-64">
        <Input
          className="h-11 sm:h-10"
          value={name}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value);
            setError(undefined);
          }}
        />
      </Field>
      <Button type="submit" className="h-11 sm:h-10" disabled={name.trim() === form.name} loading={rename.isPending}>
        Guardar nombre
      </Button>
    </form>
  );
}

/** Archivar el formato con su confirmación aquí mismo: deja de ofrecerse para llenar y no se deshace desde esta pantalla. */
function ArchiveForm({ workspaceId, form, onCancel, onDone }: { workspaceId: string; form: LabsForm; onCancel: () => void; onDone: () => void }) {
  const archive = useArchiveForm(workspaceId, form.id);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setError(null);
    try {
      await archive.mutateAsync(undefined);
      toast.success('Formato archivado', { description: form.name });
      onDone();
    } catch (failure) {
      setError(labsErrorMessage(failure));
    }
  };
  return (
    <ConfirmArchive
      label={`Archivar ${form.name}`}
      text={`${form.name} dejará de ofrecerse para llenar. Sus revisiones y las solicitudes ya llenadas se conservan.`}
      action="Archivar formato"
      pending={archive.isPending}
      error={error}
      onConfirm={() => void confirm()}
      onCancel={onCancel}
    />
  );
}

/**
 * La hoja de un formato (ADR 0023): la plantilla A4 que el Administrador edita en el mismo lugar. Cada «Publicar revisión»
 * es una revisión nueva e inmutable. Lo que se edita es un borrador en pantalla, sobre la revisión en que se empezó; si
 * otra persona publicó antes, el servidor lo rechaza y se carga la vigente. Un formato archivado, y quien no puede
 * gestionar los formatos, ven la hoja sin edición. «Imprimir» saca la hoja en A4, sin la barra ni los controles.
 */
export function LabsFormPage() {
  const { formId = '' } = useParams();
  const { workspaceId, me, canManageForm } = useLabs();
  const form = useLabsForm(workspaceId, formId);
  const publish = usePublishForm(workspaceId, formId);
  const uploadLogo = useUploadFormLogo(workspaceId, formId);
  const conflict = useVersionConflict(workspaceId);
  // Sin edición en curso (`null`), la pantalla muestra la revisión vigente.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [issues, setIssues] = useState<FormIssues>(noIssues);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const donePrinting = useCallback(() => setPrinting(false), []);

  const current = form.data;
  const archived = current?.archivedAt != null;
  const editable = canManageForm && !archived;
  const shown = draft ?? (current ? draftFrom(current) : null);
  const revision = shown ? (draft ? draft.baseRevision + 1 : shown.baseRevision) : 0;
  const clearErrors = () => {
    setIssues(noIssues);
    setGeneralError(null);
  };
  const edit = (next: Draft) => {
    setDraft(next);
    clearErrors();
  };
  const discard = () => {
    setDraft(null);
    clearErrors();
  };

  const submit = async () => {
    if (!draft) return;
    clearErrors();
    const parsed = publishFormRequest.safeParse(publishPayload(draft));
    if (!parsed.success) {
      setIssues(formIssues(parsed.error, draft));
      return;
    }
    try {
      const published = await publish.mutateAsync(parsed.data);
      toast.success(`Revisión ${published.revision} publicada`, { description: published.title });
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
    <WithBack parent={`/e/${workspaceId}/laboratorios/formatos`}>
      <SectionHeader title={current?.name ?? 'Formato'} updatedAt={form.dataUpdatedAt} />
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
            {editable ? <RenameForm key={current.version} workspaceId={workspaceId} form={current} /> : null}
            {archived ? (
              <p className="flex flex-wrap items-center gap-2 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
                <Badge tone="neutral">Archivado</Badge>
                {current.archivedAt ? `Desde el ${formatDateTime(current.archivedAt, me.workspace.timeZone)}. Ya no se ofrece para llenar; solo puedes consultarlo.` : null}
              </p>
            ) : null}
            {/* En el móvil la barra queda abajo, al alcance del pulgar; en escritorio, fija arriba bajo la barra de la app (`min-h-16` más su borde de 1 px; la app no expone esa altura como variable). */}
            <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-2 border-t border-line bg-surface/90 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:sticky md:inset-x-auto md:bottom-auto md:top-[calc(4rem+1px)] md:justify-between md:rounded-control md:border md:px-4 md:py-2">
              <p className="min-w-0 flex-1 basis-40 text-[13px] text-ink-muted">
                Revisión vigente: {current.revision}, del {formatDateTime(current.publishedAt, me.workspace.timeZone)}
              </p>
              <Button className="h-11 max-md:w-11 max-md:px-0 md:h-10" aria-label="Imprimir" onClick={() => setPrinting(true)}>
                <Printer aria-hidden />
                <span className="max-md:sr-only">Imprimir</span>
              </Button>
              {editable ? (
                <>
                  <Button variant="ghost" className="h-11 max-md:flex-1 md:h-10" disabled={publish.isPending || archiving} onClick={() => setArchiving(true)}>
                    Archivar
                  </Button>
                  {draft ? (
                    <Button className="h-11 max-md:flex-1 md:h-10" disabled={publish.isPending} onClick={discard}>
                      Descartar cambios
                    </Button>
                  ) : null}
                  <Button variant="primary" className="h-11 max-md:flex-1 md:h-10" disabled={!draft} loading={publish.isPending} onClick={() => void submit()}>
                    Publicar revisión {current.revision + 1}
                  </Button>
                </>
              ) : null}
            </div>
            {archiving && editable ? (
              <ArchiveForm
                workspaceId={workspaceId}
                form={current}
                onCancel={() => setArchiving(false)}
                onDone={() => {
                  setArchiving(false);
                  discard();
                }}
              />
            ) : null}
            {editable ? (
              <p className="text-sm text-ink-muted">
                Edita sobre la hoja: haz clic en un texto para cambiarlo. Mueve un dato o una fila arrastrando su asa, o con el botón «Mover» de cada dato si prefieres el teclado. El candado marca los datos que no se quitan. Nada se guarda hasta que publicas la revisión.
              </p>
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
            {editable ? (
              <FormPaper
                mode="design"
                draft={shown}
                workspaceName={me.workspace.name}
                revision={revision}
                issues={issues}
                onChange={edit}
                uploadLogo={async (logo) => (await uploadLogo.mutateAsync(logo)).url}
              />
            ) : (
              <FormPaper mode="view" draft={shown} workspaceName={me.workspace.name} revision={revision} />
            )}
            {printing ? <FormPrint draft={shown} workspaceName={me.workspace.name} revision={revision} onDone={donePrinting} /> : null}
          </>
        ) : null}
      </div>
    </WithBack>
  );
}
