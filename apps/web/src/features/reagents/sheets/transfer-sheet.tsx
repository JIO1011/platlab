import { transferRequest, transferResponse, type Position } from '@platlab/contracts';
import { Field, Quantity, Select, toast } from '@platlab/ui';
import { ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTransferLocations } from '../../../app/queries';
import { commandErrorMessage, useCommand } from '../commands';
import { type SheetBaseProps, validate, FormSheet } from './shared';

/**
 * Traslado en un paso (ADR 0012, entrega 4): el frasco entero pasa a otra ubicación. Solo se elige el
 * destino; el saldo viaja completo y el historial guarda origen y destino.
 */
export function TransferSheet({ workspaceId, open, onOpenChange, position }: SheetBaseProps & { position: Position }) {
  const command = useCommand(workspaceId, '/transfers', transferResponse);
  const locations = useTransferLocations(workspaceId, open);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { locationId: '' } });
  const errors = form.formState.errors;
  const options = (locations.data?.items ?? [])
    .filter((location) => location.id !== position.location.id)
    .map((location) => ({ value: location.id, label: `${location.name} · ${location.code}` }));

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    const payload = validate(transferRequest, { positionId: position.id, locationId: values.locationId }, form);
    if (!payload) return;
    try {
      await command.mutateAsync(payload);
      const target = locations.data?.items.find((location) => location.id === payload.locationId);
      toast.success(`Frasco ${position.container?.code ?? position.lot.code} trasladado`, {
        description: target ? `Ahora está en ${target.name}.` : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      icon={ArrowLeftRight}
      title="Trasladar frasco"
      description="El frasco pasa entero a otra ubicación. El historial guarda de dónde salió y adónde llegó."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Trasladar frasco"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <div className="grid gap-1 rounded-control bg-surface-sunken px-3 py-2.5 text-sm">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-bold tabular-nums text-ink">{position.container?.code ?? position.lot.code}</span>
          <Quantity value={position.balance} unit={position.unit} className="font-semibold text-ink" />
        </p>
        <p className="text-ink-muted">
          {position.product.name} · ahora en <span className="text-ink">{position.location.name}</span>
        </p>
      </div>
      <Field label="Ubicación de destino" error={errors.locationId?.message}>
        <Controller
          control={form.control}
          name="locationId"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              options={options}
              placeholder={locations.isPending ? 'Cargando ubicaciones…' : 'Elige adónde va el frasco'}
            />
          )}
        />
      </Field>
    </FormSheet>
  );
}
