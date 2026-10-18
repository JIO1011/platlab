import { createExclusionRequest, type MaintenanceAsset, type Plan } from '@platlab/contracts';
import { Field, Textarea, toast } from '@platlab/ui';
import { Ban } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { AssetSearch, ChosenAsset } from './asset-search';
import { maintenanceErrorMessage, useAddExclusion } from './commands';

/**
 * «Excluir un equipo» de un plan de su tipo (Administrador), con el motivo: el equipo deja de contar para ese plan y la
 * excepción queda a la vista, con su motivo, en el plan y en la ficha del equipo.
 */
export function ExclusionSheet({ workspaceId, open, onOpenChange, plan }: SheetBaseProps & { plan: Plan }) {
  const command = useAddExclusion(workspaceId, plan.id);
  const [asset, setAsset] = useState<MaintenanceAsset | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { assetId: '', reason: '' } });
  const errors = form.formState.errors;

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    if (!asset) {
      form.setError('assetId', { message: 'Elige el equipo que se excluye.' });
      return;
    }
    const payload = validate(createExclusionRequest, { assetId: asset.id, reason: form.getValues('reason').trim() }, form);
    if (!payload) return;
    try {
      await command.mutateAsync(payload);
      toast.success('Equipo excluido del plan', { description: `${asset.code} · ${plan.title}` });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(maintenanceErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={Ban}
      title="Excluir un equipo"
      description={`Del plan «${plan.title}»${plan.assetType ? ` (${plan.assetType.name})` : ''}. Deja de contar para este plan; puedes devolverlo cuando quieras.`}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Excluir equipo"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={asset !== null || form.formState.isDirty}
    >
      {asset ? (
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Equipo</span>
          <ChosenAsset
            asset={asset}
            onClear={() => {
              setAsset(null);
              form.setValue('assetId', '');
            }}
          />
        </div>
      ) : (
        <AssetSearch
          workspaceId={workspaceId}
          error={errors.assetId?.message}
          excludeIds={plan.exclusions.map((entry) => entry.asset.id)}
          onChoose={(next) => {
            setAsset(next);
            form.setValue('assetId', next.id);
            form.clearErrors('assetId');
          }}
        />
      )}
      <Field label="Motivo" required hint="Por qué este equipo no sigue el plan. Se muestra a quien lo vea." error={errors.reason?.message}>
        <Textarea rows={3} maxLength={500} {...form.register('reason')} />
      </Field>
    </FormSheet>
  );
}
