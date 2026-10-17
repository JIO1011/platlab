import type { Area } from '@platlab/contracts';
import { Button, Field, toast } from '@platlab/ui';
import { UserRound } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Combobox, type ComboOption } from '../../../app/combobox';
import { fieldLabel } from '../../../app/filled';
import { FormSheet, type SheetBaseProps } from '../../../app/form-sheet';
import { equipmentErrorMessage, useAssignAreaManager } from '../commands';
import { useEquipment } from '../context';
import { useResponsibles } from '../queries';

/**
 * «Encargado del área» (ADR 0019, E-01c): quien responde por los equipos del área. Se elige entre los miembros
 * activos del espacio, o se quita. El alta de un equipo en el área lo propone como responsable. Nada cambia en
 * pantalla hasta que el servidor confirma.
 */
function AreaManagerSheet({ workspaceId, open, onOpenChange, area }: SheetBaseProps & { area: Area }) {
  const command = useAssignAreaManager(workspaceId, area.id);
  const responsibles = useResponsibles(workspaceId, open);
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const options = useMemo<ComboOption[]>(
    () =>
      (responsibles.data?.items ?? [])
        .filter((person) => person.id !== area.manager?.id)
        .map((person) => ({ id: person.id, label: person.name, leading: <UserRound className="size-4 shrink-0 text-ink-muted" aria-hidden /> })),
    [responsibles.data, area.manager],
  );

  const save = async (person: { id: string; name: string } | null) => {
    setGeneralError(null);
    try {
      await command.mutateAsync({ managerId: person?.id ?? null });
      toast.success(person ? 'Encargado asignado' : 'Encargado quitado', {
        description: person ? `${person.name} es el encargado de ${area.name}.` : `${area.name} queda sin encargado.`,
      });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(equipmentErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={UserRound}
      title="Encargado del área"
      description="Quien responde por los equipos del área. Al registrar un equipo aquí, se propone como su responsable."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Asignar encargado"
      submitDisabled={!chosen}
      pending={command.isPending && !removing}
      generalError={generalError}
      onSubmit={() => void save(chosen)}
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
        error={responsibles.isError ? 'No se pudo cargar la lista de personas. Vuelve a abrir la hoja.' : undefined}
      >
        <Combobox
          value={text}
          onChange={(next) => {
            setText(next);
            setChosen(null);
          }}
          options={options}
          onPick={(option) => {
            setChosen({ id: option.id, name: option.label });
            setText(option.label);
          }}
          openOnFocus
          placeholder={responsibles.isPending ? 'Cargando…' : 'Buscar persona'}
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

/**
 * Lleva la hoja del encargado para quien dibuja el botón (la tarjeta del área y su cabecera): `children`
 * recibe la función que la abre. Cada apertura la monta de nuevo, con su propia clave idempotente. Quien lo
 * usa decide si mostrarlo (`canManage`).
 */
export function AssignAreaManager({ area, children }: { area: Area; children: (open: () => void) => ReactNode }) {
  const { workspaceId } = useEquipment();
  const [sheet, setSheet] = useState<{ id: number; open: boolean } | null>(null);
  return (
    <>
      {children(() => setSheet({ id: Date.now(), open: true }))}
      {sheet ? (
        <AreaManagerSheet
          key={sheet.id}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          area={area}
        />
      ) : null}
    </>
  );
}
