import { Button, toast } from '@platlab/ui';
import { CircleCheck, Play, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { isApiError } from '../../app/api';
import { labsErrorMessage, useVersionConflict } from './commands';
import { blockAssets } from './practice-assets';
import { PracticeChecklist } from './practice-checklist';
import { PracticeCloseSheet } from './practice-close-sheet';
import { usePracticeStep, useSaveChecklist } from './practice-commands';
import { PracticeIncidentSheet } from './practice-incident-sheet';
import { canReportIncident, checklistNote, isChangeable, startBlockedReason } from './practice-stage';
import type { RequestView } from './request-draft';

type Block = RequestView['blocks'][number];

/** La línea del bloque (fecha, código y etapa): a donde va el foco cuando un paso cambia la etapa y el botón desaparece. */
export const blockMarkId = (activityId: string): string => `bloque-${activityId}`;

/**
 * Lo que quien lleva la práctica (`labs.schedule.lead`) hace en un bloque, según su etapa (L-01e, ADR 0023): antes de
 * empezar, la lista de chequeo y «Marcar lista»; con la lista, «Iniciar» desde el día de la práctica (el motivo, a la
 * vista mientras no se puede); en curso, «Cerrar práctica» (definitivo); en curso o cerrado, «Reportar incidencia». Los
 * pasos cambian la pantalla solo cuando el servidor confirma.
 */
export function PracticeActions({ workspaceId, request, block, today }: { workspaceId: string; request: RequestView; block: Block; today: string }) {
  const ready = usePracticeStep(workspaceId, block.activityId, 'ready');
  const start = usePracticeStep(workspaceId, block.activityId, 'start');
  const save = useSaveChecklist(workspaceId, block.activityId);
  const conflict = useVersionConflict(workspaceId);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'close' | 'incident' | null>(null);
  const reasonId = useId();
  const assets = blockAssets(request.lines, block);
  const blocked = block.stage === 'ready' ? startBlockedReason(block.date, today) : null;
  const note = isChangeable(block.stage) ? checklistNote(request.lines.length, block.preparedLines) : null;
  const reportable = canReportIncident(block.stage) && assets.length > 0;
  const moved = useRef(false);
  const afterClose = useRef(false);

  // El paso que acaba de confirmarse cambia la etapa y quita su botón: el foco pasa a la línea del bloque, que ya dice la nueva.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    document.getElementById(blockMarkId(block.activityId))?.focus();
  }, [block.stage, block.activityId]);

  // Un paso y una casilla llevan la misma versión del bloque: mientras uno guarda, el otro espera para no chocar.
  const advance = async (step: typeof ready, done: string) => {
    if (ready.isPending || start.isPending || save.isPending) return;
    setError(null);
    try {
      await step.mutateAsync({ expectedVersion: block.version });
      moved.current = true;
      toast.success(done, { description: block.code });
    } catch (failure) {
      if (isApiError(failure, 'VERSION_CONFLICT')) void conflict('este bloque');
      else setError(labsErrorMessage(failure));
    }
  };

  const hasActions = block.stage !== 'closed' || reportable;
  if (!isChangeable(block.stage) && !hasActions) return null;
  return (
    <div className="grid gap-3 rounded-control bg-surface-sunken p-3.5">
      {isChangeable(block.stage) ? <PracticeChecklist workspaceId={workspaceId} request={request} block={block} save={save} locked={ready.isPending || start.isPending} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        {block.stage === 'scheduled' ? (
          <Button variant="primary" className="h-11 sm:h-10" loading={ready.isPending} disabled={save.isPending} onClick={() => void advance(ready, 'Bloque listo')}>
            <CircleCheck aria-hidden />
            Marcar lista
          </Button>
        ) : null}
        {block.stage === 'ready' ? (
          <Button
            variant="primary"
            className="h-11 sm:h-10"
            loading={start.isPending}
            disabled={blocked !== null || save.isPending}
            aria-describedby={blocked ? reasonId : undefined}
            onClick={() => void advance(start, 'Práctica iniciada')}
          >
            <Play aria-hidden />
            Iniciar
          </Button>
        ) : null}
        {block.stage === 'running' ? (
          <Button variant="primary" className="h-11 sm:h-10" aria-haspopup="dialog" onClick={() => setSheet('close')}>
            Cerrar práctica
          </Button>
        ) : null}
        {reportable ? (
          <Button className="h-11 sm:h-10" aria-haspopup="dialog" onClick={() => setSheet('incident')}>
            <TriangleAlert aria-hidden />
            Reportar incidencia
          </Button>
        ) : null}
      </div>
      {blocked ? (
        <p id={reasonId} className="text-[13px] text-ink-muted">
          {blocked}
        </p>
      ) : null}
      {note ? (
        <p role="status" className="text-[13px] text-ink-muted">
          {note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <PracticeCloseSheet
        workspaceId={workspaceId}
        open={sheet === 'close'}
        onOpenChange={(open) => setSheet(open ? 'close' : null)}
        request={request}
        block={block}
        onClosed={() => {
          moved.current = true;
          afterClose.current = true;
        }}
        returnFocus={() => {
          // Cerrada la práctica, «Cerrar práctica» ya no está: al cerrarse la hoja, el foco va a la línea del bloque.
          if (!afterClose.current) return null;
          afterClose.current = false;
          return document.getElementById(blockMarkId(block.activityId));
        }}
      />
      <PracticeIncidentSheet workspaceId={workspaceId} open={sheet === 'incident'} onOpenChange={(open) => setSheet(open ? 'incident' : null)} request={request} block={block} />
    </div>
  );
}
