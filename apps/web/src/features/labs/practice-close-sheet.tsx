import { Field, Input, Textarea, toast } from '@platlab/ui';
import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { isApiError } from '../../app/api';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { labsErrorMessage, useVersionConflict } from './commands';
import { closeRows, quantityText, summarizeClose, type UsedInputs } from './practice-close';
import { useClosePractice } from './practice-commands';
import type { RequestView } from './request-draft';
import { shortDateText } from './schedule-placement';

const NOTES_MAX = 1000;

/**
 * «Cerrar práctica» (L-01e, ADR 0023): por cada reactivo apartado en el bloque, lo apartado, lo utilizado (obligatorio,
 * aunque sea 0, hasta lo apartado) y lo devuelto, que es la resta exacta; más observaciones opcionales. Cerrar es
 * definitivo y no tiene «deshacer»: lo utilizado sale del inventario y lo demás vuelve a estar disponible. Cambia solo
 * cuando el servidor confirma; cerrar la hoja descarta lo escrito.
 */
export function PracticeCloseSheet({
  workspaceId,
  open,
  onOpenChange,
  request,
  block,
}: SheetBaseProps & {
  request: RequestView;
  block: RequestView['blocks'][number];
}) {
  const close = useClosePractice(workspaceId, block.activityId);
  const conflict = useVersionConflict(workspaceId);
  const [inputs, setInputs] = useState<UsedInputs>({});
  const [notes, setNotes] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const rows = closeRows(request.lines, block);
  const summary = summarizeClose(rows, inputs);
  const blank = summary.lines.filter((line) => line.blank).length;

  const dismiss = () => {
    onOpenChange(false);
    setInputs({});
    setNotes('');
    setAttempted(false);
    setGeneralError(null);
  };

  const submit = async () => {
    setAttempted(true);
    if (!summary.canClose) return;
    setGeneralError(null);
    try {
      await close.mutateAsync({ expectedVersion: block.version, usage: summary.usage, notes: notes.trim() || null });
      toast.success('Práctica cerrada', { description: `${block.code} · lo utilizado salió del inventario.` });
      dismiss();
    } catch (error) {
      if (isApiError(error, 'VERSION_CONFLICT')) {
        void conflict('este bloque');
        dismiss();
        return;
      }
      setGeneralError(labsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={ClipboardCheck}
      title="Cerrar práctica"
      description={`${block.code} · ${shortDateText(block.date)}. Cerrar es definitivo: lo utilizado sale del inventario y lo demás vuelve a estar disponible.`}
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : dismiss())}
      submitLabel="Cerrar práctica"
      pending={close.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={notes !== '' || Object.values(inputs).some((value) => value !== '')}
      focusFirst
      pendingText="Cerrando la práctica…"
      status={attempted && blank > 0 ? (blank === 1 ? 'Falta indicar lo utilizado de 1 reactivo' : `Falta indicar lo utilizado de ${blank} reactivos`) : undefined}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">Este bloque no tiene reactivos apartados: solo se registran las observaciones.</p>
      ) : (
        <ul className="grid divide-y divide-line">
          {summary.lines.map((line) => {
            const shown = attempted || !line.blank;
            return (
              <li key={line.line} role="group" aria-labelledby={`close-${line.line}-name`} className="grid gap-2 py-3.5 first:pt-0 last:pb-0">
                <p id={`close-${line.line}-name`} className="break-words text-sm font-semibold text-ink">
                  {line.name}
                </p>
                <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <Field label={`Utilizado (${line.unit})`} required error={shown ? (line.issue ?? undefined) : undefined}>
                    <Input
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      className="h-11 text-right tabular-nums sm:h-10"
                      value={inputs[line.line] ?? ''}
                      onChange={(event) => {
                        setInputs((current) => ({ ...current, [line.line]: event.target.value }));
                        setGeneralError(null);
                      }}
                    />
                  </Field>
                  <dl className="grid content-start gap-1 text-sm tabular-nums">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">Apartado</dt>
                      <dd className="text-ink">{quantityText(line.held, line.unit)}</dd>
                    </div>
                    <div className="flex justify-between gap-3" aria-live="polite">
                      <dt className="text-ink-muted">Devuelto</dt>
                      <dd className="font-semibold text-ink">{line.returned === null ? '—' : quantityText(line.returned, line.unit)}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Field label="Observaciones" optional hint={`Qué pasó con los materiales y equipos, o lo que quien sigue debe saber. Hasta ${NOTES_MAX} caracteres.`}>
        <Textarea rows={3} maxLength={NOTES_MAX} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
    </FormSheet>
  );
}
