import { assetRuleViolation, type Asset, type AssetCondition, type AssetConservation } from '@platlab/contracts';
import { normalizeDecimalInput, toDecimalInput } from '@platlab/ui';

/** El valor de «Sin responsable» y «Sin dato» en los selectores (un `Select` no admite el vacío). */
export const NONE = 'none';

/** Alimentación: texto libre con estas sugerencias (pendiente del cliente, ADR 0019). */
export const powerSupplies = ['110 V', '220 V', 'Batería', 'Sin alimentación'] as const;

/** Lo que escribe la persona: todo texto, tal cual está en la hoja. */
export type AssetForm = {
  name: string;
  code: string;
  typeId: string;
  /** Lo escrito en «Tipo»: `typeId` solo se llena al elegir un tipo de la lista. */
  typeName: string;
  brand: string;
  model: string;
  serialNumber: string;
  powerSupply: string;
  locationId: string;
  responsibleId: string;
  condition: Exclude<AssetCondition, 'retired'>;
  conservation: AssetConservation | typeof NONE;
  supplier: string;
  acquiredOn: string;
  warrantyUntil: string;
  usefulLifeYears: string;
  replacementValue: string;
};

/** Los datos de la ficha ya normalizados, como los entiende la API: vacío es `null`. */
export type AssetFields = {
  name: string;
  code: string;
  typeId: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  powerSupply: string | null;
  responsibleId: string | null;
  conservation: AssetConservation | null;
  supplier: string | null;
  acquiredOn: string | null;
  warrantyUntil: string | null;
  usefulLifeYears: number | null;
  replacementValue: string | null;
};

export type AssetFormErrors = Partial<Record<keyof AssetForm, string>>;

export const emptyForm: AssetForm = {
  name: '',
  code: '',
  typeId: '',
  typeName: '',
  brand: '',
  model: '',
  serialNumber: '',
  powerSupply: '',
  locationId: '',
  responsibleId: NONE,
  condition: 'operational',
  conservation: NONE,
  supplier: '',
  acquiredOn: '',
  warrantyUntil: '',
  usefulLifeYears: '',
  replacementValue: '',
};

/** La ficha ya registrada como formulario: la hoja de edición parte de aquí. */
export function formOfAsset(asset: Asset): AssetForm {
  return {
    name: asset.name,
    code: asset.code,
    typeId: asset.type.id,
    typeName: asset.type.name,
    brand: asset.brand ?? '',
    model: asset.model ?? '',
    serialNumber: asset.serialNumber ?? '',
    powerSupply: asset.powerSupply ?? '',
    locationId: asset.location.id,
    responsibleId: asset.responsible?.id ?? NONE,
    condition: asset.condition === 'retired' ? 'operational' : asset.condition,
    conservation: asset.conservation ?? NONE,
    supplier: asset.supplier ?? '',
    acquiredOn: asset.acquiredOn ?? '',
    warrantyUntil: asset.warrantyUntil ?? '',
    usefulLifeYears: asset.usefulLifeYears === null ? '' : String(asset.usefulLifeYears),
    replacementValue: asset.replacementValue === null ? '' : toDecimalInput(asset.replacementValue),
  };
}

/** Texto opcional: sin espacios en los extremos y vacío es `null`. */
const optionalText = (input: string): string | null => input.trim() || null;

type Parsed<T> = { value: T; error?: undefined } | { value: null; error: string };

/** Vida útil: años enteros de 1 a 100; vacío es «sin dato». */
export function parseYears(input: string): Parsed<number | null> {
  const text = input.trim();
  if (text === '') return { value: null };
  const years = /^\d{1,3}$/.test(text) ? Number(text) : 0;
  if (years < 1 || years > 100) return { value: null, error: 'Escribe años enteros, de 1 a 100.' };
  return { value: years };
}

