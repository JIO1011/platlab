import { location } from '@platlab/contracts';
import { MapPin } from 'lucide-react';
import { ChoiceField } from '../choices';
import { commandErrorMessage, useCommand } from '../commands';
import { useAreas } from '../queries';
import { fieldLabel, filled } from './filled';
import { Section } from './form-section';
import { LocationPicker } from './location-picker';
import type { Errors, Place } from './model';

/**
 * «Dónde se guarda»: el área o departamento y la ubicación por niveles. Quien administra el catálogo crea
 * ubicaciones (en el servidor, al momento); si no se pudo, el motivo queda en `onServerErrors` y se borra
 * al cambiar los datos.
 */
export function StorageSection({
  workspaceId,
  open,
  area,
  onArea,
  places,
  recentIds,
  canCreate,
  canManageLists,
  error,
  onPlace,
  onServerErrors,
}: {
  workspaceId: string;
  open: boolean;
  area: string;
  onArea: (area: string) => void;
  places: Place[];
  recentIds: string[];
  /** Crear ubicaciones: `reagents.catalog.manage`. */
  canCreate: boolean;
  /** Ampliar la lista de áreas desde la misma hoja. */
  canManageLists: boolean;
  error: string | undefined;
  onPlace: (placeId: string) => void;
  onServerErrors: (errors: Errors) => void;
}) {
  const areas = useAreas(workspaceId, open);
  const createLocation = useCommand(workspaceId, '/locations', location);

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
        <ChoiceField
          workspaceId={workspaceId}
          label="Área o departamento"
          labelClassName={fieldLabel}
          display="select"
          selectClassName={filled}
          noneLabel="Sin área"
          options={areas.data?.items ?? []}
          loading={areas.isPending}
          value={area}
          onChange={onArea}
          canAdd={canManageLists}
          addPath="/areas"
          addBody={(entry) => ({ name: entry })}
          addLabel="Nueva área"
        />
        <LocationPicker places={places} recentIds={recentIds} onChange={onPlace} canCreate={canCreate} onCreate={createPlace} error={error} />
      </div>
    </Section>
  );
}
