import { fold } from '../../app/fold';

/** El largo máximo de una clave del Formato (`formField`). */
const KEY_MAX = 40;

/**
 * La clave de un campo a partir de su etiqueta: minúsculas, sin tildes y con «_» entre palabras, y que empiece por una
 * letra («¿Número de grupo?» → «numero_de_grupo»). Sin letras ni cifras, «campo».
 */
export function fieldKey(label: string): string {
  const slug = fold(label)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, KEY_MAX)
    .replace(/_+$/, '');
  if (slug === '') return 'campo';
  return /^[a-z]/.test(slug) ? slug : `campo_${slug}`.slice(0, KEY_MAX);
}

/**
 * Las claves de una lista de campos, en su orden. Los que ya tienen clave (los publicados) la conservan: las solicitudes
 * guardan sus respuestas con ella. Los nuevos derivan la suya de la etiqueta y, si ya existe o es una de `reserved` (las
 * de los datos del sistema, que el contrato no admite en un dato libre), añaden «_2», «_3»…
 */
export function assignKeys(fields: ReadonlyArray<{ label: string; key?: string | undefined }>, reserved: readonly string[] = []): string[] {
  const taken = new Set([...reserved, ...fields.flatMap((field) => (field.key ? [field.key] : []))]);
  return fields.map((field) => {
    if (field.key) return field.key;
    const base = fieldKey(field.label);
    let key = base;
    for (let n = 2; taken.has(key); n += 1) {
      const suffix = `_${n}`;
      key = `${base.slice(0, KEY_MAX - suffix.length)}${suffix}`;
    }
    taken.add(key);
    return key;
  });
}
