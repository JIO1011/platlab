import {
  assetTypeList,
  createPlanRequest,
  planKind,
  updatePlanRequest,
  type IntervalUnit,
  type Plan,
  type PlanKind,
} from '@platlab/contracts';
import { Field, Input, OptionRow, Select, Skeleton, Textarea, toast } from '@platlab/ui';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ChevronDown, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../app/api';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { PillField } from '../../app/pills';
import { AssetSearch, ChosenAsset } from './asset-search';
import { maintenanceErrorMessage, useCreatePlan, useUpdatePlan } from './commands';
import { useMaintenance } from './context';
import { todayInZone } from './due';
import { frequencyPresets, intervalUnitOptions, presetFor, scopeText } from './plan-text';
import { useAssetMaintenance, useMaintenanceKey, usePlans } from './queries';
import { kindLabels } from './work-text';

const kindOptions = planKind.options.map((value) => ({ value, label: kindLabels[value] }));
const frequencyOptions = [...frequencyPresets.map((preset) => ({ value: preset.value, label: preset.label })), { value: 'custom', label: 'Otro' }];

/** El equipo de un plan propio: lo que basta para mostrarlo y enviarlo. */
interface PlanAsset {
  id: string;
  code: string;
  name: string;
  area?: string | null | undefined;
}

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
  kind: PlanKind | '';
  scope: 'type' | 'asset';
  assetTypeId: string;
  title: string;
  /** Con el número y la unidad: una frecuencia de un toque los fija; «Otro» los deja escribir. */
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

