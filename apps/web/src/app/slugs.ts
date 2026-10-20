/** De código de la API a palabra de la URL (`good` → `bueno`) y de vuelta: la tabla invertida, para leer la URL. */
export const invertSlugs = <T extends string>(slugs: Record<T, string>): Record<string, T> =>
  Object.fromEntries(Object.entries(slugs).map(([code, slug]) => [slug, code])) as Record<string, T>;
