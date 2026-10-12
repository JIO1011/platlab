import { createProductRequest, product as productContract } from '@platlab/contracts';
import { Field, Input, Select, normalizeDecimalInput, toast, type SelectOption } from '@platlab/ui';
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { commandErrorMessage, useCommand } from '../commands';
import { type SheetBaseProps, validate, FormSheet } from './shared';

const units: SelectOption[] = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'mg', label: 'Miligramos (mg)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'mL', label: 'Mililitros (mL)' },
  { value: 'L', label: 'Litros (L)' },
  { value: 'u', label: 'Unidades (u)' },
];

const physicalStates: SelectOption[] = [
  { value: 'solid', label: 'Sólido' },
  { value: 'liquid', label: 'Líquido' },
  { value: 'gas', label: 'Gas' },
];

export function NewProductSheet({ workspaceId, open, onOpenChange }: SheetBaseProps) {
  const command = useCommand(workspaceId, '/products', productContract);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { code: '', name: '', baseUnit: 'g', casNumber: '', physicalState: '', minimum: '' },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    const payload = validate(
      createProductRequest,
      {
        code: values.code.trim(),
        name: values.name.trim(),
        baseUnit: values.baseUnit,
        casNumber: values.casNumber.trim() || null,
        physicalState: values.physicalState || null,
        minimum: values.minimum.trim() ? normalizeDecimalInput(values.minimum) : null,
      },
      form,
    );
    if (!payload) return;
    try {
      const created = await command.mutateAsync(payload);
      toast.success('Reactivo creado', { description: `${created.code} · ${created.name}` });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      icon={FlaskConical}
      title="Nuevo reactivo"
      description="Se crea en el catálogo del espacio. Después podrás registrar sus lotes."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Crear reactivo"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Field label="Código" error={errors.code?.message} hint="Único en el espacio.">
          <Input autoComplete="off" spellCheck={false} {...form.register('code')} />
        </Field>
        <Field label="Nombre" error={errors.name?.message}>
          <Input autoComplete="off" {...form.register('name')} />
        </Field>
      </div>
      <Field label="Unidad base" error={errors.baseUnit?.message} hint="Las cantidades de este reactivo se registran siempre en esta unidad.">
        <Controller
          control={form.control}
          name="baseUnit"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} options={units} placeholder="Elige una unidad" />
          )}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Número CAS" optional error={errors.casNumber?.message} hint="Por ejemplo, 7647-14-5.">
          <Input inputMode="numeric" autoComplete="off" spellCheck={false} {...form.register('casNumber')} />
        </Field>
        <Field label="Estado físico" optional error={errors.physicalState?.message}>
          <Controller
            control={form.control}
            name="physicalState"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange} options={physicalStates} placeholder="Sin indicar" />
            )}
          />
        </Field>
      </div>
      <Field
        label="Mínimo"
        optional
        error={errors.minimum?.message}
        hint="Avisa «Bajo mínimo» cuando la existencia total del reactivo, en todo el espacio, baje de esta cantidad."
      >
        <div className="relative">
          <Input inputMode="decimal" autoComplete="off" className="pr-12" {...form.register('minimum')} />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
            {form.watch('baseUnit')}
          </span>
        </div>
      </Field>
    </FormSheet>
  );
}
