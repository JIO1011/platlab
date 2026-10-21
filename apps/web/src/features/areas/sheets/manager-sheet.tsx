import { Button, Field, toast } from '@platlab/ui';
import { UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Combobox, type ComboOption } from '../../../app/combobox';
import { fieldLabel } from '../../../app/filled';
import { FormSheet } from '../../../app/form-sheet';
import { areasErrorMessage, useAssignManager } from '../commands';
import type { WorkspaceArea } from '../plan-model';
import { useAreaManagers } from '../queries';

type Person = { id: string; name: string };

/**
 * «Encargado del área» (ADR 0024; antes en Equipos): quien responde por lo que hay en el área. Se elige entre los
 * miembros activos del espacio, o se quita. Nada cambia en pantalla hasta que el servidor confirma.
 */
export function ManagerSheet({ workspaceId, area, onClose }: { workspaceId: string; area: WorkspaceArea; onClose: () => void }) {
  const command = useAssignManager(workspaceId, area.id);
  const managers = useAreaManagers(workspaceId, true);
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<Person | null>(null);
  const [removing, setRemoving] = useState(false);
  const [pickError, setPickError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const options = useMemo<ComboOption[]>(
    () =>
      (managers.data?.items ?? [])
        .filter((person) => person.id !== area.manager?.id)
        .map((person) => ({ id: person.id, label: person.name, leading: <UserRound className="size-4 shrink-0 text-ink-muted" aria-hidden /> })),
    [managers.data, area.manager],
  );

  const save = async (person: Person | null) => {
    setGeneralError(null);
    try {
      await command.mutateAsync({ managerId: person?.id ?? null });
      toast.success(person ? 'Encargado asignado' : 'Encargado quitado', {
        description: person ? `${person.name} es el encargado de ${area.name}.` : `${area.name} queda sin encargado.`,
      });
      onClose();
    } catch (error) {
      setGeneralError(areasErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={UserRound}
      title="Encargado del área"
      description="Quien responde por lo que hay en el área. Al registrar un equipo aquí, se propone como su responsable."
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      submitLabel="Asignar encargado"
      focusFirst
      pending={command.isPending && !removing}
      generalError={generalError}
      onSubmit={() => {
        if (chosen) void save(chosen);
        else setPickError('Elige a la persona de la lista.');
      }}
    >
      <div className="grid gap-1 rounded-control bg-surface-sunken px-3 py-2.5 text-sm">
        <p className="break-words font-semibold text-ink">{area.name}</p>
        <p className="text-ink-muted">
          Encargado: <span className="text-ink">{area.manager?.name ?? 'Sin encargado'}</span>
        </p>
      </div>
      <Field
        label={area.manager ? 'Nuevo encargado' : 'Encargado'}
        labelClassName={fieldLabel}
        hint="Escribe un nombre y elígelo de la lista."
        error={managers.isError ? 'No se pudo cargar la lista de personas. Vuelve a abrir la hoja.' : pickError}
      >
        <Combobox
          value={text}
          onChange={(next) => {
            setText(next);
            setChosen(null);
            setPickError(undefined);
          }}
          options={options}
          onPick={(option) => {
            setChosen({ id: option.id, name: option.label });
            setPickError(undefined);
            setText(option.label);
          }}
          openOnFocus
          placeholder={managers.isPending ? 'Cargando…' : 'Buscar persona'}
        />
      </Field>
      {area.manager ? (
        <div className="border-t border-line pt-4">
          <Button
            loading={removing && command.isPending}
            disabled={command.isPending}
            onClick={() => {
              setRemoving(true);
              void save(null).finally(() => setRemoving(false));
            }}
          >
            Quitar encargado
          </Button>
        </div>
      ) : null}
    </FormSheet>
  );
}
