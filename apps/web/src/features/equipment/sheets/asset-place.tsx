import type { AssetCondition, AssetConservation } from '@platlab/contracts';
import { Button, Field, Select, Skeleton } from '@platlab/ui';
import { Activity, MapPin, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { fieldLabel, filled } from '../../../app/filled';
import { Section } from '../../../app/form-section';
import { LocationPicker } from '../../../app/location-picker';
import { toPlaces, type Place } from '../../../app/places';
import { PillField } from '../../../app/pills';
import { conditionLabel, conservationLabel } from '../asset-text';
import { equipmentErrorMessage, useCreateEquipmentLocation } from '../commands';
import { useEquipmentLocations, useResponsibles } from '../queries';
import { NONE } from './asset-form';
import type { AssetFormApi } from './asset-sections';

/** Texto guía de los tres niveles de una ubicación de equipos (el selector trae el de un almacén de reactivos). */
const placeholders = ['Laboratorio o bodega', 'Mesón o estante', 'Nivel (opcional)'] as const;

const conditions: Array<Exclude<AssetCondition, 'retired'>> = ['operational', 'restricted', 'faulted'];
const conservations: Array<AssetConservation | typeof NONE> = ['good', 'fair', 'poor', NONE];

/** Las ubicaciones del espacio en el selector por niveles; quien administra el catálogo agrega las que falten. */
function LocationField({ form, workspaceId, open, canManage }: { form: AssetFormApi; workspaceId: string; open: boolean; canManage: boolean }) {
  const locations = useEquipmentLocations(workspaceId, open);
  const createLocation = useCreateEquipmentLocation(workspaceId);
  const places = useMemo(() => toPlaces(locations.data?.items ?? []), [locations.data]);

  const create = async (name: string, parentId: string | null): Promise<Place | null> => {
    try {
      const created = await createLocation.mutateAsync({ name, parentId });
      form.clearErrors('locationId');
      return { id: created.id, name: created.name, parentId: created.parentId };
    } catch (error) {
      form.setError('locationId', { message: equipmentErrorMessage(error) });
      return null;
    }
  };

  if (locations.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label="Cargando ubicaciones" className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11" />
      </div>
    );
  }
  if (locations.isError) {
    return (
      <div role="alert" className="grid justify-items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
        <p>No se pudieron cargar las ubicaciones. Vuelve a intentarlo.</p>
        <Button variant="secondary" size="sm" onClick={() => void locations.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }
  return (
    <LocationPicker
      places={places}
      recentIds={[]}
      canCreate={canManage}
      onCreate={create}
      placeholders={placeholders}
      error={form.formState.errors.locationId?.message}
      onChange={(placeId) => {
        form.setValue('locationId', placeId);
        form.clearErrors('locationId');
      }}
    />
  );
}

/** «Responsable»: un miembro activo del espacio o «Sin responsable». Quien ya lo era sigue en la lista aunque haya salido. */
function ResponsibleField({ form, workspaceId, open, current }: { form: AssetFormApi; workspaceId: string; open: boolean; current: { id: string; name: string } | null }) {
  const responsibles = useResponsibles(workspaceId, open);
  const items = responsibles.data?.items ?? [];
  const options = [
    { value: NONE, label: 'Sin responsable' },
    ...(current && !items.some((entry) => entry.id === current.id) ? [{ value: current.id, label: current.name }] : []),
    ...items.map((entry) => ({ value: entry.id, label: entry.name })),
  ];
  return (
    <Field
      label="Responsable"
      labelClassName={fieldLabel}
      error={responsibles.isError ? 'No se pudo cargar la lista de personas. Vuelve a abrir la hoja.' : undefined}
    >
      <Controller
        control={form.control}
        name="responsibleId"
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            options={options}
            placeholder={responsibles.isPending ? 'Cargando…' : 'Sin responsable'}
            triggerClassName={filled}
          />
        )}
      />
    </Field>
  );
}

function ConservationField({ form }: { form: AssetFormApi }) {
  return (
    <Controller
      control={form.control}
      name="conservation"
      render={({ field }) => (
        <PillField
          label="Conservación"
          labelClassName={fieldLabel}
          size="sm"
          value={field.value}
          options={conservations.map((entry) => ({ value: entry, label: entry === NONE ? 'Sin dato' : conservationLabel[entry] }))}
          onChange={field.onChange}
        />
      )}
    />
  );
}

/** Alta — «Dónde está y quién responde»: la ubicación por niveles (obligatoria) y el responsable. */
export function PlaceSection({
  form,
  workspaceId,
  open,
  canManage,
}: {
  form: AssetFormApi;
  workspaceId: string;
  open: boolean;
  canManage: boolean;
}) {
  return (
    <Section icon={MapPin} title="Dónde está y quién responde">
      <div className="grid gap-4">
        <LocationField form={form} workspaceId={workspaceId} open={open} canManage={canManage} />
        <ResponsibleField form={form} workspaceId={workspaceId} open={open} current={null} />
      </div>
    </Section>
  );
}

/** Alta — «Estado al registrar»: la condición con la que nace (nunca dado de baja) y la conservación. */
export function StatusSection({ form }: { form: AssetFormApi }) {
  return (
    <Section icon={Activity} title="Estado al registrar">
      <div className="grid gap-4">
        <Controller
          control={form.control}
          name="condition"
          render={({ field }) => (
            <PillField
              label="Condición"
              labelClassName={fieldLabel}
              value={field.value}
              options={conditions.map((entry) => ({ value: entry, label: conditionLabel[entry] }))}
              onChange={field.onChange}
            />
          )}
        />
        <ConservationField form={form} />
      </div>
    </Section>
  );
}

/**
 * Edición — «Responsable y conservación». La ubicación y la condición no se cambian aquí: tienen su hoja
 * («Trasladar equipo», «Cambiar condición») y dejan huella en el historial.
 */
export function OwnerSection({
  form,
  workspaceId,
  open,
  responsible,
}: {
  form: AssetFormApi;
  workspaceId: string;
  open: boolean;
  responsible: { id: string; name: string } | null;
}) {
  return (
    <Section icon={UserRound} title="Responsable y conservación">
      <div className="grid gap-4">
        <ResponsibleField form={form} workspaceId={workspaceId} open={open} current={responsible} />
        <ConservationField form={form} />
      </div>
    </Section>
  );
}
