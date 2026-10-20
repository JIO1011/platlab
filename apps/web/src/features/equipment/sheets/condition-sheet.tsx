import { conditionChangeRequest, type Asset, type AssetCondition } from '@platlab/contracts';
import { Button, Field, OptionRow, Textarea, sectionLabel, toast } from '@platlab/ui';
import { Activity, Ban } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormSheet, validate, type SheetBaseProps } from '../../../app/form-sheet';
import { conditionLabel } from '../asset-text';
import { ConditionBadge } from '../condition-badge';
import { equipmentErrorMessage, useChangeCondition } from '../commands';

/** Los estados a los que se puede pasar con solo un motivo, cada uno con su ayuda; «Dado de baja» tiene su propio bloque. */
const choices: Array<{ value: Exclude<AssetCondition, 'retired'>; help: string }> = [
  { value: 'operational', help: 'Funciona normalmente' },
  { value: 'restricted', help: 'Funciona, pero con una limitación (sin calibrar, falta un accesorio)' },
  { value: 'faulted', help: 'No se puede usar' },
];

/**
 * «Cambiar estado» (ADR 0019): el nuevo estado con su motivo, que queda en el historial. Volver a
 * Operativo pide además el resultado de lo que se hizo. Dar de baja es definitivo: vive en un bloque
 * aparte, solo para quien administra el catálogo, y no se envía hasta confirmarlo.
 */
export function ConditionSheet({
  workspaceId,
  open,
  onOpenChange,
  asset,
  canManage,
}: SheetBaseProps & { asset: Asset; canManage: boolean }) {
  const command = useChangeCondition(workspaceId, asset.id);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [retiring, setRetiring] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const confirmRef = useRef<HTMLInputElement>(null);
  const form = useForm({ defaultValues: { condition: '' as AssetCondition | '', reason: '', result: '' } });
  const errors = form.formState.errors;
  const condition = form.watch('condition');

  // Al abrir el bloque de la baja, el foco pasa a la confirmación.
  useEffect(() => {
    if (retiring) confirmRef.current?.focus();
  }, [retiring]);

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    const next = retiring ? 'retired' : values.condition;
    if (next === '') {
      form.setError('condition', { message: 'Elige el nuevo estado.' });
      return;
    }
    if (retiring && !confirmed) {
      setConfirmError(true);
      return;
    }
    const payload = validate(
      conditionChangeRequest,
      { condition: next, reason: values.reason, result: next === 'operational' ? values.result : undefined },
      form,
    );
    if (!payload) return;
    try {
      await command.mutateAsync(payload);
      toast.success(
        payload.condition === 'retired' ? `${asset.name} fue dado de baja` : `${asset.name}: ${conditionLabel[payload.condition]}`,
        {
          description:
            payload.condition === 'retired'
              ? 'Queda en el historial y ya no se puede cambiar.'
              : `Cambió de ${conditionLabel[asset.condition]} a ${conditionLabel[payload.condition]}.`,
        },
      );
      onOpenChange(false);
    } catch (error) {
      setGeneralError(equipmentErrorMessage(error));
    }
  });

  const startRetiring = () => {
    form.setValue('condition', '');
    form.clearErrors(['condition', 'result']);
    setRetiring(true);
  };
  const cancelRetiring = () => {
    setRetiring(false);
    setConfirmed(false);
    setConfirmError(false);
  };

  return (
    <FormSheet
      icon={Activity}
      title="Cambiar estado"
      description="Queda en el historial del equipo, con quién lo cambió, cuándo y por qué."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={retiring ? 'Dar de baja' : 'Cambiar estado'}
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      sections
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-control bg-surface-sunken px-3 py-2.5 text-sm">
          <p className="min-w-0 break-words font-semibold text-ink">{asset.name}</p>
          <p className="flex items-center gap-2 text-ink-muted">
            Ahora
            <ConditionBadge condition={asset.condition} />
          </p>
        </div>
        <Controller
          control={form.control}
          name="condition"
          render={({ field }) => (
            <fieldset disabled={retiring} className="grid min-w-0 gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-ink">Nuevo estado</legend>
              <div className="grid gap-0.5 rounded-xl border border-line bg-white/60 p-1">
                {choices
                  .filter((entry) => entry.value !== asset.condition)
                  .map((entry) => (
                    <OptionRow
                      key={entry.value}
                      type="radio"
                      name="estado"
                      checked={!retiring && field.value === entry.value}
                      aria-invalid={errors.condition ? true : undefined}
                      onChange={() => {
                        field.onChange(entry.value);
                        form.clearErrors('condition');
                      }}
                    >
                      <span className="block font-medium">{conditionLabel[entry.value]}</span>
                      <span className="block text-[13px] font-normal text-ink-muted">{entry.help}</span>
                    </OptionRow>
                  ))}
              </div>
              {errors.condition?.message ? (
                <p role="alert" className="text-[13px] font-medium text-danger">
                  {errors.condition.message}
                </p>
              ) : null}
            </fieldset>
          )}
        />
        <Field
          label="Motivo"
          hint={retiring ? 'Por qué sale de servicio para siempre.' : 'Qué pasó o por qué cambia.'}
          error={errors.reason?.message}
        >
          <Textarea rows={3} {...form.register('reason')} />
        </Field>
        {!retiring && condition === 'operational' ? (
          <Field label="Resultado" hint="Qué se hizo o se comprobó para volver a usarlo." error={errors.result?.message}>
            <Textarea rows={3} {...form.register('result')} />
          </Field>
        ) : null}
      </div>
      {canManage ? (
        <section aria-labelledby="baja-titulo" className="grid gap-3">
          <h3 id="baja-titulo" className={sectionLabel}>
            Dar de baja
          </h3>
          {retiring ? (
            <div className="grid gap-3 rounded-control bg-danger-soft p-3 text-sm text-danger">
              <p className="font-medium">Dar de baja es definitivo: el equipo queda en el historial y no se podrá cambiar.</p>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 font-medium text-ink">
                <input
                  ref={confirmRef}
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 cursor-pointer accent-danger"
                  checked={confirmed}
                  aria-invalid={confirmError ? true : undefined}
                  onChange={(event) => {
                    setConfirmed(event.target.checked);
                    setConfirmError(false);
                  }}
                />
                Entiendo que es definitivo y quiero dar de baja este equipo
              </label>
              {confirmError ? (
                <p role="alert" className="text-[13px] font-medium text-danger">
                  Marca la casilla para confirmar que es definitivo.
                </p>
              ) : null}
              <Button variant="ghost" className="justify-self-start text-danger hover:text-danger" onClick={cancelRetiring}>
                No dar de baja
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1 basis-48 text-sm text-ink-muted">Ya no forma parte del inventario.</p>
              <Button variant="secondary" onClick={startRetiring}>
                <Ban aria-hidden />
                Dar de baja…
              </Button>
            </div>
          )}
        </section>
      ) : null}
    </FormSheet>
  );
}
