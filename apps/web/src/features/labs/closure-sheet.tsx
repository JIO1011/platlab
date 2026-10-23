import { createClosureRequest } from '@platlab/contracts';
import { Field, Input, toast } from '@platlab/ui';
import { CalendarOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { labsErrorMessage, useCreateClosure } from './commands';

/** De qué es un cierre: de un área o, con `null`, un feriado común a todas. */
export type ClosureScope = { areaId: string; areaName: string } | null;

/**
 * «Nuevo cierre» o «Nuevo feriado» (Administrador): un rango de fechas en que no se agenda, de un área o, sin ella, común
 * a todas. Un cierre no se borra: se anula desde la lista.
 */
export function ClosureSheet({
  workspaceId,
  open,
  onOpenChange,
  scope,
  today,
}: SheetBaseProps & {
  scope: ClosureScope;
  /** Hoy en la zona del espacio, AAAA-MM-DD: la fecha con que se abre. */
  today: string;
}) {
  const create = useCreateClosure(workspaceId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { startsOn: today, endsOn: today, reason: '' } });
  const errors = form.formState.errors;

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    const missing = (['startsOn', 'endsOn'] as const).filter((field) => values[field] === '');
    for (const field of missing) form.setError(field, { message: field === 'startsOn' ? 'Elige desde cuándo.' : 'Elige hasta cuándo.' });
    if (missing.length > 0) return;
    const payload = validate(
      createClosureRequest,
      { areaId: scope?.areaId ?? null, startsOn: values.startsOn, endsOn: values.endsOn, reason: values.reason },
      form,
    );
    if (!payload) return;
    try {
      await create.mutateAsync(payload);
      toast.success(scope ? 'Cierre creado' : 'Feriado creado', { description: values.reason.trim() });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(labsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={CalendarOff}
      title={scope ? 'Nuevo cierre' : 'Nuevo feriado'}
      description={scope ? `Los días en que ${scope.areaName} no se agenda.` : 'Los días en que no se agenda ninguna área.'}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={scope ? 'Crear cierre' : 'Crear feriado'}
      pending={create.isPending}
      generalError={generalError ?? errors.root?.message ?? null}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty}
      required
      focusFirst
      pendingText={scope ? 'Creando el cierre…' : 'Creando el feriado…'}
    >
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
