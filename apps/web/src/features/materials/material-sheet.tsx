import { materialClass, newMaterial, updateMaterialRequest, type Material, type MaterialClass } from '@platlab/contracts';
import { Field, Input, Segmented, Select, toast } from '@platlab/ui';
import { Package } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { materialsErrorMessage, useCreateMaterial, useUpdateMaterial } from './commands';
import { classHints, classLabels, unitOptions } from './text';

/** Si el insumo vence (MA-01f): sí pide fecha y lote en cada ingreso; no sigue con un solo lote sin fecha. */
const expiryOptions = [
  { value: 'no', label: 'No vence' },
  { value: 'yes', label: 'Vence' },
] as const;

/**
 * «Registrar material» y «Editar material» (Administrador): el nombre, su clase (que decide cómo se mueve y no cambia
 * después), su unidad y, si es un insumo, si vence. Un material que se presta siempre se cuenta en unidades; la unidad de un
 * material ya movido no cambia. El código es automático.
 */
export function MaterialSheet({
  workspaceId,
  open,
  onOpenChange,
  material,
  unitEditable = true,
  onCreated,
}: SheetBaseProps & {
  material?: Material | undefined;
  /** Si la unidad aún puede cambiar (el material no tiene movimientos). */
  unitEditable?: boolean | undefined;
  /** Se llama con el material recién creado: la hoja de ingreso puede dejarlo elegido. */
  onCreated?: ((created: Material) => void) | undefined;
}) {
  const create = useCreateMaterial(workspaceId);
  const update = useUpdateMaterial(workspaceId, material?.id ?? '');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm<{ name: string; class: MaterialClass; baseUnit: string; expires: 'yes' | 'no' }>({
    defaultValues: {
      name: material?.name ?? '',
      class: material?.class ?? 'consumable',
      baseUnit: material?.baseUnit ?? 'u',
      expires: material?.tracksExpiry ? 'yes' : 'no',
    },
  });
  const errors = form.formState.errors;
  const chosenClass = form.watch('class');
  const countedInUnits = chosenClass !== 'consumable';

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    const name = values.name.trim();
    const tracksExpiry = !countedInUnits && values.expires === 'yes';
    try {
      if (material) {
        const changes = {
          ...(name !== material.name ? { name } : {}),
          ...(values.baseUnit !== material.baseUnit ? { baseUnit: values.baseUnit } : {}),
          ...(tracksExpiry !== material.tracksExpiry ? { tracksExpiry } : {}),
        };
        if (Object.keys(changes).length === 0) {
          setGeneralError('No cambiaste nada.');
          return;
        }
        const payload = validate(updateMaterialRequest, changes, form);
        if (!payload) return;
        await update.mutateAsync(payload);
        toast.success('Material actualizado', { description: name });
      } else {
        const payload = validate(newMaterial, { name, class: values.class, baseUnit: countedInUnits ? 'u' : values.baseUnit, tracksExpiry }, form);
        if (!payload) return;
        const created = await create.mutateAsync(payload);
        toast.success('Material registrado', { description: `${name} · ${created.code}` });
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (error) {
      setGeneralError(materialsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={Package}
      title={material ? 'Editar material' : 'Registrar material'}
      description="Lo que el laboratorio gasta o presta, aparte de los reactivos. El código se genera solo."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={material ? 'Guardar cambios' : 'Registrar material'}
      pending={create.isPending || update.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty}
      required
      focusFirst
    >
      <Field label="Nombre" required error={errors.name?.message}>
        <Input maxLength={200} autoComplete="off" className="h-11 sm:h-10" {...form.register('name')} />
      </Field>
      <Field label="Clase" required hint={classHints[chosenClass]} error={errors.class?.message}>
        <Controller
          control={form.control}
          name="class"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={material !== undefined}
              placeholder="Elige la clase"
              options={materialClass.options.map((value) => ({ value, label: classLabels[value] }))}
            />
          )}
        />
      </Field>
      {countedInUnits ? null : (
        <Field
          label="Unidad"
          required
          hint={unitEditable ? 'En qué se cuenta o se mide. No cambia después del primer movimiento.' : 'No cambia: el material ya tiene movimientos.'}
          error={errors.baseUnit?.message}
        >
          <Controller
            control={form.control}
            name="baseUnit"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!unitEditable} placeholder="Elige la unidad" options={unitOptions} />
            )}
          />
        </Field>
      )}
      {countedInUnits ? null : (
        <Field
          label="Vencimiento"
          required
          hint="Si vence, cada ingreso pide la fecha y el lote, y el Inventario avisa lo que está por vencer. Los lotes ya ingresados conservan su fecha."
        >
          <Controller
            control={form.control}
            name="expires"
            render={({ field }) => <Segmented label="Vencimiento" value={field.value} onValueChange={field.onChange} options={expiryOptions} />}
          />
        </Field>
      )}
    </FormSheet>
  );
}
