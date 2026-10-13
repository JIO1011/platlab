/**
 * Lo que este navegador recuerda de un ingreso al siguiente: los reactivos y las ubicaciones usados
 * hace poco, para ofrecerlos primero. Marcas, áreas y ubicaciones vienen del servidor; esto solo
 * ordena. Sin almacenamiento (ventana privada, datos bloqueados), el ingreso funciona igual.
 */
export interface Recents {
  /** Últimos reactivos ingresados, el más reciente primero. */
  products: string[];
  /** Últimas ubicaciones de primer nivel usadas. */
  locations: string[];
}

const empty: Recents = { products: [], locations: [] };
const keyOf = (workspaceId: string) => `platlab:reactivos:ingreso:${workspaceId}`;

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

export function readRecents(workspaceId: string): Recents {
  try {
    const raw = window.localStorage.getItem(keyOf(workspaceId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== 'object' || parsed === null) return empty;
    const data = parsed as Partial<Record<keyof Recents, unknown>>;
    return { products: strings(data.products), locations: strings(data.locations) };
  } catch {
    return empty;
  }
}

/** Pone al frente lo usado en este ingreso, sin repetir y con un tope. */
export function rememberRecents(workspaceId: string, used: { productId: string; locationId: string }): void {
  const previous = readRecents(workspaceId);
  const push = (list: string[], item: string, max: number) => [item, ...list.filter((entry) => entry !== item)].slice(0, max);
  try {
    window.localStorage.setItem(
      keyOf(workspaceId),
      JSON.stringify({ products: push(previous.products, used.productId, 5), locations: push(previous.locations, used.locationId, 3) }),
    );
  } catch {
    // Sin almacenamiento no se recuerda nada; no es un error para quien ingresa.
  }
}
