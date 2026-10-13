import {
  bottleCodes,
  newProduct,
  productRuleViolation,
  receiptRequest,
  type Location,
  type physicalState,
  type Product,
  type sdsKind,
} from '@platlab/contracts';
import { normalizeDecimalInput, subtractDecimal, toDecimalInput } from '@platlab/ui';
import type { z } from 'zod';
import type { Hazard } from '../hazards';
import { formatGrams, isPositiveQuantity, isVolume, tareOf } from '../weight';
import { checkCas } from './cas';

type PhysicalState = z.infer<typeof physicalState>;
export type SdsKind = z.infer<typeof sdsKind>;

/** Unidades de un reactivo (ADR 0015): las que admiten control por peso. */
export const productUnits = ['g', 'kg', 'mL', 'L'] as const;

/** Datos de catálogo tal como se escriben: un reactivo nuevo en el ingreso o la ficha al editarla. */
export interface Draft {
  name: string;
  cas: string;
  /** Una de `productUnits` al crear; al editar, la del reactivo aunque sea anterior a esa lista (mg, u…). */
  unit: string;
  state: PhysicalState | '';
  controlled: boolean;
  hazards: Hazard[];
  sds: SdsKind | '';
  sdsUrl: string;
  /** g/mL; solo cuenta en volumen. */
  density: string;
}

export const emptyDraft: Draft = { name: '', cas: '', unit: 'g', state: '', controlled: false, hazards: [], sds: '', sdsUrl: '', density: '' };

/** La ficha de un reactivo como borrador, para editarla. */
export function draftOf(product: Product): Draft {
  return {
    name: product.name,
    cas: product.casNumber ?? '',
    unit: product.baseUnit,
    state: product.physicalState ?? '',
    controlled: product.controlled,
    hazards: product.hazards,
    sds: product.sdsKind ?? '',
    sdsUrl: product.sdsUrl ?? '',
    density: product.density ? toDecimalInput(product.density) : '',
  };
}

/** Lo que se escribe para los frascos del ingreso. */
export interface BottlesForm {
  quantity: string;
  count: string;
  /** Código del primer frasco; `null` mientras se usa el sugerido. */
  code: string | null;
  /** La ubicación más profunda elegida. */
  placeId: string;
  noExpiry: boolean;
  expiresOn: string;
  brand: string;
  area: string;
  /** Peso en g de un frasco lleno: con él, el servidor calcula la tara. */
  grossWeight: string;
  /** Densidad de los frascos de un reactivo existente; la de uno nuevo va en su ficha (`Draft`). */
  density: string;
}

export const emptyBottles: BottlesForm = {
  quantity: '',
  count: '1',
  code: null,
  placeId: '',
  noExpiry: false,
  expiresOn: '',
  brand: '',
  area: '',
  grossWeight: '',
  density: '',
};

export type Errors = Partial<
  Record<'name' | 'state' | 'cas' | 'sdsUrl' | 'density' | 'quantity' | 'count' | 'code' | 'placeId' | 'weight', string>
>;

/** Frascos por ingreso: el máximo de códigos que acepta el contrato. */
export const MAX_BOTTLES = 50;

export const countOf = (text: string) => (/^\d{1,3}$/.test(text.trim()) ? Number(text.trim()) : null);
export const countValid = (count: number | null): count is number => count !== null && count >= 1 && count <= MAX_BOTTLES;

/** El CAS es obligatorio salvo en mezclas: la regla compartida del contrato. */
export const casRequired = (state: Draft['state']) => productRuleViolation({ casNumber: null, physicalState: state || null }) !== null;

const sdsUrlValid = (url: string) => newProduct.shape.sdsUrl.safeParse(url).success;
const codeValid = (code: string) => receiptRequest.shape.codes.element.safeParse(code).success;

/**
 * Errores de los datos de catálogo, con las reglas del contrato y mensajes que dicen cómo resolverlos.
 * Como en el servidor, al editar una ficha el CAS obligatorio solo se exige si cambian el CAS o el
 * estado (`cas: false` lo omite).
 */
export function validateDraft(draft: Draft, { cas: requireCas = true } = {}): Errors {
  const errors: Errors = {};
  if (!draft.name.trim()) errors.name = 'Escribe el nombre del reactivo.';
  if (!draft.state) errors.state = 'Elige cómo es.';
  const cas = checkCas(draft.cas);
  if (cas === 'empty') {
    if (requireCas && casRequired(draft.state)) errors.cas = 'Escribe el CAS, como 7647-14-5; solo una mezcla puede no tenerlo.';
  } else if (cas !== 'valid') errors.cas = 'Revisa el CAS: su dígito de control no coincide.';
  const url = draft.sdsUrl.trim();
  if (draft.sds === 'digital' && url && !sdsUrlValid(url)) errors.sdsUrl = 'Escribe el enlace completo, empieza por https://.';
  const density = normalizeDecimalInput(draft.density);
  if (isVolume(draft.unit) && density && !isPositiveQuantity(density)) errors.density = 'Escribe la densidad en g/mL, como 0,789.';
  return errors;
}

