// Prototipo R-01D: solo interfaz

/** Lo que el navegador recuerda de un ingreso al siguiente (rapidez al ingresar varios reactivos). */
export interface Remembered {
  locationId: string;
  brand: string;
  costCenter: string;
  /** Opciones de centro de costo añadidas por la persona. */
  extraCenters: string[];
}

const empty: Remembered = { locationId: '', brand: '', costCenter: '', extraCenters: [] };
const keyOf = (workspaceId: string) => `platlab:r01d:ingreso:${workspaceId}`;

/** Sin almacenamiento (ventana privada, datos bloqueados), la ventana funciona igual, sin recordar. */
export function readRemembered(workspaceId: string): Remembered {
  try {
    const raw = window.localStorage.getItem(keyOf(workspaceId));
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return empty;
    const data = parsed as Partial<Record<keyof Remembered, unknown>>;
    return {
      locationId: typeof data.locationId === 'string' ? data.locationId : '',
      brand: typeof data.brand === 'string' ? data.brand : '',
      costCenter: typeof data.costCenter === 'string' ? data.costCenter : '',
      extraCenters: Array.isArray(data.extraCenters) ? data.extraCenters.filter((item): item is string => typeof item === 'string') : [],
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
