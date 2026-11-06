import { Button, Select } from '@platlab/ui';
import { Printer } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useLabs } from './context';
import { FormPaper, type PaperSlots } from './form-paper';
import { FormPrint } from './form-print';
import { useSpaces } from './queries';
import { draftFrom, paperOf, valueText, type RequestView } from './request-draft';
import { RequestHistory } from './request-history';
import { RequestHolds } from './request-holds';
import { ViewRows } from './request-lines';
import { blockAssets } from './practice-assets';
import { shortDateText } from './schedule-placement';

/**
 * La hoja del formato con lo que se llenó, de solo lectura (ADR 0023): para quien la envió y para quien revisa. Los datos
 * vacíos quedan en blanco. El área, que la hoja no tiene, va sobre ella; «Imprimir» saca la
 * hoja llena en A4, con su membrete y logo.
 */
export function PaperSheet({ request, showFormat = false }: { request: RequestView; /** Dice también el formato y su revisión (quien revisa no los ve en el encabezado). */ showFormat?: boolean }) {
  const { workspaceId, me } = useLabs();
  const spaces = useSpaces(workspaceId);
  const [printing, setPrinting] = useState(false);
  const donePrinting = useCallback(() => setPrinting(false), []);
  const paper = useMemo(() => paperOf(request), [request]);
  const draft = useMemo(() => draftFrom(request), [request]);
  // La columna «Código» lleva los equipos apartados del bloque que se imprime; con varias fechas con equipos, se elige cuál.
  const withAssets = request.blocks.filter((item) => blockAssets(request.lines, item).length > 0);
  const [blockId, setBlockId] = useState<string | undefined>(undefined);
  const block = withAssets.find((item) => item.activityId === blockId) ?? withAssets[0];
  const area = spaces.data?.items.find((space) => space.areaId === request.areaId);

  const slots = useMemo<PaperSlots>(
    () => ({
      value: (field) => valueText(field, draft, request.layout),
      resourceRows: <ViewRows paper={paper} draft={draft} layout={request.layout} saved={request.lines} block={block} />,
      notes: draft.notes,
      requester: request.requesterName,
    }),
    [paper, draft, request, block],
  );

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 break-words text-sm text-ink-muted">
          {showFormat ? `${request.formName} · revisión ${request.formRevision} · ` : null}Área: <span className="font-medium text-ink">{area?.areaName ?? 'Sin área'}</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {paper.equipmentCode && withAssets.length > 1 && block ? (
            <div className="w-44">
              <Select
                standalone
                aria-label="Fecha de los códigos de equipos que se imprimen"
                value={block.activityId}
                onValueChange={setBlockId}
                placeholder="Fecha"
                triggerClassName="max-sm:h-11"
                options={withAssets.map((item) => ({ value: item.activityId, label: `Códigos: ${shortDateText(item.date)}` }))}
              />
            </div>
          ) : null}
          <Button variant="secondary" className="h-11 shrink-0 sm:h-10" onClick={() => setPrinting(true)}>
            <Printer aria-hidden />
            Imprimir
          </Button>
        </div>
      </div>
      <FormPaper mode="view" draft={paper} workspaceName={me.workspace.name} revision={request.formRevision} slots={slots} />
      {printing ? <FormPrint draft={paper} workspaceName={me.workspace.name} revision={request.formRevision} slots={slots} onDone={donePrinting} /> : null}
    </div>
  );
}

/** La solicitud llena, de solo lectura, para quien la envió: la hoja y, al pie, lo apartado en cada fecha programada y el historial con sus motivos. */
export function FilledRequest({ request }: { request: RequestView }) {
  const { me } = useLabs();
  return (
    <div className="grid gap-4">
      <PaperSheet request={request} />
      <RequestHolds request={request} />
      <RequestHistory events={request.events} timeZone={me.workspace.timeZone} />
    </div>
  );
}
