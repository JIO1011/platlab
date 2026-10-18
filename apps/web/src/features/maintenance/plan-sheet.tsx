import {
  assetTypeList,
  createPlanRequest,
  updatePlanRequest,
  type IntervalUnit,
  type MaintenanceAsset,
  type Plan,
  type WorkKind,
} from '@platlab/contracts';
import { Field, Input, OptionRow, Select, Skeleton, Textarea, toast } from '@platlab/ui';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../app/api';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { PillField } from '../../app/pills';
import { AssetSearch, ChosenAsset } from './asset-search';
import { maintenanceErrorMessage, useCreatePlan, useUpdatePlan } from './commands';
import { useMaintenance } from './context';
import { todayInZone } from './due';
import { intervalUnitOptions, scopeText } from './plan-text';
import { useAssetMaintenance, useMaintenanceKey, usePlans } from './queries';
import { kindLabels } from './work-text';

const kindOptions = (Object.keys(kindLabels) as WorkKind[]).map((value) => ({ value, label: kindLabels[value] }));

/** Los tipos de equipo del espacio, para el alcance de un plan «de un tipo» (los lista Equipos). */
function useAssetTypes(workspaceId: string, enabled: boolean) {
  const key = useMaintenanceKey(workspaceId);
  return useQuery({
    queryKey: [...key, 'asset-types'],
    queryFn: () => api(`/workspaces/${workspaceId}/equipment/asset-types`, { schema: assetTypeList }),
    enabled,
  });
}

