import type { WorkspaceMeResponse } from '@platlab/contracts';

/**
 * La ficha de un equipo en Equipos, con una pestaña (`?pestana=`); null si la persona no ve el inventario:
 * entonces el código y el nombre se muestran sin enlace.
 */
export function assetFichaPath(me: WorkspaceMeResponse, workspaceId: string, assetId: string, tab = 'mantenimiento'): string | null {
  const equipment = me.modules.find((entry) => entry.code === 'equipment');
  if (!equipment || !me.permissions.includes('equipment.catalog.read')) return null;
  return `/e/${workspaceId}/${equipment.nav[0]?.path ?? 'equipos'}/inventario/${assetId}?pestana=${tab}`;
}

/** El incidente de Equipos abierto en su lista (`?falla=`); null si la persona no puede ver incidentes. */
export function faultPath(me: WorkspaceMeResponse, workspaceId: string, faultId: string): string | null {
  const equipment = me.modules.find((entry) => entry.code === 'equipment');
  if (!equipment || !me.permissions.includes('equipment.fault.report')) return null;
  return `/e/${workspaceId}/${equipment.nav[0]?.path ?? 'equipos'}/incidentes?falla=${faultId}`;
}
