import type { IntervalUnit, Plan, PlanKind } from '@platlab/contracts';

/** Lo que escribe la persona en «Nuevo plan» y «Editar plan»: todo texto, tal cual está en la hoja. */
export interface PlanFormValues {
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
  requirement: string;
  /** El plan del tipo que este reemplaza, `none` si se suma, `''` sin elegir. */
  replaces: string;
}

/** Un campo que falta y lo que se le dice a la persona; `root` es el error general de la hoja. */
export interface MissingPlanField {
  field: 'intervalCount' | 'kind' | 'assetTypeId' | 'replaces' | 'root';
  message: string;
}

/** Los ítems de la lista de verificación: uno por línea, sin espacios en los extremos y sin líneas en blanco. */
const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

/** Texto opcional: sin espacios en los extremos y vacío es `null`. */
const optionalText = (input: string): string | null => input.trim() || null;

/**
 * Lo obligatorio que falta, en el orden en que se muestra. Al editar solo cuenta la frecuencia (el tipo de
 * trabajo y el alcance no cambian); al crear, también el tipo de trabajo, el tipo o el equipo del alcance y,
 * si el equipo ya tiene un plan de su tipo (`candidates`), si lo reemplaza o se suma.
 */
export function missingPlanFields(
  values: PlanFormValues,
  context: { editing: boolean; custom: boolean; asset: { id: string } | null; candidates: readonly { id: string }[] },
): MissingPlanField[] {
  const missing: MissingPlanField[] = [];
  if (values.intervalCount.trim() === '') {
    missing.push({ field: 'intervalCount', message: context.custom ? 'Escribe cada cuánto se repite.' : 'Elige cada cuánto se repite.' });
  }
  if (context.editing) return missing;
  if (!values.kind) missing.push({ field: 'kind', message: 'Elige qué trabajo es.' });
  if (values.scope === 'type' && !values.assetTypeId) {
    missing.push({ field: 'assetTypeId', message: 'Elige el tipo de equipo que cubre.' });
  }
  if (values.scope === 'asset' && !context.asset) missing.push({ field: 'root', message: 'Elige el equipo del plan.' });
  if (values.scope === 'asset' && context.candidates.length > 0 && values.replaces === '') {
    missing.push({ field: 'replaces', message: 'Elige si reemplaza al plan de su tipo o se suma a él.' });
  }
  return missing;
}

/** Solo lo que cambió respecto del plan guardado: el PATCH no reenvía lo demás. Vacío si no cambió nada. */
export function planChanges(plan: Plan, values: PlanFormValues) {
  const title = values.title.trim();
  const items = lines(values.checklist);
  const criteria = optionalText(values.acceptanceCriteria);
  const requirement = optionalText(values.requirement);
  const count = Number(values.intervalCount);
  return {
    ...(title !== plan.title ? { title } : {}),
    ...(count !== plan.intervalCount ? { intervalCount: count } : {}),
    ...(values.intervalUnit !== plan.intervalUnit ? { intervalUnit: values.intervalUnit } : {}),
    ...(values.startsOn !== plan.startsOn ? { startsOn: values.startsOn } : {}),
    ...(items.join('\n') !== plan.checklist.join('\n') ? { checklist: items } : {}),
    ...(criteria !== (plan.acceptanceCriteria || null) ? { acceptanceCriteria: criteria } : {}),
    ...(requirement !== (plan.requirement || null) ? { requirement } : {}),
  };
}

/**
 * El cuerpo del alta: de un tipo (`assetTypeId`) o de un equipo (`assetId`); solo el plan de un equipo puede
 * reemplazar al de su tipo (`replacesPlanId`), y «se suma» (`none`) o sin elegir no lo manda.
 */
export function createPlanPayload(values: PlanFormValues, asset: { id: string } | null) {
  return {
    kind: values.kind,
    ...(values.scope === 'type' ? { assetTypeId: values.assetTypeId } : { assetId: asset?.id }),
    ...(values.scope === 'asset' && values.replaces !== '' && values.replaces !== 'none' ? { replacesPlanId: values.replaces } : {}),
    title: values.title.trim(),
    intervalCount: Number(values.intervalCount),
    intervalUnit: values.intervalUnit,
    startsOn: values.startsOn,
    checklist: lines(values.checklist),
    acceptanceCriteria: optionalText(values.acceptanceCriteria),
    requirement: optionalText(values.requirement),
  };
}