interface PlanFormValues {
  kind: WorkKind | '';
  scope: 'type' | 'asset';
  assetTypeId: string;
  title: string;
  intervalCount: string;
  intervalUnit: IntervalUnit;
  startsOn: string;
  /** Un ítem por línea. */
  checklist: string;
  acceptanceCriteria: string;
  /** El plan del tipo que este reemplaza, `none` si se suma, `''` sin elegir. */
  replaces: string;
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

/**
 * «Nuevo plan» y «Editar plan» (Administrador). Un plan es de un tipo de equipo (cubre todas sus unidades, también las
 * nuevas) o de un equipo («Usar plan propio»), que puede reemplazar al de su tipo. Al editar no cambian el tipo de
 * trabajo ni el alcance; si cambia la frecuencia o el inicio, las próximas fechas se recalculan.
 */
export function PlanSheet({
  workspaceId,
  open,
  onOpenChange,
  plan,
  own,
}: SheetBaseProps & {
  /** El plan que se edita; sin él, se crea uno. */
  plan?: Plan | undefined;
  /** «Usar plan propio»: el plan del tipo del que se parte para el plan de un equipo. */
  own?: Plan | undefined;
}) {
  const { me } = useMaintenance();
  const editing = plan !== undefined;
  const base = plan ?? own;
  const create = useCreatePlan(workspaceId);
  const update = useUpdatePlan(workspaceId, plan?.id ?? '');
  const [today] = useState(() => todayInZone(me.workspace.timeZone, Date.now()));
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [asset, setAsset] = useState<MaintenanceAsset | null>(null);
  const form = useForm<PlanFormValues>({
    defaultValues: {
      kind: base?.kind ?? '',
      scope: own ? 'asset' : 'type',
      assetTypeId: '',
      title: base?.title ?? '',
      intervalCount: base ? String(base.intervalCount) : '',
      intervalUnit: base?.intervalUnit ?? 'month',
      startsOn: base?.startsOn ?? today,
      checklist: (base?.checklist ?? []).join('\n'),
      acceptanceCriteria: base?.acceptanceCriteria ?? '',
      replaces: own ? own.id : '',
    },
  });
  const errors = form.formState.errors;
  const [kind, scope, intervalCount, intervalUnit, startsOn, replaces] = form.watch(['kind', 'scope', 'intervalCount', 'intervalUnit', 'startsOn', 'replaces']);
  const types = useAssetTypes(workspaceId, !editing && scope === 'type');
  const plans = usePlans(workspaceId, !editing && scope === 'asset');
  const assetMaintenance = useAssetMaintenance(workspaceId, !editing && scope === 'asset' ? (asset?.id ?? null) : null);

  // Los planes de su tipo que ya cubren al equipo y que este podría reemplazar (del mismo tipo de trabajo).
  const covering = new Set(assetMaintenance.data?.plans.map((entry) => entry.plan.id));
  const candidates = (plans.data?.items ?? []).filter((entry) => entry.assetType !== null && covering.has(entry.id) && (kind === '' || entry.kind === kind));

  const recalculates =
    editing && plan && (Number(intervalCount) !== plan.intervalCount || intervalUnit !== plan.intervalUnit || startsOn !== plan.startsOn);

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    const count = Number(values.intervalCount);
    const items = lines(values.checklist);
    const criteria = values.acceptanceCriteria.trim();
    try {
      if (plan) {
        const changes = {
          ...(values.title.trim() !== plan.title ? { title: values.title.trim() } : {}),
          ...(count !== plan.intervalCount ? { intervalCount: count } : {}),
          ...(values.intervalUnit !== plan.intervalUnit ? { intervalUnit: values.intervalUnit } : {}),
          ...(values.startsOn !== plan.startsOn ? { startsOn: values.startsOn } : {}),
          ...(items.join('\n') !== plan.checklist.join('\n') ? { checklist: items } : {}),
          ...(criteria !== (plan.acceptanceCriteria ?? '') ? { acceptanceCriteria: criteria === '' ? null : criteria } : {}),
        };
        if (Object.keys(changes).length === 0) {
          setGeneralError('No cambiaste nada.');
          return;
        }
        const payload = validate(updatePlanRequest, { ...changes, expectedVersion: plan.version }, form);
        if (!payload) return;
        await update.mutateAsync(payload);
        toast.success('Plan actualizado', { description: recalculates ? 'Las próximas fechas se recalcularon.' : values.title.trim() });
      } else {
        let invalid = false;
        if (!values.kind) {
          form.setError('kind', { message: 'Elige el tipo de trabajo.' });
          invalid = true;
        }
        if (values.scope === 'type' && !values.assetTypeId) {
          form.setError('assetTypeId', { message: 'Elige el tipo de equipo que cubre.' });
          invalid = true;
        }
        if (values.scope === 'asset' && !asset) {
          form.setError('root', { message: 'Elige el equipo del plan.' });
          invalid = true;
        }
        if (values.scope === 'asset' && candidates.length > 0 && values.replaces === '') {
          form.setError('replaces', { message: 'Elige si reemplaza al plan de su tipo o se suma a él.' });
          invalid = true;
        }
        if (invalid) return;
        const payload = validate(
          createPlanRequest,
          {
            kind: values.kind,
            ...(values.scope === 'type' ? { assetTypeId: values.assetTypeId } : { assetId: asset?.id }),
            ...(values.scope === 'asset' && values.replaces !== '' && values.replaces !== 'none' ? { replacesPlanId: values.replaces } : {}),
            title: values.title.trim(),
            intervalCount: count,
            intervalUnit: values.intervalUnit,
            startsOn: values.startsOn,
            checklist: items,
            acceptanceCriteria: criteria === '' ? null : criteria,
          },
          form,
        );
        if (!payload) return;
        await create.mutateAsync(payload);
        toast.success('Plan creado', { description: values.title.trim() });
      }
      onOpenChange(false);
    } catch (error) {
      setGeneralError(maintenanceErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={CalendarClock}
      title={editing ? 'Editar plan' : own ? 'Usar plan propio' : 'Nuevo plan'}
      description={
        own
          ? `Un plan solo de un equipo, partiendo de «${own.title}».`
          : editing
            ? 'El tipo de trabajo y el alcance no cambian.'
            : 'Cuándo y cómo se hace un mantenimiento, para un tipo de equipo o para un equipo.'
      }
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={editing ? 'Guardar cambios' : 'Crear plan'}
      pending={create.isPending || update.isPending}
      generalError={generalError ?? errors.root?.message ?? null}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty || asset !== null}
      wide
    >
      {editing && plan ? (
        <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
          <span className="font-medium text-ink">{kindLabels[plan.kind]}</span> · {scopeText(plan)}
        </p>
      ) : (
        <>
          <PillField
            label="Tipo de trabajo"
            required
            value={kind}
            options={kindOptions}
            onChange={(value) => {
              form.setValue('kind', value, { shouldDirty: true });
              form.clearErrors('kind');
            }}
            error={errors.kind?.message}
          />
          {own ? null : (
            <PillField
              label="Alcance"
              required
              size="sm"
              value={scope}
              options={[
                { value: 'type', label: 'Un tipo de equipo' },
                { value: 'asset', label: 'Un equipo' },
              ]}
              onChange={(value) => form.setValue('scope', value, { shouldDirty: true })}
              hint={
                scope === 'type'
                  ? 'Cubre todos los equipos de ese tipo, también los que se registren después.'
                  : 'Solo ese equipo. Puede reemplazar al plan de su tipo.'
              }
            />
          )}
          {scope === 'type' ? (
            <Field label="Tipo de equipo" required error={errors.assetTypeId?.message}>
              {types.isPending ? (
                <Skeleton className="h-11" />
              ) : types.isError ? (
                <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
                  No se pudieron cargar los tipos de equipo. Cierra e inténtalo de nuevo.
                </p>
              ) : (
                <Select
                  value={form.watch('assetTypeId')}
                  onValueChange={(value) => {
                    form.setValue('assetTypeId', value, { shouldDirty: true });
                    form.clearErrors('assetTypeId');
                  }}
                  placeholder="Elige un tipo"
                  triggerClassName="h-11 sm:h-10"
                  options={types.data.items.map((entry) => ({ value: entry.id, label: entry.name }))}
                />
              )}
            </Field>
          ) : asset ? (
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-ink">Equipo</span>
              <ChosenAsset
                asset={asset}
                onClear={() => {
                  setAsset(null);
                  form.setValue('replaces', own ? own.id : '');
                }}
              />
            </div>
          ) : (
            <AssetSearch workspaceId={workspaceId} onChoose={setAsset} />
          )}
          {scope === 'asset' && asset && candidates.length > 0 ? (
            <fieldset className="grid min-w-0 gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-ink">
                ¿Reemplaza al plan de su tipo?
                <span aria-hidden className="ml-0.5">
                  *
                </span>
              </legend>
              <div className="grid gap-0.5 rounded-xl border border-line bg-white/60 p-1">
                {candidates.map((entry) => (
                  <OptionRow
                    key={entry.id}
                    type="radio"
                    name="reemplaza"
                    checked={replaces === entry.id}
                    aria-invalid={errors.replaces ? true : undefined}
                    onChange={() => {
                      form.setValue('replaces', entry.id, { shouldDirty: true });
                      form.clearErrors('replaces');
                    }}
                  >
                    <span className="block font-medium">Sí, reemplaza a «{entry.title}»</span>
                    <span className="block text-[13px] font-normal text-ink-muted">
                      El equipo sale de ese plan con el motivo «Plan propio». Si archivas este, vuelve a él.
                    </span>
                  </OptionRow>
                ))}
                <OptionRow
                  type="radio"
                  name="reemplaza"
                  checked={replaces === 'none'}
                  aria-invalid={errors.replaces ? true : undefined}
                  onChange={() => {
                    form.setValue('replaces', 'none', { shouldDirty: true });
                    form.clearErrors('replaces');
                  }}
                >
                  <span className="block font-medium">No, se suma</span>
                  <span className="block text-[13px] font-normal text-ink-muted">El equipo tendrá este plan además del de su tipo.</span>
                </OptionRow>
              </div>
              {errors.replaces?.message ? (
                <p role="alert" className="text-[13px] font-medium text-danger">
                  {errors.replaces.message}
                </p>
              ) : null}
            </fieldset>
          ) : null}
        </>
      )}
      <Field label="Título" required hint="Cómo se verá en las listas, por ejemplo «Calibración semestral»." error={errors.title?.message}>
        <Input maxLength={120} autoComplete="off" className="h-11 sm:h-10" {...form.register('title')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Repetir cada" required error={errors.intervalCount?.message}>
          <Input type="number" inputMode="numeric" min={1} max={999} className="h-11 tabular-nums sm:h-10" {...form.register('intervalCount')} />
        </Field>
        <Field label="Unidad" required error={errors.intervalUnit?.message}>
          <Select
            value={intervalUnit}
            onValueChange={(value) => form.setValue('intervalUnit', value as IntervalUnit, { shouldDirty: true })}
            placeholder="Unidad"
            triggerClassName="h-11 sm:h-10"
            options={intervalUnitOptions}
          />
        </Field>
        <Field label="Empieza el" required error={errors.startsOn?.message}>
          <Input type="date" className="h-11 sm:h-10" {...form.register('startsOn')} />
        </Field>
      </div>
      {recalculates ? (
        <p role="status" className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-sm font-medium text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Al cambiar la frecuencia o el inicio, las próximas fechas de los equipos se recalculan.
        </p>
      ) : null}
      <Field
        label="Lista de verificación"
        optional
        hint="Un ítem por línea (hasta 30). Quien registre el trabajo los marca."
        error={errors.checklist?.message}
      >
        <Textarea rows={4} {...form.register('checklist')} />
      </Field>
      <Field label="Criterio de aceptación" optional hint="Cuándo se considera Conforme. Se copia a cada registro." error={errors.acceptanceCriteria?.message}>
        <Textarea rows={3} maxLength={1000} {...form.register('acceptanceCriteria')} />
      </Field>
    </FormSheet>
  );
}
