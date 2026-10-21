/**
 * Puntos de extensión de Áreas (ADR 0020, ADR 0024): otro módulo los llena sin que Áreas lo importe. La hoja de un
 * área suma un panel por aporte, con el texto del aporte como título; el cuadro del área, una marca; y la cabecera
 * de la sección, una acción.
 */
declare module '../../app/web-module' {
  interface ExtensionPoints {
    /** Un panel de la hoja del área. */
    'areas.area-panel': { areaId: string; areaName: string };
    /** Una marca pequeña en el cuadro del área, bajo su encargado. */
    'areas.area-mark': { areaId: string };
    /** Una acción en la cabecera de Áreas, junto al selector de vista; abre lo suyo. */
    'areas.header-action': Record<string, never>;
  }
}

export const AREA_PANEL = 'areas.area-panel';
export const AREA_MARK = 'areas.area-mark';
export const HEADER_ACTION = 'areas.header-action';
