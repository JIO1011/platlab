import { createClosureRequest, type Space } from '@platlab/contracts';
import { Field, Input, Select, toast } from '@platlab/ui';
import { CalendarOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { labsErrorMessage, useCreateClosure } from './commands';

/** El valor del selector para «todo el espacio»: un feriado común, sin área. */
const EVERYONE = 'all';

/**
 * «Nuevo cierre» (Administrador): un rango de fechas en que no se agenda, de un espacio o, sin área, un feriado
 * común a todos. Un cierre no se borra: se anula desde la lista.
 */
export function ClosureSheet({
  workspaceId,
  open,
  onOpenChange,
  spaces,
  today,
}: SheetBaseProps & {
  /** Los espacios activos que se pueden cerrar. */
  spaces: Space[];
  /** Hoy en la zona del espacio, AAAA-MM-DD: la fecha con que se abre. */
  today: string;
}) {
  const create = useCreateClosure(workspaceId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { areaId: EVERYONE, startsOn: today, endsOn: today, reason: '' } });
  const errors = form.formState.errors;
  const areaId = form.watch('areaId');

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    const missing = (['startsOn', 'endsOn'] as const).filter((field) => values[field] === '');
    for (const field of missing) form.setError(field, { message: field === 'startsOn' ? 'Elige desde cuándo.' : 'Elige hasta cuándo.' });
    if (missing.length > 0) return;
    const payload = validate(
      createClosureRequest,
      { areaId: values.areaId === EVERYONE ? null : values.areaId, startsOn: values.startsOn, endsOn: values.endsOn, reason: values.reason },
      form,
    );
    if (!payload) return;
    try {
      await create.mutateAsync(payload);
      toast.success('Cierre creado', { description: values.reason.trim() });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(labsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={CalendarOff}
      title="Nuevo cierre"
      description="Los días en que no se agenda: un feriado de todo el espacio o el cierre de una sola área."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Crear cierre"
      pending={create.isPending}
      generalError={generalError ?? errors.root?.message ?? null}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty}
      required
      focusFirst
      pendingText="Creando el cierre…"
    >
      <Field label="Qué se cierra" required error={errors.areaId?.message}>
        <Select
          value={areaId}
          onValueChange={(value) => form.setValue('areaId', value, { shouldDirty: true })}
          placeholder="Elige"
          triggerClassName="h-11 sm:h-10"
          options={[
            { value: EVERYONE, label: 'Todo el espacio (feriado común)' },
            ...spaces.map((entry) => ({ value: entry.areaId, label: entry.areaName, ...(entry.groupName ? { group: entry.groupName } : {}) })),
          ]}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Desde" required error={errors.startsOn?.message}>
          <Input type="date" className="h-11 sm:h-10" {...form.register('startsOn', { onChange: (event) => form.getValues('endsOn') < event.target.value && form.setValue('endsOn', event.target.value) })} />
        </Field>
        <Field label="Hasta" required hint="El mismo día, si es uno solo." error={errors.endsOn?.message}>
          <Input type="date" className="h-11 sm:h-10" {...form.register('endsOn')} />
        </Field>
      </div>
      <Field label="Motivo" required hint="Se muestra en la lista de cierres." error={errors.reason?.message}>
        <Input maxLength={200} autoComplete="off" className="h-11 sm:h-10" {...form.register('reason')} />
      </Field>
    </FormSheet>
  );
}
