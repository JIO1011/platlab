/**
 * Qué etiquetas del área se imprimen (ADR 0019, E-01d). Se elige un tipo entero (con sus unidades excluidas) o
 * unidades sueltas; todo es inmutable y puro, así la pantalla y la página de etiquetas cuentan lo mismo.
 */
export interface LabelSelection {
  /** Los tipos elegidos, cada uno con las ids de sus unidades excluidas. */
  types: ReadonlyMap<string, ReadonlySet<string>>;
  /** Las unidades sueltas, de un tipo no elegido, con el id de su tipo. */
  units: ReadonlyMap<string, string>;
}

/** Una unidad para elegir: su id y el de su tipo. */
export interface PickUnit {
  id: string;
  typeId: string;
}

export const noSelection: LabelSelection = { types: new Map(), units: new Map() };

/** Está elegida si está suelta, o si su tipo está elegido y ella no está excluida. */
export function isUnitPicked(selection: LabelSelection, unit: PickUnit): boolean {
  const excluded = selection.types.get(unit.typeId);
  return selection.units.has(unit.id) || (excluded !== undefined && !excluded.has(unit.id));
}

/** Elige los tipos enteros: absorben sus unidades sueltas y olvidan sus exclusiones. */
export function pickTypes(selection: LabelSelection, typeIds: readonly string[]): LabelSelection {
  const types = new Map(selection.types);
  for (const typeId of typeIds) types.set(typeId, new Set());
  return { types, units: withoutTypes(selection.units, typeIds) };
}

/** Quita los tipos de la elección, con sus unidades sueltas. */
export function dropTypes(selection: LabelSelection, typeIds: readonly string[]): LabelSelection {
  const types = new Map(selection.types);
  for (const typeId of typeIds) types.delete(typeId);
  return { types, units: withoutTypes(selection.units, typeIds) };
}

function withoutTypes(units: ReadonlyMap<string, string>, typeIds: readonly string[]): Map<string, string> {
  return new Map([...units].filter(([, typeId]) => !typeIds.includes(typeId)));
}

/** Elige las unidades: en un tipo elegido dejan de estar excluidas; en otro, quedan sueltas. */
export function pickUnits(selection: LabelSelection, picked: readonly PickUnit[]): LabelSelection {
  const types = new Map(selection.types);
  const units = new Map(selection.units);
  for (const { id, typeId } of picked) {
    const excluded = types.get(typeId);
    if (excluded) types.set(typeId, new Set([...excluded].filter((entry) => entry !== id)));
    else units.set(id, typeId);
  }
  return { types, units };
}

/** Quita las unidades: en un tipo elegido quedan excluidas; en otro, dejan de estar sueltas. */
export function dropUnits(selection: LabelSelection, dropped: readonly PickUnit[]): LabelSelection {
  const types = new Map(selection.types);
  const units = new Map(selection.units);
  for (const { id, typeId } of dropped) {
    const excluded = types.get(typeId);
    if (excluded) types.set(typeId, new Set(excluded).add(id));
    else units.delete(id);
  }
  return { types, units };
}

/** Tocar una unidad: la elige o la quita según esté. */
export const toggleUnit = (selection: LabelSelection, unit: PickUnit): LabelSelection =>
  isUnitPicked(selection, unit) ? dropUnits(selection, [unit]) : pickUnits(selection, [unit]);

/** Cuántas unidades de un tipo (de las `total` que tiene con el filtro actual) se eligen. */
export function typePicked(selection: LabelSelection, typeId: string, total: number): number {
  const excluded = selection.types.get(typeId);
  if (excluded) return total - excluded.size;
  return [...selection.units.values()].filter((entry) => entry === typeId).length;
}

/** Tocar un tipo: si ya está entero, lo quita; si no (o a medias), lo elige entero. */
export const toggleType = (selection: LabelSelection, typeId: string, total: number): LabelSelection =>
  typePicked(selection, typeId, total) === total ? dropTypes(selection, [typeId]) : pickTypes(selection, [typeId]);

/** Cuántas etiquetas salen: por tipo, sus `totalOf` unidades menos las excluidas, más las sueltas. */
export function selectionCount(selection: LabelSelection, totalOf: (typeId: string) => number): number {
  let count = selection.units.size;
  for (const [typeId, excluded] of selection.types) count += totalOf(typeId) - excluded.size;
  return count;
}

/** La elección en la URL de la página de etiquetas: `tipos`, `excluir` (unidades) y `equipos` (sueltas). */
export function selectionSearch(selection: LabelSelection): URLSearchParams {
  const search = new URLSearchParams();
  const types = [...selection.types.keys()];
  const excluded = [...selection.types.values()].flatMap((ids) => [...ids]);
  const units = [...selection.units.keys()];
  if (types.length > 0) search.set('tipos', types.join(','));
  if (excluded.length > 0) search.set('excluir', excluded.join(','));
  if (units.length > 0) search.set('equipos', units.join(','));
  return search;
}

const idsOf = (search: URLSearchParams, name: string) => new Set(search.get(name)?.split(',').filter(Boolean));

/** Lo que dice la URL sobre cuáles salen: `null` sin elección (todas las del área); si no, si cada equipo cumple. */
export function pickedBySearch(search: URLSearchParams): ((asset: { id: string; type: { id: string } }) => boolean) | null {
  const types = idsOf(search, 'tipos');
  const excluded = idsOf(search, 'excluir');
  const units = idsOf(search, 'equipos');
  if (types.size === 0 && units.size === 0) return null;
  return (asset) => units.has(asset.id) || (types.has(asset.type.id) && !excluded.has(asset.id));
}
