import { createProviderRequest, updateProviderRequest, type Provider } from '@platlab/contracts';
import { Field, Input, toast } from '@platlab/ui';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { maintenanceErrorMessage, useCreateProvider, useUpdateProvider } from './commands';

/**
 * «Nuevo proveedor» y «Editar proveedor» (Administrador): el nombre y un contacto en texto libre. No hay borrado: un
 * proveedor se archiva y sus registros lo conservan.
 */
export function ProviderSheet({
  workspaceId,
  open,
  onOpenChange,
  provider,
  onCreated,
}: SheetBaseProps & {
  provider?: Provider | undefined;
  /** Se llama con el proveedor recién creado (no al editar): la hoja de registro lo deja elegido. */
  onCreated?: ((created: Provider) => void) | undefined;
}) {
  const create = useCreateProvider(workspaceId);
  const update = useUpdateProvider(workspaceId, provider?.id ?? '');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { name: provider?.name ?? '', contact: provider?.contact ?? '' } });
  const errors = form.formState.errors;

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    const name = values.name.trim();
    const contact = values.contact.trim();
    try {
      if (provider) {
        const changes = {
          ...(name !== provider.name ? { name } : {}),
          ...(contact !== (provider.contact ?? '') ? { contact: contact === '' ? null : contact } : {}),
        };
        if (Object.keys(changes).length === 0) {
          setGeneralError('No cambiaste nada.');
          return;
        }
        const payload = validate(updateProviderRequest, { ...changes, expectedVersion: provider.version }, form);
        if (!payload) return;
        await update.mutateAsync(payload);
        toast.success('Proveedor actualizado', { description: name });
      } else {
        const payload = validate(createProviderRequest, { name, contact: contact === '' ? null : contact }, form);
        if (!payload) return;
        const created = await create.mutateAsync(payload);
        toast.success('Proveedor creado', { description: name });
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (error) {
      setGeneralError(maintenanceErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={Building2}
      title={provider ? 'Editar proveedor' : 'Nuevo proveedor'}
      description="La empresa o la persona que hace mantenimientos fuera del laboratorio. Se elige al registrar un trabajo."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={provider ? 'Guardar cambios' : 'Crear proveedor'}
      pending={create.isPending || update.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty}
    >
      <Field label="Nombre" required error={errors.name?.message}>
        <Input maxLength={120} autoComplete="off" className="h-11 sm:h-10" {...form.register('name')} />
      </Field>
      <Field label="Contacto" optional hint="Teléfono, correo o la persona con quien hablar." error={errors.contact?.message}>
        <Input maxLength={300} autoComplete="off" className="h-11 sm:h-10" {...form.register('contact')} />
      </Field>
    </FormSheet>
  );
}