/** Una pregunta de «Nuevo plan»: su título y lo que se contesta. */
function Question({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-4">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

/**
 * «Nuevo plan», «Editar plan» y «Cambiar frecuencia» (Administrador). Crear es contestar cuatro preguntas en orden: qué se
 * hace (con un título sugerido), a qué equipos (un tipo o un equipo), cada cuánto y desde cuándo; la lista y el criterio
 * son opcionales. «Cambiar frecuencia» parte de un plan de tipo para un solo equipo, que sale de aquel plan en el mismo
 * paso. Al editar no cambian el tipo de trabajo ni el alcance; si cambia la frecuencia o el inicio, las fechas se recalculan.
 */
export function PlanSheet({
  workspaceId,
  open,
  onOpenChange,
  plan,
  ownFor,
}: SheetBaseProps & {
  /** El plan que se edita; sin él, se crea uno. */
  plan?: Plan | undefined;
  /** «Cambiar frecuencia»: el plan del tipo y el equipo que tendrá el suyo. */
  ownFor?: { plan: Plan; asset: PlanAsset } | undefined;
}) {
  const { me } = useMaintenance();
  const editing = plan !== undefined;
  const base = plan ?? ownFor?.plan;
  const create = useCreatePlan(workspaceId);
  const update = useUpdatePlan(workspaceId, plan?.id ?? '');
  const [today] = useState(() => todayInZone(me.workspace.timeZone, Date.now()));
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [asset, setAsset] = useState<PlanAsset | null>(ownFor?.asset ?? null);
  const [custom, setCustom] = useState(base ? presetFor(base.intervalCount, base.intervalUnit) === null : false);
  const titleTouched = useRef(editing);
  const form = useForm<PlanFormValues>({
    defaultValues: {
      kind: base?.kind ?? '',
      scope: ownFor ? 'asset' : 'type',
      assetTypeId: '',
      title: plan?.title ?? '',
      intervalCount: base ? String(base.intervalCount) : '',
      intervalUnit: base?.intervalUnit ?? 'month',
      startsOn: plan?.startsOn ?? today,
      checklist: (base?.checklist ?? []).join('\n'),
      acceptanceCriteria: base?.acceptanceCriteria ?? '',
      replaces: ownFor ? ownFor.plan.id : '',
    },
  });
  const errors = form.formState.errors;
  const [kind, scope, intervalCount, intervalUnit, startsOn, replaces, assetTypeId] = form.watch([
    'kind',
    'scope',
    'intervalCount',
    'intervalUnit',
    'startsOn',
    'replaces',
    'assetTypeId',
  ]);
  const types = useAssetTypes(workspaceId, !editing && scope === 'type');
  const plans = usePlans(workspaceId, !editing && scope === 'asset' && !ownFor);
  const assetMaintenance = useAssetMaintenance(workspaceId, !editing && !ownFor && scope === 'asset' ? (asset?.id ?? null) : null);

  // Los planes de su tipo que ya cubren al equipo y que este podría reemplazar (del mismo tipo de trabajo).
  const covering = new Set(assetMaintenance.data?.plans.map((entry) => entry.plan.id));
  const candidates = (plans.data?.items ?? []).filter((entry) => entry.assetType !== null && covering.has(entry.id) && (kind === '' || entry.kind === kind));

  const recalculates =
    editing && plan && (Number(intervalCount) !== plan.intervalCount || intervalUnit !== plan.intervalUnit || startsOn !== plan.startsOn);

  // El título se sugiere con lo que se eligió («Calibración de Balanzas») mientras nadie lo escriba.
  const targetName = scope === 'type' ? types.data?.items.find((entry) => entry.id === assetTypeId)?.name : asset?.code;
  const suggested = !editing && kind !== '' && targetName ? `${kindLabels[kind]} de ${targetName}` : '';
  useEffect(() => {
    if (titleTouched.current || suggested === '') return;
    form.setValue('title', suggested);
    // Solo reacciona a lo que cambia la sugerencia.
  }, [suggested]);

  const frequency = custom ? 'custom' : (presetFor(Number(intervalCount), intervalUnit)?.value ?? '');

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    const count = Number(values.intervalCount);
    const items = lines(values.checklist);
    const criteria = values.acceptanceCriteria.trim();
    if (values.intervalCount.trim() === '') {
      form.setError('intervalCount', { message: custom ? 'Escribe cada cuánto se repite.' : 'Elige cada cuánto se repite.' });
      if (editing) return;
    }
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
        let invalid = values.intervalCount.trim() === '';
        if (!values.kind) {
          form.setError('kind', { message: 'Elige qué trabajo es.' });
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

  const titleField = (
    <Field label="Título" required hint="Así se verá en las listas. Puedes cambiarlo." error={errors.title?.message}>
      <Input
        maxLength={120}
        autoComplete="off"
        className="h-11 sm:h-10"
        {...form.register('title', { onChange: (event) => (titleTouched.current = event.target.value !== '') })}
      />
    </Field>
  );

  return (
    <FormSheet
      icon={CalendarClock}
      title={editing ? 'Editar plan' : ownFor ? 'Cambiar frecuencia' : 'Nuevo plan'}
      description={
        ownFor
          ? `Un plan solo para ${ownFor.asset.code}, en lugar de «${ownFor.plan.title}».`
          : editing
            ? 'El tipo de trabajo y los equipos no cambian.'
            : 'Qué se hace, a qué equipos y cada cuánto.'
      }
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={editing ? 'Guardar cambios' : 'Crear plan'}
      pending={create.isPending || update.isPending}
      generalError={generalError ?? errors.root?.message ?? null}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty || (asset !== null && !ownFor)}
      fullscreenMobile
      sections
      focusFirst
      pendingText={editing ? 'Guardando el plan…' : 'Creando el plan…'}
    >
      {editing && plan ? (
        <section aria-label="Plan" className="grid gap-4">
          <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
            <span className="font-medium text-ink">{kindLabels[plan.kind]}</span> · {scopeText(plan)}
          </p>
          {titleField}
        </section>
      ) : (
        <>
          <Question title="¿Qué se hace?">
            <PillField
              label="Tipo de trabajo"
              required
              value={kind}
              options={kindOptions}
              disabled={ownFor !== undefined}
              onChange={(value) => {
                form.setValue('kind', value, { shouldDirty: true });
                form.clearErrors('kind');
              }}
              error={errors.kind?.message}
            />
            {titleField}
          </Question>
          <Question title="¿A qué equipos?">
            {ownFor ? (
              <>
                <ChosenAsset asset={ownFor.asset} />
                <p className="text-[13px] text-ink-muted">Solo este equipo; sale de «{ownFor.plan.title}» y sigue este plan.</p>
              </>
            ) : (
              <>
                <PillField
                  label="Se aplica a"
                  size="sm"
                  value={scope}
                  options={[
                    { value: 'type', label: 'Un tipo de equipo' },
                    { value: 'asset', label: 'Un equipo' },
                  ]}
                  onChange={(value) => form.setValue('scope', value, { shouldDirty: true })}
                  hint={scope === 'type' ? 'Cubre todos sus equipos, también los que se registren después.' : 'Solo ese equipo.'}
                />
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
                        value={assetTypeId}
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
                        form.setValue('replaces', '');
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
                          <span className="block text-[13px] font-normal text-ink-muted">Si archivas este plan, el equipo vuelve a aquel.</span>
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
                        <span className="block text-[13px] font-normal text-ink-muted">Tendrá este plan además del de su tipo.</span>
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
          </Question>
        </>
      )}

      <Question title="¿Cada cuánto?">
        <PillField
          label="Frecuencia"
          required
          size="sm"
          value={frequency}
          options={frequencyOptions}
          onChange={(value) => {
            if (value === 'custom') {
              setCustom(true);
              return;
            }
            const preset = frequencyPresets.find((entry) => entry.value === value);
            if (!preset) return;
            setCustom(false);
            form.setValue('intervalCount', String(preset.count), { shouldDirty: true });
            form.setValue('intervalUnit', preset.unit, { shouldDirty: true });
            form.clearErrors('intervalCount');
          }}
          error={custom ? undefined : errors.intervalCount?.message}
        />
        {custom ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cada" required error={errors.intervalCount?.message}>
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
          </div>
        ) : null}
      </Question>

      <Question title="¿Desde cuándo?">
        <Field label="Fecha de inicio" required hint="Los equipos sin registros tocan en esta fecha." error={errors.startsOn?.message}>
          <Input type="date" className="h-11 sm:h-10" {...form.register('startsOn')} />
        </Field>
        {recalculates ? (
          <p role="status" className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-sm font-medium text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Al cambiar la frecuencia o el inicio, las próximas fechas de los equipos se recalculan.
          </p>
        ) : null}
      </Question>

      <details className="group" open={Boolean(base && (base.checklist.length > 0 || base.acceptanceCriteria))}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">Lista de verificación y criterio</span>
            <span className="block text-[13px] text-ink-muted">Opcional. Quien registre el trabajo los verá.</span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-4 grid gap-4">
          <Field label="Lista de verificación" optional hint="Un paso por línea (hasta 30)." error={errors.checklist?.message}>
            <Textarea rows={4} {...form.register('checklist')} />
          </Field>
          <Field label="Criterio de aceptación" optional hint="Cuándo se considera Conforme. Se copia a cada registro." error={errors.acceptanceCriteria?.message}>
            <Textarea rows={3} maxLength={1000} {...form.register('acceptanceCriteria')} />
          </Field>
        </div>
      </details>
    </FormSheet>
  );
}
