import { inviteMemberRequest, type MemberRole } from '@platlab/contracts';
import { Field, OptionRow, toast } from '@platlab/ui';
import { UserMinus, UserRoundCog, UserRoundPlus } from 'lucide-react';
import { useState } from 'react';
import { isApiError } from '../../app/api';
import { fieldErrors } from '../../app/commands';
import { fieldLabel, FilledInput } from '../../app/filled';
import { FormSheet } from '../../app/form-sheet';
import { useChangeRole, useInviteMember, useRevoke, usersErrorMessage } from './commands';
import { roleLabel, roles } from '../../app/member-roles';

/** Los cinco roles en una lista de una sola elección, cada uno con lo que puede hacer. */
function RolePicker({ value, onChange, error }: { value: MemberRole | null; onChange: (role: MemberRole) => void; error?: string | undefined }) {
  return (
    <fieldset>
      <legend className={fieldLabel}>
        Rol <span aria-hidden className="text-danger">*</span>
      </legend>
      <div className="mt-1.5 grid gap-0.5">
        {roles.map((role) => (
          <OptionRow key={role.value} type="radio" name="rol" checked={value === role.value} onChange={() => onChange(role.value)}>
            <span className="py-1">
              <span className="block font-semibold text-ink">{role.label}</span>
              <span className="block text-[13px] text-ink-muted">{role.description}</span>
            </span>
          </OptionRow>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * «Agregar persona»: nombre, correo y rol a la lista blanca. La persona se une al entrar a PlatLab con ese correo
 * y pulsar «Unirme»; hasta entonces queda pendiente. Un correo repetido es un error de su campo.
 */
export function InviteSheet({
  workspaceId,
  initial,
  onClose,
}: {
  workspaceId: string;
  /** Para volver a agregar a alguien que se quitó. */
  initial?: { name: string; email: string } | undefined;
  onClose: () => void;
}) {
  const command = useInviteMember(workspaceId);
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState<MemberRole | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const submit = async () => {
    setGeneralError(null);
    const parsed = inviteMemberRequest.safeParse({ name, email, role: role ?? undefined });
    if (!parsed.success) {
      const found = fieldErrors(parsed.error);
      setErrors(role ? found : { ...found, role: 'Elige un rol.' });
      return;
    }
    try {
      await command.mutateAsync(parsed.data);
      toast.success(`${parsed.data.name} está en la lista. Se une al entrar con ${parsed.data.email}.`);
      onClose();
    } catch (error) {
      if (isApiError(error, 'EMAIL_TAKEN')) setErrors({ email: error.message });
      else setGeneralError(usersErrorMessage(error));
    }
  };

  const clear = (field: string) =>
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)));

  return (
    <FormSheet
      icon={UserRoundPlus}
      title="Agregar persona"
      description="Queda en la lista blanca. Se une cuando entra a PlatLab con este correo."
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      submitLabel="Agregar a la lista"
      pending={command.isPending}
      generalError={generalError}
      dirty={name.trim() !== '' || email.trim() !== '' || role !== null}
      required
      focusFirst
      onSubmit={() => void submit()}
    >
      <Field label="Nombre" labelClassName={fieldLabel} required error={errors['name']}>
        <FilledInput
          value={name}
          maxLength={200}
          placeholder="Elena Estudiante"
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value);
            clear('name');
          }}
        />
      </Field>
      <Field label="Correo" labelClassName={fieldLabel} required error={errors['email']}>
        <FilledInput
          type="email"
          value={email}
          maxLength={254}
          placeholder="elena@universidad.edu"
          autoComplete="off"
          onChange={(event) => {
            setEmail(event.target.value);
            clear('email');
          }}
        />
      </Field>
      <RolePicker
        value={role}
        error={errors['role']}
        onChange={(next) => {
          setRole(next);
          clear('role');
        }}
      />
    </FormSheet>
  );
}

/** «Cambiar rol»: vale desde su próxima acción; lo que ya está haciendo termina con el rol de antes. */
export function RoleSheet({
  workspaceId,
  member,
  onClose,
}: {
  workspaceId: string;
  member: { membershipId: string; name: string; role: MemberRole | null };
  onClose: () => void;
}) {
  const command = useChangeRole(workspaceId, member.membershipId);
  const [role, setRole] = useState<MemberRole | null>(member.role);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const submit = async () => {
    setGeneralError(null);
    if (!role || role === member.role) {
      onClose();
      return;
    }
    try {
      await command.mutateAsync({ role });
      toast.success(`${member.name} ahora es ${roleLabel(role)}`);
      onClose();
    } catch (error) {
      setGeneralError(usersErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={UserRoundCog}
      title="Cambiar rol"
      description={`${member.name}. El rol nuevo vale desde su próxima acción.`}
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      submitLabel="Cambiar rol"
      pending={command.isPending}
      generalError={generalError}
      dirty={role !== member.role}
      onSubmit={() => void submit()}
    >
      <RolePicker value={role} onChange={setRole} />
    </FormSheet>
  );
}

/**
 * Quitar el acceso de un miembro o sacar de la lista a quien aún no se unió. No se deshace desde aquí, pero nada se
 * borra: sus registros conservan su nombre y se puede volver a agregar.
 */
export function RevokeSheet({
  workspaceId,
  target,
  onClose,
}: {
  workspaceId: string;
  target: { kind: 'member' | 'invitation'; id: string; name: string; email: string | null };
  onClose: () => void;
}) {
  const command = useRevoke(workspaceId, target.kind, target.id);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const revoke = async () => {
    setGeneralError(null);
    try {
      await command.mutateAsync(undefined);
      toast.success(target.kind === 'member' ? `${target.name} ya no entra al espacio` : `${target.name} salió de la lista`);
      onClose();
    } catch (error) {
      setGeneralError(usersErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={UserMinus}
      title={target.kind === 'member' ? 'Quitar acceso' : 'Quitar de la lista'}
      description={
        target.kind === 'member'
          ? 'Deja de entrar al espacio desde su próxima acción. Sus registros conservan su nombre y puedes volver a agregarla.'
          : 'Ya no podrá unirse con este correo. Puedes volver a agregarla cuando quieras.'
      }
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      submitLabel={target.kind === 'member' ? 'Quitar acceso' : 'Quitar de la lista'}
      destructive
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void revoke()}
    >
      <p className="break-words rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink">
        <span className="block font-semibold">{target.name}</span>
        {target.email ? <span className="block text-ink-muted">{target.email}</span> : null}
      </p>
    </FormSheet>
  );
}
