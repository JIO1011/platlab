import { readFrascoCode } from '../frasco-link';

/**
 * Lo que el QR de una etiqueta contiene es su enlace corto: `…/q/` más el código de 43 caracteres
 * (ADR 0012). Devuelve la ruta de la app a la que llevar (`/q/<código>`) o `null` si el texto no es
 * una etiqueta de PlatLab. Solo mira la ruta, no el dominio: la etiqueta puede venir de otro entorno
 * y abrirla exige igualmente sesión y pertenecer al espacio.
 */
export function readLabelLink(text: string): string | null {
  let path: string;
  try {
    path = new URL(text.trim(), 'http://localhost').pathname;
  } catch {
    return null;
  }
  const code = /^\/q\/([A-Za-z0-9_-]{43})\/?$/.exec(path)?.[1];
  return code && readFrascoCode(code) ? `/q/${code}` : null;
}
