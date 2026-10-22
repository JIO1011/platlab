import { CalendarRange, ClipboardList, FilePenLine, Inbox } from 'lucide-react';
import type { WebModule } from '../../app/web-module';

/** Las extensiones se descargan aparte, al mostrarse en Áreas (ver `extension-pages.ts`). */
const extensionPages = () => import('./extension-pages');

/**
 * Descriptor de Laboratorios en la web (ADR 0023); sus páginas y rutas están en `routes.tsx`. Hasta L-01b no hay
 * solicitudes que contar: la tarjeta del Inicio no lleva cifras.
 */
export const labsWebModule: WebModule = {
  code: 'labs',
  Icon: CalendarRange,
  sectionIcons: { solicitudes: FilePenLine, recibidas: Inbox, formatos: ClipboardList },
  home: {
    counters: [],
    trendNoun: { one: 'solicitud', many: 'solicitudes' },
  },
  // En Áreas, sin sección propia (ADR 0023): el panel del área con su aforo, horario y cierres, la marca en su cuadro y
  // los feriados en la cabecera.
  extensions: [
    {
      point: 'areas.area-panel',
      label: 'Laboratorio',
      permission: 'labs.read',
      load: async () => (await extensionPages()).AreaLabPanel,
    },
    {
      point: 'areas.area-mark',
      label: 'Habilitada para prácticas',
      permission: 'labs.read',
      load: async () => (await extensionPages()).AreaLabMark,
    },
    {
      point: 'areas.header-action',
      label: 'Feriados',
      permission: 'labs.space.manage',
      load: async () => (await extensionPages()).HolidaysAction,
    },
  ],
};
