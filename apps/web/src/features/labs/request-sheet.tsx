import { Button, Select } from '@platlab/ui';
import { Printer } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useLabs } from './context';
import type { PaperSlots } from './form-paper';
import { FormPrint } from './form-print';
import { blockAssets } from './practice-assets';
import { draftFrom, paperOf, valueText, type RequestView } from './request-draft';
import { ViewRows } from './request-lines';
import { practiceCodeLabel } from './request-summary';
import { formatDayShort } from '../../app/format';

/**
 * La hoja de solo lectura de una solicitud llena: la hoja del formato, lo llenado y los `slots` con que se ve y se imprime
 * la planilla, con el código de práctica en su casilla «Código». La columna «Código» lleva los equipos apartados de un bloque;
 * con varias fechas con equipos, `block` es la que se eligió (por omisión, la primera).
 */
export function useRequestSheet(request: RequestView) {
  const paper = useMemo(() => paperOf(request), [request]);
  const draft = useMemo(() => draftFrom(request), [request]);
  const withAssets = useMemo(() => request.blocks.filter((item) => blockAssets(request.lines, item).length > 0), [request]);
  const [blockId, setBlockId] = useState<string | undefined>(undefined);
  const block = withAssets.find((item) => item.activityId === blockId) ?? withAssets[0];

  const slots = useMemo<PaperSlots>(() => {
    const practiceCode = practiceCodeLabel(request.blockCodes);
    return {
      value: (field) => valueText(field, draft, request.layout),
      resourceRows: <ViewRows paper={paper} draft={draft} layout={request.layout} saved={request.lines} block={block} />,
      notes: draft.notes,
      requester: request.requesterName,
      ...(practiceCode ? { practiceCode } : {}),
    };
  }, [paper, draft, request, block]);
  return { paper, draft, slots, withAssets, block, setBlockId };
}

export type RequestSheet = ReturnType<typeof useRequestSheet>;

/** «Imprimir» saca la planilla llena en A4; con varias fechas con equipos, antes se elige de cuál van los códigos. */
export function PrintControls({ request, sheet }: { request: RequestView; sheet: RequestSheet }) {
  const { me } = useLabs();
  const { paper, slots, withAssets, block, setBlockId } = sheet;
  const [printing, setPrinting] = useState(false);
  const donePrinting = useCallback(() => setPrinting(false), []);
  return (
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
            options={withAssets.map((item) => ({ value: item.activityId, label: `Códigos: ${formatDayShort(item.date)}` }))}
          />
        </div>
      ) : null}
      <Button variant="secondary" className="h-11 shrink-0 sm:h-10" onClick={() => setPrinting(true)}>
        <Printer aria-hidden />
        Imprimir
      </Button>
      {printing ? <FormPrint draft={paper} workspaceName={me.workspace.name} revision={request.formRevision} slots={slots} onDone={donePrinting} /> : null}
    </div>
  );
}
