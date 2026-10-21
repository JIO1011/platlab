import { Field, toast } from '@platlab/ui';
import type { LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { isApiError } from '../../../app/api';
import { fieldLabel, FilledInput } from '../../../app/filled';
import { FormSheet } from '../../../app/form-sheet';
import { areasErrorMessage } from '../commands';

/**
 * Hoja de un solo nombre: crear un área, un estante o un departamento, o renombrarlos. Un nombre repetido es
 * un error del campo, con el mensaje del servidor; lo demás, un aviso general en la hoja. `save` registra el
 * cambio y falla con el error del servidor; la hoja no se cierra hasta que lo confirma. Los campos extra
 * (el edificio de un área nueva) van en `children`.
 */
export function NameSheet({
  icon,
  title,
  description,
  label,
  placeholder,
  initialName = '',
  maxLength,
  submitLabel,
  pending,
  save,
  saved,
  onClose,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  label: string;
  placeholder?: string;
  initialName?: string;
  maxLength: number;
  submitLabel: string;
  pending: boolean;
  save: (name: string) => Promise<unknown>;
  /** El aviso que confirma el cambio, con el nombre ya guardado. */
  saved: (name: string) => string;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [name, setName] = useState(initialName);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const submit = async () => {
    const clean = name.trim();
    setGeneralError(null);
    if (!clean) {
      setFieldError('Escribe un nombre.');
      return;
    }
    if (clean === initialName) {
      onClose();
      return;
    }
    try {
      await save(clean);
      toast.success(saved(clean));
      onClose();
    } catch (error) {
      if (isApiError(error, 'NAME_TAKEN')) setFieldError(error.message);
      else setGeneralError(areasErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={icon}
      title={title}
      description={description}
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      submitLabel={submitLabel}
      pending={pending}
      generalError={generalError}
      dirty={name.trim() !== initialName}
      focusFirst
      onSubmit={() => void submit()}
    >
      <Field label={label} labelClassName={fieldLabel} required error={fieldError}>
        <FilledInput
          value={name}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value);
            setFieldError(undefined);
          }}
        />
      </Field>
      {children}
    </FormSheet>
  );
}
