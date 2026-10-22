import { saveRequestRequest, type Space } from '@platlab/contracts';
import { Button, Segmented, toast } from '@platlab/ui';
import { useMemo, useState } from 'react';
import { isApiError } from '../../app/api';
import { todayInZone } from '../../app/format';
import { labsErrorMessage, useSaveRequest, useSubmitRequest, useVersionConflict } from './commands';
import { useLabs } from './context';
import { useRequestOptions } from './queries';
import { DataStep } from './request-data-step';
import { draftFrom, noIssues, requestIssues, sameDraft, saveBody, type RequestDraft, type RequestIssues, type RequestView } from './request-draft';
import { ResourcesStep } from './request-resources-step';
import { ReviewStep } from './request-review-step';

const steps = [
  { value: 'datos', label: '1. Datos' },
  { value: 'recursos', label: '2. Recursos' },
  { value: 'revisar', label: '3. Revisar' },
] as const;

type Step = (typeof steps)[number]['value'];

/** Lo que se editó y la versión en que se empezó: es la que el servidor compara, aunque la pantalla se refresque. */
interface Edit {
  draft: RequestDraft;
  version: number;
}

const alertClass = 'rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger';

/**
 * El llenado de una solicitud en tres pasos (Datos, Recursos y Revisar) para quien puede editarla. Lo que se escribe es
 * un borrador en pantalla sobre la versión que se vio; nada cambia hasta que el servidor confirma «Guardar borrador» o
 * «Enviar», que guarda lo pendiente y envía. Si otra persona la cambió antes, el servidor lo rechaza y se carga la vigente.
 */
export function RequestEditor({ request, spaces }: { request: RequestView; spaces: readonly Space[] }) {
  const { workspaceId, me } = useLabs();
  const options = useRequestOptions(workspaceId);
  const save = useSaveRequest(workspaceId, request.id);
  const submit = useSubmitRequest(workspaceId, request.id);
  const conflict = useVersionConflict(workspaceId);
  const stored = useMemo(() => draftFrom(request), [request]);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [step, setStep] = useState<Step>('datos');
  const [issues, setIssues] = useState<RequestIssues>(noIssues);
  const [error, setError] = useState<string | null>(null);

  const shown = edit?.draft ?? stored;
  const dirty = edit !== null && !sameDraft(edit.draft, stored, request.layout);
  const busy = save.isPending || submit.isPending;
  const at = steps.findIndex((entry) => entry.value === step);
  const previous = steps[at - 1];
  const next = steps[at + 1];

  const change = (patch: Partial<RequestDraft>) => {
    setEdit({ draft: { ...shown, ...patch }, version: edit?.version ?? request.version });
    setIssues(noIssues);
    setError(null);
  };

  const fail = (failure: unknown) => {
    if (isApiError(failure, 'VERSION_CONFLICT')) {
      void conflict('esta solicitud');
      setEdit(null);
    } else {
      setError(labsErrorMessage(failure));
    }
  };

  /** Guarda lo pendiente y devuelve la versión vigente; `null` si no se pudo guardar. */
  const persist = async (): Promise<number | null> => {
    setError(null);
    if (!edit || !dirty) return request.version;
    const parsed = saveRequestRequest.safeParse(saveBody(edit.draft, request.layout, edit.version));
    if (!parsed.success) {
      const found = requestIssues(parsed.error, edit.draft);
      setIssues(found);
      setStep(Object.keys(found.fields).length > 0 ? 'datos' : 'recursos');
      setError('Revisa lo que está marcado.');
      return null;
    }
    try {
      const saved = await save.mutateAsync(parsed.data);
      setEdit(null);
      return saved.version;
    } catch (failure) {
      fail(failure);
      return null;
    }
  };

  const saveDraft = async () => {
    if ((await persist()) !== null) toast.success('Borrador guardado', { description: request.code });
  };

  const send = async () => {
    const version = await persist();
    if (version === null) return;
    try {
      await submit.mutateAsync({ expectedVersion: version });
      toast.success('Solicitud enviada', { description: request.code });
    } catch (failure) {
      fail(failure);
    }
  };

  const checks = dirty ? null : request.lines;

  return (
    <div className="grid gap-4">
      <Segmented label="Pasos de la solicitud" value={step} options={steps} onValueChange={setStep} className="max-sm:flex max-sm:[&>*]:flex-1 max-sm:[&>*]:px-2" />
      {error ? (
        <p role="alert" className={alertClass}>
          {error}
        </p>
      ) : null}
      {step === 'datos' ? (
        <DataStep draft={shown} layout={request.layout} options={options.data} spaces={spaces} issues={issues} today={todayInZone(me.workspace.timeZone)} onChange={change} />
      ) : step === 'recursos' ? (
        <ResourcesStep draft={shown} layout={request.layout} options={options.data} saved={checks} issues={issues} onChange={change} />
      ) : (
        <ReviewStep request={request} draft={shown} spaces={spaces} saved={checks} timeZone={me.workspace.timeZone} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-4">
        <p role="status" className="text-sm text-ink-muted">
          {dirty ? 'Cambios sin guardar' : 'Sin cambios por guardar'}
        </p>
        <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
          {previous ? (
            <Button variant="ghost" className="h-11 sm:h-10" disabled={busy} onClick={() => setStep(previous.value)}>
              Anterior
            </Button>
          ) : null}
          <Button className="h-11 sm:h-10" loading={save.isPending} disabled={busy || !dirty} onClick={() => void saveDraft()}>
            Guardar borrador
          </Button>
          {next ? (
            <Button variant="primary" className="h-11 sm:h-10" disabled={busy} onClick={() => setStep(next.value)}>
              Siguiente
            </Button>
          ) : (
            <Button variant="primary" className="h-11 sm:h-10" loading={submit.isPending} disabled={busy} onClick={() => void send()}>
              Enviar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
