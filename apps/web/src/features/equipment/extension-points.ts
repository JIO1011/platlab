/**
 * Puntos de extensión de Equipos (ADR 0020): otro módulo los llena sin que Equipos lo importe. La ficha
 * suma una pestaña por aporte y la tabla de equipos (Inventario e Informe), una columna.
 */
declare module '../../app/web-module' {
  interface ExtensionPoints {
    /** Una pestaña de la ficha del equipo. */
    'equipment.asset-tab': { assetId: string };
    /** Una celda por fila de la tabla de equipos; `assetIds` son las filas visibles, para pedirlas juntas. */
    'equipment.asset-next': { assetId: string; assetIds: string[] };
  }
}

export const ASSET_TAB = 'equipment.asset-tab';
export const ASSET_NEXT = 'equipment.asset-next';
