// Prototipo R-01D: solo interfaz
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
}

export const emptyDraft: Draft = { name: '', cas: '', unit: 'g', state: '', controlled: false, hazards: [], sds: '', sdsUrl: '' };

/** Una ubicación del árbol: cuelga de otra (`parentId`) o es una raíz (sede). */
export interface Place {
  id: string;
  name: string;
  parentId: string | null;
  /** Creada o simulada en el prototipo; no existe en el servidor. */
  local?: boolean;
}

/** Subniveles simulados por tipo de ubicación (la API de ingreso solo devuelve el primer nivel). */
const simulatedLevel2: Record<string, string[]> = {
  room: ['Armario de ácidos', 'Armario de bases', 'Refrigerador'],
  storage: ['Estante A', 'Estante B', 'Cámara fría'],
};
const simulatedLevel3 = ['Nivel 1', 'Nivel 2', 'Nivel 3'];

/**
 * La API de ubicaciones de ingreso no devuelve el padre: en el prototipo, todo lo que no es una sede
 * cuelga de la sede de la lista, y cada ubicación de primer nivel recibe subniveles de ejemplo
 * (armarios, estantes, niveles) para que la demo tenga profundidad. Todo lo simulado lleva `local`.
 */
export function toPlaces(locations: Array<{ id: string; name: string; kind: string }>): Place[] {
  const site = locations.find((entry) => entry.kind === 'site');
  const real: Place[] = locations.map((entry) => ({ id: entry.id, name: entry.name, parentId: site && entry.id !== site.id ? site.id : null }));
  const simulated = locations.flatMap((entry) => {
    if (entry.kind === 'site') return [];
    const level2 = (simulatedLevel2[entry.kind] ?? ['Estante 1', 'Estante 2']).map((name, index) => ({ id: `sim-${entry.id}-${index}`, name, parentId: entry.id, local: true }));
    const level3 = level2.flatMap((parent) => simulatedLevel3.map((name, index) => ({ id: `${parent.id}-${index}`, name, parentId: parent.id, local: true })));
    return [...level2, ...level3];
  });
  return [...real, ...simulated];
}

/** Hijas de una ubicación (`null`: las raíces). */
export const childrenOf = (places: Place[], parentId: string | null): Place[] => places.filter((place) => place.parentId === parentId);

/** Con una sola raíz (la sede) se omite y el primer nivel son sus hijas. */
export function levelOneParent(places: Place[]): string | null {
  const roots = childrenOf(places, null);
  return roots.length === 1 && roots[0] ? roots[0].id : null;
}

export interface BottlesForm {
  quantity: string;
  count: string;
  /** Código de los frascos; `null` mientras se usa el sugerido. */
  code: string | null;
  /** La ubicación más profunda elegida. */
  placeId: string;
  noExpiry: boolean;
  expiresOn: string;
  brand: string;
  area: string;
  fullWeight: string;
  density: string;
}

export const MAX_BOTTLES = 50;
const decimal = /^\d{1,15}(\.\d{1,9})?$/;

export const countOf = (text: string) => (/^\d{1,3}$/.test(text.trim()) ? Number(text.trim()) : null);
export const countValid = (count: number | null): count is number => count !== null && count >= 1 && count <= MAX_BOTTLES;

export type Errors = Partial<Record<'name' | 'unit' | 'state' | 'cas' | 'sdsUrl' | 'quantity' | 'count' | 'placeId' | 'weight' | 'code', string>>;

/** El CAS es obligatorio salvo en una mezcla, que no tiene uno propio. */
export const casOptional = (draft: Draft) => draft.state === 'mixture';

export function validateNew(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.name.trim()) errors.name = 'Escribe el nombre del reactivo.';
  if (!draft.unit) errors.unit = 'Elige cómo se mide.';
  if (!draft.state) errors.state = 'Elige cómo es.';
  const cas = checkCas(draft.cas);
  if (cas === 'empty') {
    if (!casOptional(draft)) errors.cas = 'Escribe el CAS, como 7647-14-5.';
  } else if (cas === 'invalid' || cas === 'partial') errors.cas = 'Revisa el CAS: su dígito de control no coincide.';
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