/**
 * Valor de reposición: lo escrito con coma decimal es-EC («9800,5», «9.800,50») pasa a la cadena
 * decimal de la API con dos decimales («9800.50»), sin tocar `number`. Un punto con tres cifras
 * detrás y sin coma («9.800») es ambiguo —miles o decimales—: se pide corregirlo en lugar de adivinar.
 */
export function parseMoney(input: string): Parsed<string | null> {
  const text = input.trim();
  if (text === '') return { value: null };
  if (/^\d{1,3}(?:\.\d{3})+$/.test(text.replace(/\s+/g, ''))) {
    return { value: null, error: 'Con punto no se entienden los miles. Escribe 9800 o 9.800,00.' };
  }
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(normalizeDecimalInput(text));
  if (!match) return { value: null, error: 'Escribe un importe con hasta 2 decimales, por ejemplo 9.800,50.' };
  return { value: `${match[1]}.${(match[2] ?? '').padEnd(2, '0')}` };
}

/**
 * El formulario normalizado y los errores que se pueden decir sin la API: vida útil y valor mal escritos
 * y la garantía que termina antes de la compra (la misma regla que aplica el servidor). Un dato con error
 * queda en `null` en `fields`; quien envía no lo hace mientras haya errores.
 */
export function normalizeForm(form: AssetForm): { fields: AssetFields; errors: AssetFormErrors } {
  const years = parseYears(form.usefulLifeYears);
  const money = parseMoney(form.replacementValue);
  const fields: AssetFields = {
    name: form.name.trim(),
    code: form.code.trim(),
    typeId: form.typeId,
    brand: optionalText(form.brand),
    model: optionalText(form.model),
    serialNumber: optionalText(form.serialNumber),
    powerSupply: optionalText(form.powerSupply),
    responsibleId: form.responsibleId === NONE || form.responsibleId === '' ? null : form.responsibleId,
    conservation: form.conservation === NONE ? null : form.conservation,
    supplier: optionalText(form.supplier),
    acquiredOn: form.acquiredOn || null,
    warrantyUntil: form.warrantyUntil || null,
    usefulLifeYears: years.value,
    replacementValue: money.value,
  };
  const errors: AssetFormErrors = {};
  if (years.error) errors.usefulLifeYears = years.error;
  if (money.error) errors.replacementValue = money.error;
  const rule = assetRuleViolation(fields);
  if (rule) errors.warrantyUntil = rule;
  return { fields, errors };
}

const fieldKeys = [
  'name',
  'code',
  'typeId',
  'brand',
  'model',
  'serialNumber',
  'powerSupply',
  'responsibleId',
  'conservation',
  'supplier',
  'acquiredOn',
  'warrantyUntil',
  'usefulLifeYears',
  'replacementValue',
] as const satisfies ReadonlyArray<keyof AssetFields>;

/** Solo lo que cambió respecto de la ficha guardada: el PATCH no reenvía lo demás. */
export function changedFields(initial: AssetFields, next: AssetFields): Partial<AssetFields> {
  const changes: Partial<AssetFields> = {};
  for (const key of fieldKeys) {
    if (initial[key] !== next[key]) Object.assign(changes, { [key]: next[key] });
  }
  return changes;
}

/**
 * ¿Hay algo por guardar al editar? Un dato distinto de la ficha, un dato con error (para mostrarlo) o una
 * foto elegida: solo cambiar la foto también habilita «Guardar cambios».
 */
export function hasPendingChanges(saved: AssetFields, next: { fields: AssetFields; errors: AssetFormErrors }, photoChosen: boolean): boolean {
  return photoChosen || Object.keys(changedFields(saved, next.fields)).length > 0 || Object.keys(next.errors).length > 0;
}

/** El cuerpo del alta: sin lo que quedó vacío (el servidor propone el código) y con ubicación y estado. */
export function createPayload(fields: AssetFields, placement: { locationId: string; condition: AssetForm['condition'] }) {
  const { code, ...rest } = fields;
  const filled = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== null));
  return { ...filled, ...(code ? { code } : {}), ...placement };
}
