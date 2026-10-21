import { createPeriodRequest, updatePeriodRequest, type Period } from '@platlab/contracts';
import { Field, Input, toast } from '@platlab/ui';
import { CalendarRange } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError } from '../../app/api';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { labsErrorMessage, useSavePeriod, useVersionConflict } from './commands';

const missingText = { code: 'Escribe el código, por ejemplo P1.', startsOn: 'Elige desde cuándo.', endsOn: 'Elige hasta cuándo.' } as const;

/**
 * «Nuevo período» y «Editar período» (Administrador): un código corto y las fechas en que se agenda. Los períodos
 * activos no se repiten ni se solapan. Al editar, solo viaja lo que cambió, con la versión que se vio; las dos fechas
 * viajan juntas si cambia alguna.
 */
export function PeriodSheet({
  workspaceId,
  open,
  onOpenChange,
  period,
  today,
}: SheetBaseProps & {
  /** El período que se edita; sin él, se crea uno nuevo. */
  period?: Period | undefined;
  /** Hoy en la zona del espacio, AAAA-MM-DD: desde cuándo se abre un período nuevo. */
  today: string;
}) {
  const save = useSavePeriod(workspaceId, period?.id);
  const conflict = useVersionConflict(workspaceId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { code: period?.code ?? '', startsOn: period?.startsOn ?? today, endsOn: period?.endsOn ?? '' } });
  const errors = form.formState.errors;

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    const missing = (['code', 'startsOn', 'endsOn'] as const).filter((field) => values[field].trim() === '');
    for (const field of missing) form.setError(field, { message: missingText[field] });
    if (missing.length > 0) return;
    const code = values.code.trim().toUpperCase();
    const datesChanged = values.startsOn !== period?.startsOn || values.endsOn !== period?.endsOn;
    const changes = { ...(code !== period?.code ? { code } : {}), ...(datesChanged ? { startsOn: values.startsOn, endsOn: values.endsOn } : {}) };
    if (period && Object.keys(changes).length === 0) {
      setGeneralError('No cambiaste nada.');
      return;
    }
    const payload = period
      ? validate(updatePeriodRequest, { ...changes, expectedVersion: period.version }, form)
      : validate(createPeriodRequest, changes, form);
    if (!payload) return;
    try {
      await save.mutateAsync(payload);
      toast.success(period ? 'Período actualizado' : 'Período creado', { description: code });
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'CODE_TAKEN')) {
        form.setError('code', { message: 'Otro período activo ya usa ese código. Elige otro.' });
      } else if (isApiError(error, 'VERSION_CONFLICT')) {
        void conflict('este período');
        onOpenChange(false);
      } else {
        setGeneralError(labsErrorMessage(error));
      }
    }
  };

  return (
    <FormSheet
      icon={CalendarRange}
      title={period ? 'Editar período' : 'Nuevo período'}
      description={period ? `Ajusta el código o las fechas de ${period.code}.` : 'Un código corto y las fechas en que se agenda. No se solapa con otro período activo.'}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={period ? 'Guardar cambios' : 'Crear período'}
      pending={save.isPending}
      generalError={generalError ?? errors.root?.message ?? null}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty}
      required
      focusFirst
      pendingText="Guardando el período…"
    >
      <Field label="Código" required hint="Va en el código de cada práctica, como P1 en P1-S12-ANT03. Hasta 10 letras, números o guiones." error={errors.code?.message}>
        <Input maxLength={10} autoComplete="off" className="h-11 font-mono uppercase tabular-nums sm:h-10" {...form.register('code')} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Desde" required error={errors.startsOn?.message}>
          <Input
            type="date"
            className="h-11 sm:h-10"
            {...form.register('startsOn', { onChange: (event) => form.getValues('endsOn') !== '' && form.getValues('endsOn') < event.target.value && form.setValue('endsOn', event.target.value) })}
          />
        </Field>
        <Field label="Hasta" required hint="Hasta un año de duración." error={errors.endsOn?.message}>
          <Input type="date" className="h-11 sm:h-10" {...form.register('endsOn')} />
        </Field>
      </div>
    </FormSheet>
  );
}
