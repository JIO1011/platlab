import { createSpaceRequest, updateSpaceRequest, type Space, type WeeklyHours } from '@platlab/contracts';
import { Field, Input, toast } from '@platlab/ui';
import { DoorOpen } from 'lucide-react';
import { useState } from 'react';
import { isApiError } from '../../app/api';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { labsErrorMessage, useCreateSpace, useUpdateSpace, useVersionConflict } from './commands';
import { HoursEditor } from './hours-editor';
import { suggestAbbreviation } from './space-abbreviation';
import { capacityOf, closedWeek, spaceIssues, type SpaceIssues } from './space-form';

/**
 * «Habilitar para prácticas» y «Editar espacio» (Administrador), desde el panel de su área en «Áreas»: la sigla que
 * identifica el área en el código de cada práctica, el aforo y el horario semanal, que es siempre el mismo. Al habilitar,
 * la sigla se sugiere desde el nombre del área; un espacio archivado se reactiva con sus datos. Al editar, solo viaja lo
 * que cambió, con la versión que se vio.
 */
export function SpaceSheet({
  workspaceId,
  open,
  onOpenChange,
  areaId,
  areaName,
  space,
  takenAbbreviations,
}: SheetBaseProps & {
  areaId: string;
  areaName: string;
  /** Las siglas de los demás espacios: la sugerida no las repite. */
  takenAbbreviations: string[];
  /** El espacio que se edita; si está archivado, sus datos prellenan al habilitarlo de nuevo. */
  space?: Space | undefined;
}) {
  const editing = space !== undefined && space.archivedAt === null;
  const create = useCreateSpace(workspaceId);
  const update = useUpdateSpace(workspaceId, areaId);
  const conflict = useVersionConflict(workspaceId);
  const [initialAbbreviation] = useState(() => space?.abbreviation ?? suggestAbbreviation(areaName, takenAbbreviations));
  const [abbreviation, setAbbreviation] = useState(initialAbbreviation);
  const [capacity, setCapacity] = useState(space ? String(space.capacity) : '');
  const [hours, setHours] = useState<WeeklyHours>(space?.weeklyHours ?? closedWeek);
  const [issues, setIssues] = useState<SpaceIssues>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const people = capacityOf(capacity);
  const abbreviationChanged = abbreviation.trim().toUpperCase() !== initialAbbreviation;
  const capacityChanged = space ? people !== space.capacity : capacity !== '';
  const hoursChanged = JSON.stringify(hours) !== JSON.stringify(space?.weeklyHours ?? closedWeek);

  const submit = async () => {
    setGeneralError(null);
    setIssues({});
    if (people === undefined) {
      setIssues({ capacity: 'Escribe cuántas personas caben a la vez (1 o más).' });
      return;
    }
    const changes = {
      ...(abbreviationChanged ? { abbreviation } : {}),
      ...(capacityChanged ? { capacity: people } : {}), ...(hoursChanged ? { weeklyHours: hours } : {}),
    };
    if (editing && Object.keys(changes).length === 0) {
      setGeneralError('No cambiaste nada.');
      return;
    }
    const parsed =
      editing && space
        ? updateSpaceRequest.safeParse({ ...changes, expectedVersion: space.version })
        : createSpaceRequest.safeParse({ areaId, abbreviation, capacity: people, weeklyHours: hours });
    if (!parsed.success) {
      setIssues(spaceIssues(parsed.error));
      return;
    }
    try {
      if (editing && space) {
        await update.mutateAsync(parsed.data);
        toast.success('Espacio actualizado', { description: areaName });
      } else {
        await create.mutateAsync(parsed.data);
        toast.success('Espacio habilitado', { description: areaName });
      }
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'CODE_TAKEN')) {
        setIssues({ abbreviation: 'Otro espacio ya usa esa sigla. Elige otra.' });
        return;
      }
      if (isApiError(error, 'VERSION_CONFLICT')) {
        void conflict('este espacio');
        onOpenChange(false);
        return;
      }
      setGeneralError(labsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={DoorOpen}
      title={editing ? 'Editar espacio' : 'Habilitar para prácticas'}
      description={editing ? `Ajusta la sigla, el aforo y el horario de ${areaName}.` : `${areaName} se podrá agendar, con su sigla, su aforo y su horario semanal.`}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={editing ? 'Guardar cambios' : 'Habilitar'}
      pending={create.isPending || update.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={abbreviationChanged || capacityChanged || hoursChanged}
      required
      fullscreenMobile
      sections
      focusFirst
      pendingText="Guardando el espacio…"
    >
      <section aria-label="Sigla y aforo" className="grid gap-4">
        <Field
          label="Sigla"
          required
          hint="De 2 a 5 letras o números. Identifica el área en el código de cada práctica, como ANT en P1-S12-ANT03."
          error={issues.abbreviation}
        >
          <Input
            maxLength={5}
            autoComplete="off"
            className="h-11 font-mono uppercase tabular-nums sm:h-10"
            value={abbreviation}
            onChange={(event) => {
              setAbbreviation(event.target.value);
              setIssues((current) => ({ ...current, abbreviation: undefined }));
            }}
          />
        </Field>
        <Field label="Aforo" required hint="Las personas que caben a la vez en el área." error={issues.capacity}>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            className="h-11 tabular-nums sm:h-10"
            value={capacity}
            onChange={(event) => {
              setCapacity(event.target.value);
              setIssues((current) => ({ ...current, capacity: undefined }));
            }}
          />
        </Field>
      </section>
      <section aria-label="Horario">
        <HoursEditor
          value={hours}
          error={issues.hours}
          onChange={(next) => {
            setHours(next);
            setIssues((current) => ({ ...current, hours: undefined }));
          }}
        />
      </section>
    </FormSheet>
  );
}
