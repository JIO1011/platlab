import { useCodeSuggestion, useProductSearch } from '../queries';
import { useDebouncedValue } from '../use-media-query';
import { countOf, countValid, seriesOf } from './model';
import type { IngressEntry } from './use-ingress-entry';

/** Lo más largo que busca el servidor; un nombre más largo se busca por su principio. */
const MAX_SEARCH = 100;
const MIN_SEARCH = 2;

/**
 * Lo que el ingreso consulta al servidor a partir del nombre: la serie de códigos libre (la del reactivo
 * elegido o una nueva a partir del nombre) y los reactivos del catálogo que se llaman parecido. El buscador
 * usa lo escrito con espera breve; «Crear» espera a la respuesta de lo escrito, para no ofrecerlo mientras
 * llega un reactivo que ya se llama así.
 */
export function useIngressLookup(workspaceId: string, open: boolean, { existing, form, name }: Pick<IngressEntry, 'existing' | 'form' | 'name'>) {
  const count = countOf(form.count);
  const typedName = useDebouncedValue(name, 300);
  const suggestion = useCodeSuggestion(
    workspaceId,
    existing ? { productId: existing.id } : typedName ? { name: typedName } : null,
    countValid(count) ? count : 1,
    open && form.code === null,
  );
  const code = form.code ?? (name ? (suggestion.data?.codes[0] ?? '') : '');
  const typing = existing ? '' : name.slice(0, MAX_SEARCH);
  const term = existing ? '' : typedName.slice(0, MAX_SEARCH);
  const search = useProductSearch(workspaceId, term, open);
  return {
    count,
    code,
    codes: seriesOf(code, count),
    suggestion,
    results: typing.length >= MIN_SEARCH ? (search.data?.items ?? []) : null,
    searched: typing.length < MIN_SEARCH || (term === typing && (search.isError || (search.isSuccess && !search.isPlaceholderData))),
  };
}

export type IngressLookup = ReturnType<typeof useIngressLookup>;
