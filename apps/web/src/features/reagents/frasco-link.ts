/**
 * Enlace corto de la etiqueta QR (ADR 0012, entrega 4): el espacio y el frasco (dos UUID, 32 bytes)
 * en base64url, 43 caracteres. Un enlace corto da un QR con módulos más grandes, que se lee mejor
 * impreso en 22 mm. No es un secreto: abrirlo exige sesión y pertenecer al espacio.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function frascoCode(workspaceId: string, containerId: string): string {
  const hex = `${workspaceId}${containerId}`.replace(/-/g, '');
  const bytes = hex.match(/../g)?.map((pair) => String.fromCharCode(Number.parseInt(pair, 16))) ?? [];
  return btoa(bytes.join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function readFrascoCode(code: string): { workspaceId: string; containerId: string } | null {
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
  const containerId = uuid(hex.slice(32, 64));
  return UUID.test(workspaceId) && UUID.test(containerId) ? { workspaceId, containerId } : null;
}
