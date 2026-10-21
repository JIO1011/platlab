import { Field, Select } from '@platlab/ui';
import { MapPin } from 'lucide-react';
import { fieldLabel, filled } from '../../../app/filled';
import { Section } from '../../../app/form-section';
import { LocationPicker } from '../../../app/location-picker';
import type { Place } from '../../../app/places';
import { useDepartments } from '../../../app/queries';

const NONE = '__none__';

/**
 * «Dónde se guarda»: el departamento dueño (ADR 0024: se elige de la lista del Núcleo y se administra en
 * Áreas) y la ubicación por niveles, que solo se elige: las ubicaciones se crean en Áreas.
 */
export function StorageSection({
  workspaceId,
  open,
  departmentId,
  onDepartment,
  places,
  recentIds,
  error,
  onPlace,
}: {
  workspaceId: string;
  open: boolean;
  departmentId: string;
  onDepartment: (departmentId: string) => void;
  places: Place[];
  recentIds: string[];
  error: string | undefined;
  onPlace: (placeId: string) => void;
}) {
  const departments = useDepartments(workspaceId, open);
  const options = departments.data?.items ?? [];

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
        <LocationPicker places={places} recentIds={recentIds} onChange={onPlace} error={error} />
      </div>
    </Section>
  );
}
