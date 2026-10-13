// Prototipo R-01D: solo interfaz

/** Lo que el navegador recuerda de un ingreso al siguiente (rapidez al ingresar varios reactivos). */
export interface Remembered {
  /** Últimos reactivos elegidos, el más reciente primero (hasta 5). */
  recentProducts: string[];
  /** Últimas ubicaciones usadas (hasta 3). */
  recentLocations: string[];
  /** Marcas ya escritas, para sugerirlas. */
  brands: string[];
  area: string;
  extraAreas: string[];
}

const empty: Remembered = { recentProducts: [], recentLocations: [], brands: [], area: '', extraAreas: [] };
const keyOf = (workspaceId: string) => `platlab:r01d:ingreso:v2:${workspaceId}`;

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

/** Sin almacenamiento (ventana privada, datos bloqueados), el asistente funciona igual, sin recordar. */
export function readRemembered(workspaceId: string): Remembered {
  try {
    const raw = window.localStorage.getItem(keyOf(workspaceId));
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return empty;
    const data = parsed as Partial<Record<keyof Remembered, unknown>>;
    return {
      recentProducts: strings(data.recentProducts),
      recentLocations: strings(data.recentLocations),
      brands: strings(data.brands),
      area: typeof data.area === 'string' ? data.area : '',
      extraAreas: strings(data.extraAreas),
    };
  } catch {
    return empty;
  }
}

export function writeRemembered(workspaceId: string, value: Remembered): void {
  try {
    window.localStorage.setItem(keyOf(workspaceId), JSON.stringify(value));
  } catch {
    // Sin almacenamiento no se recuerda nada; no es un error para quien ingresa.
  }
}

/** Pone `item` al frente de la lista, sin repetirlo y con un tope. */
export const pushRecent = (list: string[], item: string, max: number): string[] => [item, ...list.filter((entry) => entry !== item)].slice(0, max);
