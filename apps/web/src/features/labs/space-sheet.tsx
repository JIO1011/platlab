import { createSpaceRequest, updateSpaceRequest, type Space, type WeeklyHours } from '@platlab/contracts';
import { Field, Input, Select, Skeleton, toast, type SelectOption } from '@platlab/ui';
import { DoorOpen } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { isApiError } from '../../app/api';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { useAreasOverview } from '../../app/queries';
import { labsErrorMessage, useCreateSpace, useUpdateSpace, useVersionConflict } from './commands';
import { HoursEditor } from './hours-editor';
import { useSpaces } from './queries';
import { capacityOf, closedWeek, spaceIssues, type SpaceIssues } from './space-form';

/**
 * «Habilitar área» y «Editar espacio» (Administrador): el área del Núcleo que se agenda, su aforo y su horario semanal.
 * Las áreas se crean en «Áreas»; aquí solo se elige una. Un espacio archivado se reactiva con estos datos. Al editar, el
 * área no cambia y solo viaja lo que cambió, con la versión que se vio.
 */
export function SpaceSheet({
  workspaceId,
  open,
  onOpenChange,
  space,
}: SheetBaseProps & {
  /** El espacio que se edita; si está archivado, sus datos prellenan al habilitarlo de nuevo. */
  space?: Space | undefined;
}) {
  const editing = space !== undefined && space.archivedAt === null;
  const create = useCreateSpace(workspaceId);
  const update = useUpdateSpace(workspaceId, space?.areaId ?? '');
  const conflict = useVersionConflict(workspaceId);
  const areas = useAreasOverview(workspaceId, !editing);
  const spaces = useSpaces(workspaceId);
  const [areaId, setAreaId] = useState(space?.areaId ?? '');
  const [capacity, setCapacity] = useState(space ? String(space.capacity) : '');
  const [hours, setHours] = useState<WeeklyHours>(space?.weeklyHours ?? closedWeek);
  const [issues, setIssues] = useState<SpaceIssues>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const people = capacityOf(capacity);
  const capacityChanged = space ? people !== space.capacity : capacity !== '';
  const hoursChanged = JSON.stringify(hours) !== JSON.stringify(space?.weeklyHours ?? closedWeek);

  // Las áreas que aún no son espacio; las de un espacio archivado se ofrecen con su estado.
  const taken = new Set(spaces.data?.items.filter((entry) => entry.archivedAt === null).map((entry) => entry.areaId));
  const archived = new Set(spaces.data?.items.filter((entry) => entry.archivedAt !== null).map((entry) => entry.areaId));
  const options: SelectOption[] = (areas.data?.areas ?? [])
    .filter((area) => !taken.has(area.id))
    .map((area) => ({
      value: area.id,
      label: area.name,
      ...(area.group ? { group: area.group.name } : {}),
      ...(archived.has(area.id) ? { detail: 'Archivado' } : {}),
    }));

  const submit = async () => {
    setGeneralError(null);
    setIssues({});
    if (people === undefined) {
      setIssues({ capacity: 'Escribe cuántas personas caben a la vez (1 o más).' });
      return;
    }
    const changes = { ...(capacityChanged ? { capacity: people } : {}), ...(hoursChanged ? { weeklyHours: hours } : {}) };
    if (editing && Object.keys(changes).length === 0) {
      setGeneralError('No cambiaste nada.');
      return;
    }
    const parsed =
      editing && space
        ? updateSpaceRequest.safeParse({ ...changes, expectedVersion: space.version })
        : createSpaceRequest.safeParse({ areaId, capacity: people, weeklyHours: hours });
    if (!parsed.success) {
      setIssues(spaceIssues(parsed.error));
      return;
    }
    try {
      if (editing && space) {
        await update.mutateAsync(parsed.data);
        toast.success('Espacio actualizado', { description: space.areaName });
      } else {
        await create.mutateAsync(parsed.data);
        toast.success('Espacio habilitado', { description: options.find((option) => option.value === areaId)?.label ?? space?.areaName ?? '' });
      }
      onOpenChange(false);
    } catch (error) {
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
      title={editing ? 'Editar espacio' : 'Habilitar área'}
      description={editing ? 'El área no cambia; ajusta su aforo y su horario.' : 'El área que se podrá agendar, con su aforo y su horario semanal.'}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={editing ? 'Guardar cambios' : 'Habilitar área'}
      pending={create.isPending || update.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={areaId !== (space?.areaId ?? '') || capacityChanged || hoursChanged}
      required
      fullscreenMobile
      sections
      focusFirst
      pendingText="Guardando el espacio…"
    >
      <section aria-label="Área y aforo" className="grid gap-4">
        {editing && space ? (
          <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
            <span className="font-medium text-ink">{space.areaName}</span>
            {space.groupName ? ` · ${space.groupName}` : ''}
          </p>
        ) : (
          <Field
            label="Área"
            required
            error={issues.areaId}
            hint={
              areas.isSuccess && options.length === 0 ? (
                <>
                  No hay áreas por habilitar. Créala en <Link to={`/e/${workspaceId}/areas`} className="font-medium text-action underline">Áreas</Link>.
                </>
              ) : (
                <>
                  Si no está en la lista, créala en <Link to={`/e/${workspaceId}/areas`} className="font-medium text-action underline">Áreas</Link>.
                </>
              )
            }
          >
            {areas.isPending ? (
              <Skeleton className="h-11" />
            ) : areas.isError ? (
              <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
                No se pudieron cargar las áreas. Cierra e inténtalo de nuevo.
              </p>
            ) : (
              <Select
                value={areaId}
                onValueChange={(value) => {
                  setAreaId(value);
                  setIssues((current) => ({ ...current, areaId: undefined }));
                }}
                placeholder="Elige un área"
                triggerClassName="h-11 sm:h-10"
                options={options}
              />
            )}
          </Field>
        )}
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
