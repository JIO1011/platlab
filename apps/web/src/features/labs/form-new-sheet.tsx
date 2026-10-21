import { createFormRequest, type FormSummary } from '@platlab/contracts';
import { Field, Input, Select, toast, type SelectOption } from '@platlab/ui';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { isApiError } from '../../app/api';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { labsErrorMessage, useCreateForm } from './commands';

/** El valor de «Partir de» que significa la plantilla estándar: el servidor la usa cuando no llega `from`. */
const STANDARD = 'standard';

/**
 * «Nuevo formato» (Administrador): su nombre y de dónde parte, la plantilla estándar o la última revisión de un formato
 * activo. Al crearse, abre su hoja para editarla. Un nombre repetido se dice en el campo.
 */
export function NewFormSheet({ workspaceId, open, onOpenChange, forms }: SheetBaseProps & { forms: readonly FormSummary[] }) {
  const create = useCreateForm(workspaceId);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [from, setFrom] = useState(STANDARD);
  const [nameError, setNameError] = useState<string | undefined>();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const options: SelectOption[] = [
    { value: STANDARD, label: 'Plantilla estándar', detail: 'La hoja A4' },
    ...forms.filter((form) => form.archivedAt === null).map((form) => ({ value: form.id, label: form.name, detail: `Revisión ${form.revision}` })),
  ];

  const submit = async () => {
    setNameError(undefined);
    setGeneralError(null);
    const parsed = createFormRequest.safeParse({ name: name.trim(), ...(from === STANDARD ? {} : { from }) });
    if (!parsed.success) {
      setNameError('Escribe el nombre del formato (hasta 80 caracteres).');
      return;
    }
    try {
      const created = await create.mutateAsync(parsed.data);
      toast.success('Formato creado', { description: created.name });
      onOpenChange(false);
      void navigate(`/e/${workspaceId}/laboratorios/formatos/${created.id}`);
    } catch (error) {
      if (isApiError(error, 'NAME_TAKEN')) setNameError(error.message);
      else setGeneralError(labsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={ClipboardList}
      title="Nuevo formato"
      description="Un formato para otro tipo de solicitud. Parte de una hoja ya hecha y la ajustas después."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Crear formato"
      pending={create.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={name !== '' || from !== STANDARD}
      required
      focusFirst
      pendingText="Creando el formato…"
    >
      <Field label="Nombre" required error={nameError} hint="Por ejemplo, «Práctica académica» o «Servicio externo».">
        <Input
          className="h-11 sm:h-10"
          value={name}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value);
            setNameError(undefined);
          }}
        />
      </Field>
      <Field label="Partir de" hint="Un formato nuevo no cambia el que copia.">
        <Select value={from} onValueChange={setFrom} placeholder="Elige de dónde parte" triggerClassName="h-11 sm:h-10" options={options} />
      </Field>
    </FormSheet>
  );
}
