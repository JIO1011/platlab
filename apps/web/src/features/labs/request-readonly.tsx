import { Button } from '@platlab/ui';
import { Printer } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useLabs } from './context';
import { FormPaper, type PaperSlots } from './form-paper';
import { FormPrint } from './form-print';
import { useSpaces } from './queries';
import { draftFrom, paperOf, valueText, type RequestView } from './request-draft';
import { RequestHistory } from './request-history';
import { ViewRows } from './request-lines';

/**
 * La solicitud llena, de solo lectura (ADR 0023): la misma hoja del formato con lo que se llenó, para quien la envió y para
 * quien revisa. Los datos vacíos quedan en blanco. El área, que la hoja no tiene, va sobre ella; el historial con sus
 * motivos, al pie, fuera de la hoja. «Imprimir» saca la hoja llena en A4, con su membrete y logo.
 */
export function FilledRequest({ request }: { request: RequestView }) {
  const { workspaceId, me } = useLabs();
  const spaces = useSpaces(workspaceId);
  const [printing, setPrinting] = useState(false);
  const donePrinting = useCallback(() => setPrinting(false), []);
  const paper = useMemo(() => paperOf(request), [request]);
  const draft = useMemo(() => draftFrom(request), [request]);
  const area = spaces.data?.items.find((space) => space.areaId === request.areaId);

  const slots = useMemo<PaperSlots>(
    () => ({
      value: (field) => valueText(field, draft, request.layout),
      resourceRows: <ViewRows paper={paper} draft={draft} layout={request.layout} saved={request.lines} />,
      notes: draft.notes,
      requester: request.requesterName,
    }),
    [paper, draft, request],
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 break-words text-sm text-ink-muted">
          Área: <span className="font-medium text-ink">{area?.areaName ?? 'Sin área'}</span>
        </p>
        <Button className="h-11 sm:h-10" onClick={() => setPrinting(true)}>
          <Printer aria-hidden />
          Imprimir
        </Button>
      </div>
      <FormPaper mode="view" draft={paper} workspaceName={me.workspace.name} revision={request.formRevision} slots={slots} />
      <RequestHistory events={request.events} timeZone={me.workspace.timeZone} />
      {printing ? <FormPrint draft={paper} workspaceName={me.workspace.name} revision={request.formRevision} slots={slots} onDone={donePrinting} /> : null}
    </div>
  );
}
