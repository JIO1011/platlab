/**
 * Lo que Laboratorios pinta dentro de Áreas (ADR 0020), en su propio fragmento: la sección Áreas no descarga las
 * páginas del módulo. Aparte de `pages.ts` también por las fronteras: las páginas importan el shell, que importa el
 * registro de módulos, y el descriptor no puede volver a ellas.
 */
export { AreaLabMark } from './area-lab-mark';
export { AreaLabPanel } from './area-lab-panel';
export { HolidaysAction } from './holidays-action';
