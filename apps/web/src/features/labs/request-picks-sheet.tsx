import { toast, Input, formatDecimal } from '@platlab/ui';
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { isApiError } from '../../app/api';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { labsErrorMessage, useSaveReagentPicks, useVersionConflict } from './commands';
import { useReagentPickOptions } from './queries';
import { inputOf, itemDetail, summarizePicks, type PickInputs } from './request-picks';
import { shortDateText } from './schedule-placement';

/**
 * «Cambiar frascos» (Administrador, ADR 0023, «Cierre de Laboratorios»): de qué frascos sale lo apartado de un reactivo
 * de un bloque, hasta lo pedido; lo que no cubre queda «Falta». Los frascos y lo disponible se piden al abrir y lo
 * apartado solo cambia en pantalla cuando el servidor confirma. Cerrar descarta lo escrito.
 */
export function RequestPicksSheet({
  workspaceId,
  open,
  onOpenChange,
  block,
  lineNumber,
  name,
}: SheetBaseProps & {
  /** El bloque de la fecha, con la versión que se vio. */
  block: { activityId: string; version: number; date: string };
  /** El número de la línea en la solicitud, desde 1. */
  lineNumber: number;
  name: string;
}) {
  const options = useReagentPickOptions(workspaceId, block.activityId, lineNumber, open);
  const save = useSaveReagentPicks(workspaceId, block.activityId, lineNumber);
  const conflict = useVersionConflict(workspaceId);
  const [edits, setEdits] = useState<PickInputs>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const data = options.data;
  const summary = data ? summarizePicks(data.items, edits, data.needed) : null;
  const dirty = data ? data.items.some((item) => inputOf(item, edits) !== inputOf(item, {})) : false;

  const close = () => {
    onOpenChange(false);
    setEdits({});
    setGeneralError(null);
  };

  const submit = async () => {
    if (!summary?.canSave) return;
    setGeneralError(null);
    try {
      await save.mutateAsync({ expectedVersion: block.version, picks: summary.picks });
      toast.success('Frascos cambiados');
      close();
    } catch (error) {
      if (isApiError(error, 'VERSION_CONFLICT')) {
        void conflict('este bloque');
        close();
        return;
      }
      setGeneralError(labsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={FlaskConical}
      title={`Frascos de ${name}`}
      description={data ? `${shortDateText(block.date)} · Pedido ${formatDecimal(data.needed)} ${data.unit}` : shortDateText(block.date)}
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      submitLabel="Guardar"
      pending={save.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      submitDisabled={!summary?.canSave}
      dirty={dirty}
      focusFirst
      pendingText="Guardando los frascos…"
      status={
        data && summary
          ? [
              `Elegido ${formatDecimal(summary.total)} de ${formatDecimal(data.needed)} ${data.unit}`,
              summary.missing ? `Falta ${formatDecimal(summary.missing)} ${data.unit}` : null,
              summary.exceedsNeeded ? 'Supera lo pedido' : null,
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
    >
      {options.isPending ? (
        <p className="text-sm text-ink-muted">Cargando los frascos…</p>
      ) : !data ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los frascos. Cierra la hoja e inténtalo de nuevo.
        </p>
      ) : data.items.length === 0 ? (
        <p className="text-sm text-ink-muted">No hay frascos disponibles para esta fecha.</p>
      ) : (
        <ul className="grid divide-y divide-line">
          {data.items.map((item) => {
            const code = item.containerCode ?? item.lotCode;
            const issue = summary?.issues[item.positionId];
            const issueId = `pick-${item.positionId}-issue`;
            return (
              <li key={item.positionId} className="grid gap-2 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-start sm:gap-4">
                <div className="grid min-w-0 gap-0.5 text-sm">
                  <p className="font-semibold text-ink [overflow-wrap:anywhere]">{code}</p>
                  <p className="text-ink-muted [overflow-wrap:anywhere]">{itemDetail(item)}</p>
                  <p className="text-ink-muted tabular-nums">
                    Disponible {formatDecimal(item.available)} {data.unit}
                  </p>
                </div>
                <div className="grid gap-1">
                  <Input
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    aria-label={`Cantidad en ${data.unit} del frasco ${code}`}
                    aria-invalid={issue ? true : undefined}
                    aria-describedby={issue ? issueId : undefined}
                    className="h-11 text-right tabular-nums sm:h-10"
                    value={inputOf(item, edits)}
                    onChange={(event) => {
                      setEdits((current) => ({ ...current, [item.positionId]: event.target.value }));
                      setGeneralError(null);
                    }}
                  />
                  {issue ? (
                    <p id={issueId} className="text-[13px] text-danger">
                      {issue}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </FormSheet>
  );
}