export const sampleBrands = ['Merck', 'Sigma-Aldrich', 'Fisher Scientific', 'Honeywell'];
export const defaultAreas = ['Docencia', 'Investigación'];

/** Sin tildes y en minúsculas, para que «acido» encuentre «Ácido». */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Código sugerido de un reactivo nuevo: 3 letras del nombre, en mayúsculas y sin tildes, y «-001». */
export function newProductCode(name: string): string {
  const letters = fold(name).replace(/[^a-z]/g, '').slice(0, 3).toUpperCase();
  return letters ? `${letters}-001` : '';
}

/** Un código partido en lo que se repite y el número que crece. */
interface Series {
  prefix: string;
  start: bigint;
  width: number;
}

/** «LAB-007»: prefijo «LAB-», empieza en 7 con 3 cifras. Si no termina en número, cada frasco lleva «-1», «-2»… */
function seriesOf(code: string): Series {
  const match = /^(.*?)(\d+)$/.exec(code);
  return match ? { prefix: match[1] ?? '', start: BigInt(match[2] ?? '0'), width: (match[2] ?? '').length } : { prefix: `${code}-`, start: 1n, width: 1 };
}
const codeAt = (series: Series, index: number) => `${series.prefix}${String(series.start + BigInt(index)).padStart(series.width, '0')}`;

/** Códigos de los frascos a partir del escrito: `LAB-7` da `LAB-7`, `LAB-8`, `LAB-9`. Un solo frasco lleva el código tal cual. */
export function bottleCodes(code: string, count: number): string[] {
  const text = code.trim();
  if (text === '' || count < 1) return [];
  if (count === 1) return [text];
  const series = seriesOf(text);
  return Array.from({ length: count }, (_, index) => codeAt(series, index));
}

/** Número final del último frasco («004»), para mostrarlo en el campo con más de un frasco. */
export function lastSuffix(code: string, count: number): string | null {
  if (count < 2) return null;
  return /(\d+)$/.exec(bottleCodes(code, count).at(-1) ?? '')?.[1] ?? null;
}

/**
 * Siguiente código de un reactivo que ya tiene frascos: el último grupo numérico del código más
 * alto, más uno y con los mismos ceros (`AC-BIO-001` da `AC-BIO-002`; `HCL-2026-01-02`, `HCL-2026-01-03`).
 * `null` si ningún código termina en número.
 */
export function nextCode(codes: string[]): string | null {
  let best: { prefix: string; digits: string; suffix: string } | null = null;
  for (const code of codes) {
    const match = /^(.*?)(\d+)(\D*)$/.exec(code.trim());
    if (!match) continue;
    const found = { prefix: match[1] ?? '', digits: match[2] ?? '', suffix: match[3] ?? '' };
    if (!best || BigInt(found.digits) > BigInt(best.digits)) best = found;
  }
  if (!best) return null;
  return `${best.prefix}${String(BigInt(best.digits) + 1n).padStart(best.digits.length, '0')}${best.suffix}`;
}

/** Los códigos que ya existen, en la forma en que se comparan (sin tildes ni mayúsculas). */
export const takenSet = (codes: string[]): Set<string> => new Set(codes.map((code) => fold(code.trim())));

/** Si algún frasco de la serie choca con un código existente, el primer código libre desde ahí; si no, `null`. */
export function freeCodeIfTaken(code: string, count: number, taken: Set<string>): string | null {
  const text = code.trim();
  const clashes = (candidate: string) => bottleCodes(candidate, count).some((entry) => taken.has(fold(entry)));
  if (text === '' || !clashes(text)) return null;
  const series = seriesOf(text);
  const plain = !/\d$/.test(text);
  for (let shift = 1; shift <= 1000; shift += 1) {
    const candidate = plain ? `${text}-${shift}` : codeAt(series, shift);
    if (!clashes(candidate)) return candidate;
  }
  return null;
}
