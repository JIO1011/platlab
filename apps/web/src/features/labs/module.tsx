import { CalendarDays, CalendarRange, ClipboardList, FilePenLine, Inbox } from 'lucide-react';
import type { WebModule } from '../../app/web-module';

/** Las extensiones se descargan aparte, al mostrarse en Áreas (ver `extension-pages.ts`). */
const extensionPages = () => import('./extension-pages');

/** Lo que espera programarse: para el Administrador, su decisión; para quien pidió, la del laboratorio. */
const toScheduleText = (n: number) => (n === 1 ? '1 solicitud por programar' : `${n} solicitudes por programar`);

/**
 * Descriptor de Laboratorios en la web (ADR 0023); sus páginas y rutas están en `routes.tsx`. La tarjeta del Inicio
 * cuenta lo fuera de plazo y los bloques de la semana con «Falta» («Cierre de Laboratorios») o, para quien pide, lo suyo
 * que necesita su atención («Inicio de quien pide»).
 */
export const labsWebModule: WebModule = {
  code: 'labs',
  Icon: CalendarRange,
  sectionIcons: { cronograma: CalendarDays, solicitudes: FilePenLine, recibidas: Inbox, formatos: ClipboardList },
  home: {
    counters: [
      { key: 'late', label: () => 'fuera de plazo' },
      { key: 'short', label: (n) => (n === 1 ? 'bloque con «Falta» esta semana' : 'bloques con «Falta» esta semana') },
      // Solo quien pide: las suyas con cambios pedidos.
      { key: 'attention', label: (n) => (n === 1 ? 'necesita tu atención' : 'necesitan tu atención') },
    ],
    pending: { permission: 'labs.schedule.manage', approver: toScheduleText, requester: toScheduleText },
    trendNoun: { one: 'solicitud', many: 'solicitudes' },
    agenda: {
      practice: { noun: { one: 'práctica', many: 'prácticas' }, href: (_item, date) => `laboratorios/cronograma?dia=${date}` },
    },
    tasks: {
      // Cada práctica por cerrar abre el Cronograma en su día.
      toClose: {
        label: (n) => (n === 1 ? 'práctica por cerrar' : 'prácticas por cerrar'),
        href: 'laboratorios/cronograma',
        caseHref: ({ date }) => `laboratorios/cronograma${date ? `?dia=${date}` : ''}`,
        when: (day) => `Del ${day}`,
      },
      toReview: {
        label: (n) => (n === 1 ? 'solicitud por programar' : 'solicitudes por programar'),
        href: 'laboratorios/recibidas',
        caseHref: ({ ref }) => `laboratorios/recibidas/${ref}`,
        when: (day) => `Enviada el ${day}`,
      },
      changesRequested: {
        label: (n) => (n === 1 ? 'solicitud con cambios pedidos' : 'solicitudes con cambios pedidos'),
        href: 'laboratorios/solicitudes',
        caseHref: ({ ref }) => `laboratorios/solicitudes/${ref}`,
      },
    },
    quick: [{ label: 'Nueva solicitud', href: 'laboratorios/solicitudes', permission: 'labs.request.create', Icon: ClipboardList }],
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
