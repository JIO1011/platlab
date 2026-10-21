import { location } from '@platlab/contracts';
import { Field, Select } from '@platlab/ui';
import { MapPin } from 'lucide-react';
import { useModuleCommand } from '../../../app/commands';
import { fieldLabel, filled } from '../../../app/filled';
import { Section } from '../../../app/form-section';
import { LocationPicker } from '../../../app/location-picker';
import type { Place } from '../../../app/places';
import { useDepartments } from '../../../app/queries';
import { commandErrorMessage } from '../commands';
import { useReagentsKey } from '../queries';
import type { Errors } from './model';

const NONE = '__none__';

/**
 * «Dónde se guarda»: el departamento dueño (ADR 0024: se elige de la lista del Núcleo y se administra en
 * Áreas) y la ubicación por niveles. Quien administra el catálogo crea ubicaciones en el Núcleo, al
 * momento; si no se pudo, el motivo queda en `onServerErrors` y se borra al cambiar los datos.
 */
export function StorageSection({
  workspaceId,
  open,
  departmentId,
  onDepartment,
  places,
  recentIds,
  canCreate,
  error,
  onPlace,
  onServerErrors,
}: {
  workspaceId: string;
  open: boolean;
  departmentId: string;
  onDepartment: (departmentId: string) => void;
  places: Place[];
  recentIds: string[];
  /** Crear ubicaciones: `reagents.catalog.manage`. */
  canCreate: boolean;
  error: string | undefined;
  onPlace: (placeId: string) => void;
  onServerErrors: (errors: Errors) => void;
}) {
  const departments = useDepartments(workspaceId, open);
  const options = departments.data?.items ?? [];
  const createLocation = useModuleCommand(workspaceId, '/locations', location, useReagentsKey(workspaceId));

  const createPlace = async (placeName: string, parentId: string | null): Promise<Place | null> => {
    try {
      const created = await createLocation.mutateAsync({ name: placeName, parentId });
      onServerErrors({});
      return { id: created.id, name: created.name, parentId: created.parentId };
    } catch (failure) {
      onServerErrors({ placeId: commandErrorMessage(failure) });
      return null;
    }
  };

  return (
    <Section icon={MapPin} title="Dónde se guarda">
      <div className="grid gap-4">
        <Field label="Departamento" labelClassName={fieldLabel}>
          <Select
            value={departmentId || undefined}
            onValueChange={(next) => onDepartment(next === NONE ? '' : next)}
            options={[{ value: NONE, label: 'Sin departamento' }, ...options.map((option) => ({ value: option.id, label: option.name }))]}
            placeholder={departments.isPending ? 'Cargando…' : 'Elige una opción'}
            triggerClassName={filled}
          />
        </Field>
        <LocationPicker places={places} recentIds={recentIds} onChange={onPlace} canCreate={canCreate} onCreate={createPlace} error={error} />
      </div>
    </Section>
  );
}
