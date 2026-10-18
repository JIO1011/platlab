/**
 * Puntos de extensión de Equipos (ADR 0020): otro módulo los llena sin que Equipos lo importe. La ficha
 * suma una pestaña por aporte; la tabla de equipos (Inventario e Informe), una columna; y la hoja de un
 * incidente por atender, una acción.
 */
declare module '../../app/web-module' {
  interface ExtensionPoints {
    /** Una pestaña de la ficha del equipo. */
    'equipment.asset-tab': { assetId: string };
    /** Una celda por fila de la tabla de equipos; `assetIds` son las filas visibles, para pedirlas juntas. */
    'equipment.asset-next': { assetId: string; assetIds: string[] };
    /** Una acción de la hoja de un incidente reportado o en reparación, para quien lo atiende. */
    'equipment.fault-action': { faultId: string; assetId: string };
  }
}

export const ASSET_TAB = 'equipment.asset-tab';
export const ASSET_NEXT = 'equipment.asset-next';
export const FAULT_ACTION = 'equipment.fault-action';
