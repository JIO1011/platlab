import type { TimelineSource } from '../../app/timeline';

/**
 * Puntos de extensión de Equipos (ADR 0020): otro módulo los llena sin que Equipos lo importe. La ficha
 * suma una pestaña por aporte y una línea de estado en su cabecera; la tabla de equipos (Inventario e
 * Informe), una columna; la hoja de un incidente por atender, una acción; y la línea de tiempo de la ficha
 * y de la hoja de vida, los hechos del módulo (M-01d).
 */
declare module '../../app/web-module' {
  interface ExtensionPoints {
    /** Una pestaña de la ficha del equipo. */
    'equipment.asset-tab': { assetId: string };
    /** Una celda por fila de la tabla de equipos; `assetIds` son las filas visibles, para pedirlas juntas. */
    'equipment.asset-next': { assetId: string; assetIds: string[] };
    /** Una acción de la hoja de un incidente reportado o en reparación, para quien lo atiende. */
    'equipment.fault-action': { faultId: string; assetId: string };
    /** Una línea de estado en la cabecera de la ficha, bajo el estado del equipo (M-01d: la calibración). */
    'equipment.asset-status': { assetId: string };
    /**
     * Los hechos de un módulo para la línea de tiempo del equipo (M-01d): el componente no pinta nada; entrega
     * sus hechos con `onChange` y Equipos los ordena con los suyos. `onChange` es estable.
     */
    'equipment.asset-events': { assetId: string; onChange: (source: TimelineSource) => void };
  }
}

export const ASSET_TAB = 'equipment.asset-tab';
export const ASSET_NEXT = 'equipment.asset-next';
export const FAULT_ACTION = 'equipment.fault-action';
export const ASSET_STATUS = 'equipment.asset-status';
export const ASSET_EVENTS = 'equipment.asset-events';
