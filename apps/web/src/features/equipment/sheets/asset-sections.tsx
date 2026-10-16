import { createAssetTypeRequest } from '@platlab/contracts';
import { Button, Field } from '@platlab/ui';
import { Microscope, Receipt } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Combobox, type ComboOption } from '../../../app/combobox';
import { fieldGrid, fieldLabel, FilledInput } from '../../../app/filled';
import { fold } from '../../../app/fold';
import { Section } from '../../../app/form-section';
import { equipmentErrorMessage, useCreateAssetType } from '../commands';
import { useAssetTypes } from '../queries';
import { powerSupplies, type AssetForm } from './asset-form';

export type AssetFormApi = UseFormReturn<AssetForm>;

const powerOptions: ComboOption[] = powerSupplies.map((entry) => ({ id: entry, label: entry }));

/**
 * «Tipo» (obligatorio): se elige de la lista de tipos activos; quien administra el catálogo agrega uno nuevo
 * con el «+» del campo, que lo crea en el servidor y lo deja elegido. Lo escrito sin elegir se resuelve al
 * enviar si coincide con un tipo (`resolveType`).
 */
function TypeField({ form, workspaceId, canManage }: { form: AssetFormApi; workspaceId: string; canManage: boolean }) {
  const types = useAssetTypes(workspaceId);
  const createType = useCreateAssetType(workspaceId);
  const options = useMemo<ComboOption[]>(() => (types.data?.items ?? []).map((entry) => ({ id: entry.id, label: entry.name })), [types.data]);

  const choose = (id: string, name: string) => {
    form.setValue('typeId', id);
    form.setValue('typeName', name);
    form.clearErrors('typeId');
  };
  const add = async (name: string) => {
    if (!createAssetTypeRequest.safeParse({ name }).success) {
      form.setError('typeId', { message: 'El nombre del tipo es demasiado largo.' });
      return;
    }
    try {
      const created = await createType.mutateAsync({ name });
      choose(created.id, created.name);
    } catch (error) {
      form.setError('typeId', { message: equipmentErrorMessage(error) });
    }
  };

  return (
    <Field label="Tipo" required labelClassName={fieldLabel} className="sm:col-span-2" error={form.formState.errors.typeId?.message}>
      <Combobox
        value={form.watch('typeName')}
        onChange={(text) => {
          form.setValue('typeName', text);
          form.setValue('typeId', '');
          form.clearErrors('typeId');
        }}
        options={options}
        onPick={(option) => choose(option.id, option.label)}
        canCreate={canManage}
        inlineCreate
        openOnFocus
        readOnly={createType.isPending}
        onCreate={(name) => void add(name)}
        placeholder="Elige uno o agrega uno nuevo"
      />
      {types.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 text-[13px] font-medium text-danger">
          No se pudieron cargar los tipos.
          <Button size="sm" className="h-8" onClick={() => void types.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </Field>
  );
}

/** El tipo que corresponde a lo escrito en «Tipo» cuando no se eligió de la lista (sin tildes ni mayúsculas). */
export const typeIdOf = (types: ReadonlyArray<{ id: string; name: string }>, typed: string) =>
  types.find((entry) => fold(entry.name) === fold(typed.trim()))?.id ?? '';

/**
 * «Identificación»: la foto, el tipo, el nombre y los datos de la placa. El código es opcional al registrar (el servidor lo
 * propone a partir del nombre); al editar es obligatorio, porque un equipo no queda sin código.
 */
export function IdentitySection({
  form,
  workspaceId,
  canManage,
  creating,
  tall = false,
  photo,
}: {
  form: AssetFormApi;
  workspaceId: string;
  canManage: boolean;
  creating: boolean;
  /** Ocupa el alto de las dos secciones de la derecha (el alta). */
  tall?: boolean;
  /** «Foto» (opcional), al inicio de la sección. */
  photo?: ReactNode;
}) {
  const errors = form.formState.errors;
  return (
    <Section icon={Microscope} title="Identificación" className={tall ? 'lg:row-span-2' : ''}>
      {photo}
      <div className={fieldGrid}>
        <TypeField form={form} workspaceId={workspaceId} canManage={canManage} />
        <Field label="Nombre" required labelClassName={fieldLabel} className="sm:col-span-2" error={errors.name?.message}>
          <FilledInput autoComplete="off" placeholder="Microscopio binocular" {...form.register('name', { onChange: () => form.clearErrors('name') })} />
        </Field>
        <Field
          label="Código"
          required={!creating}
          labelClassName={fieldLabel}
          hint={creating ? 'Se genera si lo dejas vacío' : undefined}
          error={errors.code?.message}
        >
          <FilledInput
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            {...form.register('code', { onChange: () => form.clearErrors('code') })}
          />
        </Field>
        <Field label="Marca" labelClassName={fieldLabel}>
          <FilledInput autoComplete="off" {...form.register('brand')} />
        </Field>
        <Field label="Modelo" labelClassName={fieldLabel}>
          <FilledInput autoComplete="off" {...form.register('model')} />
        </Field>
        <Field label="Serie" labelClassName={fieldLabel}>
          <FilledInput autoComplete="off" spellCheck={false} {...form.register('serialNumber')} />
        </Field>
        <Field label="Alimentación" labelClassName={fieldLabel} className="sm:col-span-2">
          <Controller
            control={form.control}
            name="powerSupply"
            render={({ field }) => (
              <Combobox
                value={field.value}
                onChange={field.onChange}
                options={powerOptions}
                onPick={(option) => field.onChange(option.label)}
                openOnFocus
                placeholder="110 V, 220 V, Batería…"
              />
            )}
          />
        </Field>
      </div>
    </Section>
  );
}

const purchaseFields = ['supplier', 'acquiredOn', 'warrantyUntil', 'usefulLifeYears', 'replacementValue'] as const;

/**
 * «Compra y garantía»: desplegable plegado y opcional, como «Control por peso». Empieza abierto al editar un
 * equipo que ya tiene alguno de estos datos, y se abre solo cuando llega un error suyo (garantía anterior a la
 * compra, importe mal escrito); plegarlo después no borra lo escrito.
 */
export function PurchaseSection({ form, startOpen }: { form: AssetFormApi; startOpen: boolean }) {
  const errors = form.formState.errors;
  const [open, setOpen] = useState(startOpen);
  const wanted = purchaseFields.some((key) => Boolean(errors[key]));
  const [seen, setSeen] = useState(false);
  if (wanted !== seen) {
    setSeen(wanted);
    if (wanted) setOpen(true);
  }
  return (
    <Section icon={Receipt} title="Compra y garantía" badge="Opcional" className="lg:col-span-2" fold={{ open, onToggle: () => setOpen(!open) }}>
      <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Proveedor" labelClassName={fieldLabel} className="sm:col-span-2">
          <FilledInput autoComplete="off" {...form.register('supplier')} />
        </Field>
        <Field label="Fecha de compra" labelClassName={fieldLabel}>
          <FilledInput type="date" {...form.register('acquiredOn', { onChange: () => form.clearErrors('warrantyUntil') })} />
        </Field>
        <Field label="Garantía hasta" labelClassName={fieldLabel} error={errors.warrantyUntil?.message}>
          <FilledInput type="date" {...form.register('warrantyUntil', { onChange: () => form.clearErrors('warrantyUntil') })} />
        </Field>
        <Field label="Vida útil (años)" labelClassName={fieldLabel} hint="De 1 a 100" error={errors.usefulLifeYears?.message}>
          <FilledInput
            inputMode="numeric"
            autoComplete="off"
            className="tabular-nums"
            {...form.register('usefulLifeYears', { onChange: () => form.clearErrors('usefulLifeYears') })}
          />
        </Field>
        <Field label="Valor de reposición (USD)" labelClassName={fieldLabel} hint="Por ejemplo 9.800,50" error={errors.replacementValue?.message} className="lg:col-span-2">
          <FilledInput
            inputMode="decimal"
            autoComplete="off"
            className="tabular-nums"
            {...form.register('replacementValue', { onChange: () => form.clearErrors('replacementValue') })}
          />
        </Field>
      </div>
    </Section>
  );
}
