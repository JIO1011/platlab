import { saveRequestRequest, type Space } from '@platlab/contracts';
import { Button, Field, Select, cn, toast } from '@platlab/ui';
import { useMemo, useState } from 'react';
import { isApiError } from '../../app/api';
import { filled } from '../../app/filled';
import { todayInZone } from '../../app/format';
import { labsErrorMessage, useSaveRequest, useSubmitRequest, useVersionConflict } from './commands';
import { useLabs } from './context';
import { FormPaper, type PaperSlots } from './form-paper';
import { useRequestOptions } from './queries';
import { CancelRequest } from './request-cancel';
import { CellNote, FillValue, bare, type FillState } from './request-cells';
import { draftFrom, missingKeys, noIssues, paperOf, requestIssues, sameDraft, saveBody, type RequestDraft, type RequestIssues, type RequestView } from './request-draft';
import { RequestHistory } from './request-history';
import { FillRows } from './request-lines';

/** Lo que se editó y la versión en que se empezó: es la que el servidor compara, aunque la pantalla se refresque. */
interface Edit {
  draft: RequestDraft;
  version: number;
}

const alertClass = 'rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger';
const NO_AREA = 'none';

/** El área, que la hoja no tiene donde poner: opcional y sobre ella, junto a lo demás de la solicitud. */
function AreaBar({ draft, spaces, error, onChange }: { draft: RequestDraft; spaces: readonly Space[]; error: string | undefined; onChange: (areaId: string | null) => void }) {
  const areas = spaces.filter((space) => space.archivedAt === null && !space.areaArchived);
  return (
    <div className="rounded-card bg-surface px-4 py-3 shadow-raised">
      <Field label="Área" optional error={error} hint="Dónde se hará la actividad, entre las áreas habilitadas para prácticas." className="max-w-md">
        <Select
          value={draft.areaId ?? NO_AREA}
          onValueChange={(value) => onChange(value === NO_AREA ? null : value)}
          placeholder="Sin área"
          triggerClassName={filled}
          options={[{ value: NO_AREA, label: 'Sin área' }, ...areas.map((space) => ({ value: space.areaId, label: space.areaName, ...(space.groupName ? { detail: space.groupName } : {}) }))]}
        />
      </Field>
    </div>
  );
}

/**
 * El llenado de una solicitud sobre la hoja del formato (ADR 0023): cada dato es un control dentro de su celda y los
 * recursos, filas de la tabla. Lo que se escribe es un borrador en pantalla sobre la versión que se vio; nada cambia hasta
 * que el servidor confirma «Guardar borrador» o «Enviar», que guarda lo pendiente y envía. Si otra persona la cambió antes,
 * el servidor lo rechaza y se carga la vigente. Las obligatorias vacías se marcan solo al intentar enviar.
 */
export function RequestEditor({ request, spaces }: { request: RequestView; spaces: readonly Space[] }) {
  const { workspaceId, me } = useLabs();
  const options = useRequestOptions(workspaceId);
  const save = useSaveRequest(workspaceId, request.id);
  const submit = useSubmitRequest(workspaceId, request.id);
  const conflict = useVersionConflict(workspaceId);
  const stored = useMemo(() => draftFrom(request), [request]);
  const paper = useMemo(() => paperOf(request), [request]);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [issues, setIssues] = useState<RequestIssues>(noIssues);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const shown = edit?.draft ?? stored;
  const dirty = edit !== null && !sameDraft(edit.draft, stored, request.layout);
  const busy = save.isPending || submit.isPending;
  const missing = useMemo(() => (attempted ? missingKeys(shown, request.layout) : new Set<string>()), [attempted, shown, request.layout]);

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
      setIssues(requestIssues(parsed.error, edit.draft));
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
    setAttempted(true);
    if (missingKeys(shown, request.layout).size > 0) {
      setError('Completa los datos marcados para enviar.');
      return;
    }
    const version = await persist();
    if (version === null) return;
    try {
      await submit.mutateAsync({ expectedVersion: version });
      toast.success('Solicitud enviada', { description: request.code });
    } catch (failure) {
      fail(failure);
    }
  };

  const state: FillState = { draft: shown, options: options.data, today: todayInZone(me.workspace.timeZone), issues, missing, onChange: change };
  const slots: PaperSlots = {
    value: (field) => <FillValue field={field} state={state} />,
    resourceRows: <FillRows paper={paper} draft={shown} layout={request.layout} saved={dirty ? null : request.lines} options={options.data} issues={issues} onChange={change} />,
    notes: (
      <>
        <textarea
          aria-label="Observaciones"
          aria-invalid={issues.fields['notes'] !== undefined || undefined}
          maxLength={2000}
          placeholder="Un equipo o material especial que no está en las listas va aquí."
          value={shown.notes}
          onChange={(event) => change({ notes: event.target.value })}
          className={cn(bare, '-mx-2 -my-1 min-h-14 w-[calc(100%+1rem)] resize-y px-2 py-1')}
        />
        <CellNote>{issues.fields['notes']}</CellNote>
      </>
    ),
    requester: request.requesterName,
  };

  const hasLines = shown.lines.length > 0;
  const status = dirty ? (hasLines ? 'Cambios sin guardar · guarda para comprobar si lo pedido alcanza' : 'Cambios sin guardar') : 'Sin cambios por guardar';

  return (
    <div className="grid gap-4 pb-28 md:pb-0">
      {error ? (
        <p role="alert" className={alertClass}>
          {error}
        </p>
      ) : null}
      <AreaBar draft={shown} spaces={spaces} error={issues.fields['areaId']} onChange={(areaId) => change({ areaId })} />
      <FormPaper mode="fill" draft={paper} workspaceName={me.workspace.name} revision={request.formRevision} slots={slots} />
      <RequestHistory events={request.events} timeZone={me.workspace.timeZone} />
      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line bg-surface/90 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:sticky md:inset-x-auto md:bottom-3 md:rounded-control md:border md:px-4 md:py-2 md:shadow-float">
        {cancelling ? (
          <div className="w-full">
            <CancelRequest workspaceId={workspaceId} request={request} onDismiss={() => setCancelling(false)} />
          </div>
        ) : (
          <>
            <p role="status" className="min-w-0 flex-1 basis-40 text-[13px] text-ink-muted">
              {status}
            </p>
            <Button variant="ghost" className="h-11 max-md:flex-1 md:h-10" disabled={busy} aria-haspopup="dialog" onClick={() => setCancelling(true)}>
              Cancelar solicitud
            </Button>
            <Button className="h-11 max-md:flex-1 md:h-10" loading={save.isPending} disabled={busy || !dirty} onClick={() => void saveDraft()}>
              Guardar borrador
            </Button>
            <Button variant="primary" className="h-11 max-md:flex-1 md:h-10" loading={submit.isPending} disabled={busy} onClick={() => void send()}>
              Enviar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
