/** Los ids de un parámetro `?equipos=id1,id2`; sin parámetro (o vacío), `null`: todas las etiquetas. */
export function parseIds(param: string | null): string[] | null {
  const ids = param?.split(',').filter(Boolean) ?? [];
  return ids.length > 0 ? ids : null;
}

/** Las etiquetas elegidas al abrir la hoja: todas, o solo las preseleccionadas que existen. */
export function initialSelection(ids: readonly string[], preselected: readonly string[] | null): Set<string> {
  return new Set(ids.filter((id) => !preselected || preselected.includes(id)));
}
