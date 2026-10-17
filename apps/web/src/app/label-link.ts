/**
 * Enlace corto de las etiquetas QR (ADR 0012, entrega 4; ADR 0019, E-01d): el espacio y lo etiquetado
 * (dos UUID, 32 bytes) en base64url, 43 caracteres, tras el prefijo de su tipo: `/q/` el frasco y `/q/e/`
 * el equipo. Un enlace corto da un QR con módulos más grandes, que se lee mejor impreso en 22 mm. No es un
 * secreto: abrirlo exige sesión y pertenecer al espacio.
 */
type LabelKind = 'frasco' | 'equipo';

const prefixes: Record<LabelKind, string> = { frasco: '/q/', equipo: '/q/e/' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function labelCode(workspaceId: string, id: string): string {
  const hex = `${workspaceId}${id}`.replace(/-/g, '');
  const bytes = hex.match(/../g)?.map((pair) => String.fromCharCode(Number.parseInt(pair, 16))) ?? [];
  return btoa(bytes.join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** El espacio y lo etiquetado del código de 43 caracteres, o `null` si no es uno de PlatLab. */
export function readLabelCode(code: string): { workspaceId: string; id: string } | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) return null;
  let binary: string;
  try {
    binary = atob(code.replace(/-/g, '+').replace(/_/g, '/') + '=');
  } catch {
    return null;
  }
  const hex = [...binary].map((char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const uuid = (part: string) => `${part.slice(0, 8)}-${part.slice(8, 12)}-${part.slice(12, 16)}-${part.slice(16, 20)}-${part.slice(20)}`;
  const workspaceId = uuid(hex.slice(0, 32));
  const id = uuid(hex.slice(32, 64));
  return UUID.test(workspaceId) && UUID.test(id) ? { workspaceId, id } : null;
}

/** La ruta de la app de una etiqueta (`/q/…` o `/q/e/…`). */
export function labelPath(kind: LabelKind, workspaceId: string, id: string): string {
  return `${prefixes[kind]}${labelCode(workspaceId, id)}`;
}

/** El enlace completo que lleva el QR de la etiqueta. */
export function labelUrl(kind: LabelKind, workspaceId: string, id: string): string {
  return `${window.location.origin}${labelPath(kind, workspaceId, id)}`;
}

export interface LabelLink {
  kind: LabelKind;
  workspaceId: string;
  id: string;
  /** La ruta de la app a la que lleva. */
  path: string;
}

/**
 * Lo que dice el QR de una etiqueta, leído con la cámara: su tipo, su espacio y lo etiquetado, o `null` si el
 * texto no es una etiqueta de PlatLab. Solo mira la ruta, no el dominio: la etiqueta puede venir de otro
 * entorno y abrirla exige igualmente sesión y pertenecer al espacio.
 */
export function readLabelLink(text: string): LabelLink | null {
  let path: string;
  try {
    path = new URL(text.trim(), 'http://localhost').pathname;
  } catch {
    return null;
  }
  const match = /^\/q\/(e\/)?([A-Za-z0-9_-]{43})\/?$/.exec(path);
  const target = match?.[2] ? readLabelCode(match[2]) : null;
  if (!match || !target) return null;
  const kind: LabelKind = match[1] ? 'equipo' : 'frasco';
  return { kind, ...target, path: labelPath(kind, target.workspaceId, target.id) };
}
