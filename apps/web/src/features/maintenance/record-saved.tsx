import { conditionLabel } from '@platlab/contracts';
import { Button, OptionRow } from '@platlab/ui';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import type { RecordWork } from './use-record-work';

const conditionHelp = { restricted: 'Se puede usar, con una limitación', faulted: 'No se puede usar' } as const;

/**
 * Lo que la hoja de «Registrar mantenimiento» muestra una vez guardado el registro (que ya no se edita): el mensaje
 * según lo que pasó con el plan, el certificado si falló su adjunto y, tras un No conforme, la propuesta de cambiar el
 * estado del equipo, que solo se aplica si quien registró la confirma.
 */
export function RecordSaved({ work }: { work: RecordWork }) {
  const { state, outcome, conditionOffer, changeCondition } = work;
  const [choice, setChoice] = useState<'restricted' | 'faulted' | ''>('');
  const [dismissed, setDismissed] = useState(false);
  if (state.step === 'idle' || state.step === 'saving') return null;
  const record = state.record;
  const failed = record.result === 'fail';

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
          <CircleCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">Mantenimiento guardado</h3>
          <p role="status" className="mt-0.5 text-sm text-ink-muted">
            <span className="font-mono tabular-nums">{record.asset.code}</span> {record.asset.name}.{' '}
            {outcome ? outcome.text : 'Adjuntando el certificado…'}
          </p>
        </div>
      </div>

      {state.step === 'attachFailed' ? (
        <div role="alert" className="grid justify-items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <p>
            El mantenimiento sí quedó guardado, pero el certificado no se adjuntó. {work.attachError} Puedes reintentarlo ahora o adjuntarlo después
            desde el Historial.
          </p>
          <Button size="sm" className="max-sm:h-11" onClick={work.retryAttach}>
            Reintentar adjunto
          </Button>
        </div>
      ) : null}

      {failed && conditionOffer && !dismissed ? (
        changeCondition.done ? (
          <p role="status" className="flex items-center gap-2 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink">
            <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
            El estado del equipo cambió a {choice ? conditionLabel[choice] : 'el elegido'}. Queda en su historial.
          </p>
        ) : (
          <fieldset className="grid min-w-0 gap-3 rounded-control border border-danger/25 bg-danger-soft/40 p-3">
            <legend className="px-1 text-sm font-semibold text-danger">Quedó No conforme: ¿cambiar el estado del equipo?</legend>
            <div className="grid gap-0.5 rounded-xl border border-line bg-white/60 p-1">
              {conditionOffer.options.map((option) => (
                <OptionRow
                  key={option}
                  type="radio"
                  name="nuevo-estado"
                  checked={choice === option}
                  disabled={changeCondition.pending}
                  onChange={() => setChoice(option)}
                >
                  <span className="block font-medium">{conditionLabel[option]}</span>
                  <span className="block text-[13px] font-normal text-ink-muted">{conditionHelp[option]}</span>
                </OptionRow>
              ))}
            </div>
            <p className="text-[13px] text-ink-muted">
              <span className="font-medium text-ink">Motivo que quedará en el historial:</span> {conditionOffer.reason}
            </p>
            {changeCondition.error ? (
              <p role="alert" className="flex items-start gap-2 text-[13px] font-medium text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{changeCondition.error} El mantenimiento sí quedó guardado.</span>
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                className="h-11 sm:h-10"
                disabled={choice === ''}
                loading={changeCondition.pending}
                onClick={() => choice && changeCondition.confirm(choice, conditionOffer.reason)}
              >
                Cambiar estado
              </Button>
              <Button variant="ghost" className="h-11 sm:h-10" disabled={changeCondition.pending} onClick={() => setDismissed(true)}>
                Ahora no
              </Button>
            </div>
          </fieldset>
        )
      ) : null}

      {failed && !conditionOffer ? (
        <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
          El estado del equipo no cambió. Si no debe usarse, pide a quien administra Equipos que lo cambie.
        </p>
      ) : null}
    </div>
  );
}
