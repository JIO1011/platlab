// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { checkCas } from './cas';
import type { SdsKind } from './catalog-sample';

export type Step = 'product' | 'new' | 'bottles' | 'details' | 'done';

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
}

export const emptyDraft: Draft = { name: '', cas: '', unit: '', state: '', controlled: false, hazards: [], sds: '', sdsUrl: '' };

export type Selection = { kind: 'existing'; product: StockedProduct } | { kind: 'new' } | null;

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
  placeId: string;
  noExpiry: boolean;
  expiresOn: string;
  brand: string;
  supplierLot: string;
  area: string;
  weightOpen: boolean;
  fullWeight: string;
  density: string;
}

export const MAX_BOTTLES = 50;
const decimal = /^\d{1,15}(\.\d{1,9})?$/;

export const countOf = (text: string) => (/^\d{1,3}$/.test(text.trim()) ? Number(text.trim()) : null);
export const countValid = (count: number | null): count is number => count !== null && count >= 1 && count <= MAX_BOTTLES;

export type Errors = Partial<Record<'name' | 'unit' | 'state' | 'cas' | 'sdsUrl' | 'quantity' | 'count' | 'placeId' | 'weight', string>>;

export function validateNew(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.name.trim()) errors.name = 'Escribe el nombre del reactivo.';
  if (!draft.unit) errors.unit = 'Elige cómo se mide.';
  if (!draft.state) errors.state = 'Elige cómo es.';
  const cas = checkCas(draft.cas);
  if (cas === 'invalid' || cas === 'partial') errors.cas = 'Revisa el CAS: su dígito de control no coincide.';
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
export function sampleCode(name: string, index: number): string {
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