/** Los datos de catálogo como los pide la API: el enlace solo con ficha digital y la densidad solo en volumen. */
export function catalogFields(draft: Draft) {
  const url = draft.sdsUrl.trim();
  const density = normalizeDecimalInput(draft.density);
  return {
    name: draft.name.trim(),
    casNumber: draft.cas.trim() || null,
    physicalState: draft.state || undefined,
    baseUnit: draft.unit,
    hazards: draft.hazards,
    controlled: draft.controlled,
    sdsKind: draft.sds || null,
    sdsUrl: draft.sds === 'digital' && url ? url : null,
    density: isVolume(draft.unit) && density ? density : null,
  };
}

/** Códigos de los frascos: la serie desde el primero, con la numeración del servidor. */
export const seriesOf = (code: string, count: number | null): string[] =>
  countValid(count) && code.trim() ? bottleCodes(code.trim(), count) : [];

/** Número final del último frasco («004»), para verlo en el campo del código con más de uno. */
export function lastSuffix(codes: string[]): string | null {
  if (codes.length < 2) return null;
  const last = codes.at(-1) ?? '';
  return /(\d+)$/.exec(last)?.[1] ?? last;
}

/** Errores de los frascos: cantidad, número de frascos, código y ubicación. */
export function validateBottles(form: BottlesForm, code: string): Errors {
  const errors: Errors = {};
  const quantity = normalizeDecimalInput(form.quantity);
  if (!quantity) errors.quantity = 'Escribe cuánto trae cada frasco.';
  else if (!isPositiveQuantity(quantity)) errors.quantity = 'Escribe una cantidad mayor que cero, como 500 o 2,5.';
  const count = countOf(form.count);
  if (!countValid(count)) errors.count = `Entre 1 y ${MAX_BOTTLES} frascos.`;
  else if (!code.trim()) errors.code = 'Escribe el código del primer frasco.';
  else if (!seriesOf(code, count).every(codeValid)) {
    errors.code = 'Usa letras, números, punto, guion o guion bajo, y empieza por una letra o un número.';
  }
  if (!form.placeId) errors.placeId = 'Elige dónde los guardas.';
  return errors;
}

/**
 * Tara que calculará el servidor con el peso del frasco lleno (vista previa) y los errores del
 * control por peso. Un peso sin llenar no es un error: el control es opcional.
 */
export function receiptTare(input: { unit: string; quantity: string; grossWeight: string; density: string }): {
  tare: string | null;
  errors: Errors;
} {
  const { unit, quantity, grossWeight, density } = input;
  if (grossWeight === '') return { tare: null, errors: {} };
  if (!isPositiveQuantity(grossWeight)) return { tare: null, errors: { weight: 'Escribe el peso en gramos, como 640,5.' } };
  if (isVolume(unit)) {
    if (density === '') return { tare: null, errors: { density: 'Falta la densidad (g/mL) para calcular la tara.' } };
    if (!isPositiveQuantity(density)) return { tare: null, errors: { density: 'Escribe la densidad en g/mL, como 0,789.' } };
  }
  if (!isPositiveQuantity(quantity)) return { tare: null, errors: {} };
  const tare = tareOf(grossWeight, quantity, unit, isVolume(unit) ? density : null);
  if (tare === null) return { tare: null, errors: {} };
  if (tare === '0' || tare.startsWith('-')) {
    const content = subtractDecimal(grossWeight, tare) ?? grossWeight;
    return { tare: null, errors: { weight: `El frasco lleno debe pesar más que su contenido (${formatGrams(content)}).` } };
  }
  return { tare, errors: {} };
}

/** Una ubicación del árbol de Core: cuelga de otra (`parentId`) o es una raíz del ámbito. */
export interface Place {
  id: string;
  name: string;
  parentId: string | null;
}

/** El árbol desde la lista de la API: una ubicación cuyo padre queda fuera del ámbito es una raíz. */
export function toPlaces(locations: readonly Location[]): Place[] {
  const ids = new Set(locations.map((entry) => entry.id));
  return locations.map((entry) => ({
    id: entry.id,
    name: entry.name,
    parentId: entry.parentId !== null && ids.has(entry.parentId) ? entry.parentId : null,
  }));
}

/** Hijas de una ubicación (`null`: las raíces). */
export const childrenOf = (places: readonly Place[], parentId: string | null): Place[] =>
  places.filter((place) => place.parentId === parentId);

/** Con una sola raíz que tiene hijas (la sede), se omite y el primer nivel son sus hijas. */
export function levelOneParent(places: readonly Place[]): string | null {
  const roots = childrenOf(places, null);
  const [root] = roots;
  return roots.length === 1 && root && childrenOf(places, root.id).length > 0 ? root.id : null;
}

/** La ubicación de primer nivel de la que cuelga otra (la que se recuerda como reciente). */
export function levelOneOf(places: readonly Place[], placeId: string): string {
  const root = levelOneParent(places);
  let current = places.find((place) => place.id === placeId);
  while (current && current.parentId !== root) {
    const parentId = current.parentId;
    current = places.find((place) => place.id === parentId);
  }
  return current?.id ?? placeId;
}

/** Los recientes primero, en su orden, y después el resto. */
export function recentFirst<T extends { id: string }>(items: readonly T[], recentIds: readonly string[]): T[] {
  const recent = recentIds.flatMap((id) => items.filter((item) => item.id === id));
  return [...recent, ...items.filter((item) => !recentIds.includes(item.id))];
}
