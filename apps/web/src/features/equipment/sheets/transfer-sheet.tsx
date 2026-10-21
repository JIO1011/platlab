import { transferAssetRequest, type Asset } from '@platlab/contracts';
import { Button, Field, Skeleton, Textarea, toast } from '@platlab/ui';
import { ArrowLeftRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormSheet, validate, type SheetBaseProps } from '../../../app/form-sheet';
import { LocationPicker } from '../../../app/location-picker';
import { toPlaces } from '../../../app/places';
import { placeLines } from '../asset-text';
import { equipmentErrorMessage, useTransferAsset } from '../commands';
import { useEquipmentLocations } from '../queries';

/** Texto guía de los tres niveles de una ubicación de equipos (el selector trae el de un almacén). */
const placeholders = ['Laboratorio o sala', 'Mesa o armario', 'Nivel o posición (opcional)'] as const;

/**
 * «Trasladar equipo» (ADR 0019): el equipo pasa a otra ubicación del espacio. Solo se elige el destino y,
 * si hace falta, una nota; el historial guarda de dónde salió y adónde llegó.
 */
export function TransferSheet({ workspaceId, open, onOpenChange, asset }: SheetBaseProps & { asset: Asset }) {
  const command = useTransferAsset(workspaceId, asset.id);
  const locations = useEquipmentLocations(workspaceId, open);
  const places = useMemo(() => toPlaces(locations.data?.items ?? []), [locations.data]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { locationId: '', note: '' } });
  const errors = form.formState.errors;
  const current = placeLines(asset.location);

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    if (!values.locationId) {
      form.setError('locationId', { message: 'Elige la ubicación de destino.' });
      return;
    }
    if (values.locationId === asset.location.id) {
      form.setError('locationId', { message: 'El equipo ya está en esa ubicación. Elige otro destino.' });
      return;
    }
    const note = values.note.trim();
    const payload = validate(transferAssetRequest, { locationId: values.locationId, ...(note ? { note } : {}) }, form);
    if (!payload) return;
    try {
      await command.mutateAsync(payload);
      const target = locations.data?.items.find((entry) => entry.id === payload.locationId);
      toast.success(`${asset.name} trasladado`, { description: target ? `Ahora está en ${target.name}.` : undefined });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(equipmentErrorMessage(error));
    }
  });

  return (
    <FormSheet
      icon={ArrowLeftRight}
      title="Trasladar equipo"
      description="El equipo pasa a otra ubicación. El historial guarda de dónde salió y adónde llegó."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Trasladar equipo"
      required
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <div className="grid gap-1 rounded-control bg-surface-sunken px-3 py-2.5 text-sm">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="min-w-0 break-words font-semibold text-ink">{asset.name}</span>
          <span className="font-mono text-[13px] text-ink-muted">{asset.code}</span>
        </p>
        <p className="text-ink-muted">
          Ahora en <span className="text-ink">{current.full}</span>
        </p>
      </div>
      {locations.isPending ? (
        <div role="status" aria-busy="true" aria-label="Cargando ubicaciones" className="grid gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11" />
        </div>
      ) : locations.isError ? (
        <div role="alert" className="grid justify-items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <p>No se pudieron cargar las ubicaciones. Vuelve a intentarlo.</p>
          <Button variant="secondary" size="sm" onClick={() => void locations.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <LocationPicker
          places={places}
          recentIds={[]}
          placeholders={placeholders}
          error={errors.locationId?.message}
          onChange={(placeId) => {
            form.setValue('locationId', placeId);
            form.clearErrors('locationId');
          }}
        />
      )}
      <Field label="Nota" optional hint="Por qué se traslada, si ayuda a quien lo busque." error={errors.note?.message}>
        <Textarea rows={2} {...form.register('note')} />
      </Field>
    </FormSheet>
  );
}
