import type { Manifiesto, Toma } from "./tipos";
import manifiestoJson from "./manifiesto.json";

export { Telefono } from "./telefono";
export { Ventana } from "./ventana";
export type { Toma } from "./tipos";

const MANIFIESTO = manifiestoJson as unknown as Manifiesto;

/** La toma por su id; falla al compilar la página si la captura no existe. */
export function toma(id: string): Toma {
  const t = MANIFIESTO[id];
  if (!t) throw new Error(`Falta la captura «${id}». Ejecuta pnpm capturar.`);
  return t;
}
