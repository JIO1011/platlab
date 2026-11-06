import { CalendarDays, CalendarRange, ClipboardList, FilePenLine, Inbox } from 'lucide-react';
import type { WebModule } from '../../app/web-module';

/** Las extensiones se descargan aparte, al mostrarse en Áreas (ver `extension-pages.ts`). */
const extensionPages = () => import('./extension-pages');

/** Lo que espera programarse: para el Administrador, su decisión; para quien pidió, la del laboratorio. */
const toScheduleText = (n: number) => (n === 1 ? '1 solicitud por programar' : `${n} solicitudes por programar`);

/**
 * Descriptor de Laboratorios en la web (ADR 0023); sus páginas y rutas están en `routes.tsx`. La tarjeta del Inicio
 * cuenta lo fuera de plazo y los bloques de la semana con «Falta» («Cierre de Laboratorios»).
 */
export const labsWebModule: WebModule = {
  code: 'labs',
  Icon: CalendarRange,
  sectionIcons: { cronograma: CalendarDays, solicitudes: FilePenLine, recibidas: Inbox, formatos: ClipboardList },
  home: {
    counters: [
      { key: 'late', label: () => 'fuera de plazo' },
      { key: 'short', label: (n) => (n === 1 ? 'bloque con «Falta» esta semana' : 'bloques con «Falta» esta semana') },
    ],
    pending: { permission: 'labs.schedule.manage', approver: toScheduleText, requester: toScheduleText },
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
    {
      point: 'equipment.asset-tab',
      label: 'Reservas',
      permission: 'labs.request.view',
      load: async () => (await extensionPages()).AssetBookingsTab,
    },
    {
      point: 'equipment.fault-context',
      label: 'Práctica del incidente',
      permission: 'labs.request.view',
      load: async () => (await extensionPages()).FaultPractice,
    },
  ],
};
