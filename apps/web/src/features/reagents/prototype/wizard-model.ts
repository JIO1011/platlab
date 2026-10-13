// Prototipo R-01D: solo interfaz
import { normalizeDecimalInput } from '@platlab/ui';
import { checkCas } from './cas';
import type { SdsKind } from './catalog-sample';

/** Reactivo nuevo tal como se escribe en el asistente (nada de esto se guarda en el prototipo). */
export interface Draft {
  name: string;
  cas: string;
  unit: string;
  state: string;
  controlled: boolean;
  hazards: string[];
  sds: SdsKind | '';
  sdsUrl: string;
  /** Mínimo de existencias, en la unidad del reactivo. */
  min: string;
}

export const emptyDraft: Draft = { name: '', cas: '', unit: 'g', state: '', controlled: false, hazards: [], sds: '', sdsUrl: '', min: '' };

/** Ubicación con su ruta («Sede central › Almacén de reactivos»). */
export interface Place {
  id: string;
  name: string;
  route: string;
  /** Creada en el prototipo; no existe en el servidor. */
  local?: boolean;
}

/**
 * La API de ubicaciones de ingreso no devuelve el padre: en el prototipo, todo lo que no es una sede
 * cuelga de la sede de la lista (simulado).
 */
export function toPlaces(locations: Array<{ id: string; name: string; kind: string }>): Place[] {
  const site = locations.find((entry) => entry.kind === 'site');
  return locations.map((entry) => ({
    id: entry.id,
    name: entry.name,
    route: site && entry.id !== site.id ? `${site.name} › ${entry.name}` : entry.name,
  }));
}

export interface BottlesForm {
  quantity: string;
  count: string;
  /** Código de los frascos; `null` mientras se usa el sugerido. */
  code: string | null;
  placeId: string;
  /** Lo que se ve en el campo Ubicación (la ruta de la elegida o lo que se escribe). */
  placeText: string;
  noExpiry: boolean;
  expiresOn: string;
  brand: string;
  supplierLot: string;
  area: string;
  fullWeight: string;
  density: string;
}

export const MAX_BOTTLES = 50;
const decimal = /^\d{1,15}(\.\d{1,9})?$/;

export const countOf = (text: string) => (/^\d{1,3}$/.test(text.trim()) ? Number(text.trim()) : null);
export const countValid = (count: number | null): count is number => count !== null && count >= 1 && count <= MAX_BOTTLES;

export type Errors = Partial<Record<'name' | 'unit' | 'state' | 'cas' | 'sdsUrl' | 'min' | 'quantity' | 'count' | 'placeId' | 'weight', string>>;

export function validateNew(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.name.trim()) errors.name = 'Escribe el nombre del reactivo.';
  if (!draft.unit) errors.unit = 'Elige cómo se mide.';
  if (!draft.state) errors.state = 'Elige cómo es.';
  const cas = checkCas(draft.cas);
  if (cas === 'empty') errors.cas = 'Escribe el CAS, como 7647-14-5.';
  else if (cas === 'invalid' || cas === 'partial') errors.cas = 'Revisa el CAS: su dígito de control no coincide.';
  const min = normalizeDecimalInput(draft.min);
  if (min && (!decimal.test(min) || /^0+(\.0+)?$/.test(min))) errors.min = 'Escribe una cantidad mayor que cero, como 5 o 2,5.';
  if (draft.sds === 'digital' && draft.sdsUrl.trim() && !/^https?:\/\/\S+\.\S+/.test(draft.sdsUrl.trim())) {
    errors.sdsUrl = 'Escribe el enlace completo, por ejemplo https://….';
  }
  return errors;
}

export function validateBottles(form: BottlesForm, quantity: string, placeId: string): Errors {
  const errors: Errors = {};
  if (!quantity) errors.quantity = 'Escribe cuánto trae cada frasco.';
  else if (!decimal.test(quantity) || /^0+(\.0+)?$/.test(quantity)) errors.quantity = 'Escribe una cantidad mayor que cero, como 500 o 2,5.';
  if (!countValid(countOf(form.count))) errors.count = 'Entre 1 y 50 frascos.';
  if (!placeId) errors.placeId = 'Elige dónde los guardas.';
  return errors;
}

/** Código de muestra de un frasco (el real lo genera el servidor al guardar). */
function sampleCode(name: string, index: number): string {
  const prefix = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase();
  return `${prefix || 'REAC'}-${new Date().getFullYear()}-${String(index + 1).padStart(2, '0')}`;
}

export const sampleBrands = ['Merck', 'Sigma-Aldrich', 'Fisher Scientific', 'Honeywell'];
export const defaultAreas = ['Docencia', 'Investigación'];

/** Sin tildes y en minúsculas, para que «acido» encuentre «Ácido». */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Código sugerido para los frascos de un reactivo, sin el número de frasco («HEXA-2026»). */
export const suggestedCode = (name: string) => sampleCode(name, 0).slice(0, -3);

/** Código de un frasco: el código común y su número («HEXA-2026-03»). */
export const bottleCode = (base: string, index: number) => `${base.trim()}-${String(index + 1).padStart(2, '0')}`;
