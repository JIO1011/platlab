import { normalizeDecimalInput } from '@platlab/ui';
import { isVolume } from '../weight';
import { casRequired, receiptTare, validateBottles, validateDraft, type Errors } from './model';
import type { IngressEntry } from './use-ingress-entry';

/** Obligatorios que pueden faltar: su nombre en el pie y el orden en que se ven en la hoja. */
export const missingLabels = { name: 'Nombre', cas: 'CAS', quantity: 'Cantidad', placeId: 'Ubicación', state: 'Estado físico' } as const;
const missingOrder = ['name', 'cas', 'quantity', 'placeId', 'state'] as const;

interface ReviewInput {
  entry: Pick<IngressEntry, 'existing' | 'draft' | 'form' | 'serverErrors' | 'unit' | 'name' | 'density'>;
  canCreate: boolean;
  code: string;
}

/** Errores de los datos de catálogo: un reactivo del catálogo ya los cumple; uno nuevo solo lo crea quien puede. */
function catalogIssuesOf({ existing, draft, name }: Pick<IngressEntry, 'existing' | 'draft' | 'name'>, canCreate: boolean): Errors {
  if (existing) return {};
  if (canCreate) return validateDraft(draft);
  return { name: name ? 'Elige un reactivo del catálogo: tu rol no crea reactivos nuevos.' : 'Elige un reactivo del catálogo.' };
}

/** Los obligatorios vacíos, que se cuentan como «faltan»; el resto de errores, como datos por revisar. */
function emptyFieldsOf({ existing, draft, form, name }: Pick<IngressEntry, 'existing' | 'draft' | 'form' | 'name'>, canCreate: boolean): Set<keyof Errors> {
  const creating = !existing && canCreate;
  const empty = new Set<keyof Errors>();
  if (!name || (!existing && !canCreate)) empty.add('name');
  if (creating && !draft.state) empty.add('state');
  if (creating && casRequired(draft.state) && !draft.cas.trim()) empty.add('cas');
  if (!form.quantity.trim()) empty.add('quantity');
  if (!form.placeId) empty.add('placeId');
  return empty;
}

/**
 * Revisión del ingreso: la tara de la vista previa, todos los errores (`issues`: catálogo, frascos, peso y
 * respuesta del servidor), lo que falta con su nombre y en el orden en que se ve la hoja, y cuántos datos
 * hay por revisar. El servidor numera los códigos, calcula la tara y decide; aquí solo se guía.
 */
export function reviewIngress({ entry, canCreate, code }: ReviewInput) {
  const { form, unit, density } = entry;
  const weight = receiptTare({
    unit,
    quantity: normalizeDecimalInput(form.quantity),
    grossWeight: normalizeDecimalInput(form.grossWeight),
    density: normalizeDecimalInput(density),
  });
  const issues: Errors = { ...catalogIssuesOf(entry, canCreate), ...validateBottles(form, code), ...weight.errors, ...entry.serverErrors };
  const empty = emptyFieldsOf(entry, canCreate);
  return {
    weight,
    volume: isVolume(unit),
    issues,
    missingFields: missingOrder.filter((key) => empty.has(key)),
    toReview: (Object.keys(issues) as Array<keyof Errors>).filter((key) => issues[key] && !empty.has(key)).length,
  };
}

export type IngressReview = ReturnType<typeof reviewIngress>;
