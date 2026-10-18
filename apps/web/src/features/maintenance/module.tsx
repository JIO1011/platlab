import { CalendarClock, History, Wrench } from 'lucide-react';
import type { WebModule } from '../../app/web-module';

/** Las extensiones se descargan aparte, al mostrarse en Equipos (ver `extension-pages.ts`). */
const extensionPages = () => import('./extension-pages');

/** Descriptor de Mantenimiento en la web; sus páginas y rutas están en `routes.tsx`. */
export const maintenanceWebModule: WebModule = {
  code: 'maintenance',
  Icon: Wrench,
  sectionIcons: { historial: History, planes: CalendarClock },
  home: {
    counters: [
      { key: 'overdue', label: (n) => (n === 1 ? 'vencido' : 'vencidos') },
      { key: 'next30', label: () => 'en 30 días' },
    ],
    trendNoun: { one: 'registro', many: 'registros' },
  },
  // En Equipos, sin duplicar (ADR 0020): la pestaña de la ficha, la columna con semáforo y, en el incidente,
  // «Registrar en Mantenimiento» (M-01b).
  extensions: [
    {
      point: 'equipment.asset-tab',
      label: 'Mantenimiento',
      permission: 'maintenance.work.read',
      load: async () => (await extensionPages()).AssetMaintenanceTab,
    },
    {
      point: 'equipment.asset-next',
      label: 'Próximo mantenimiento',
      permission: 'maintenance.work.read',
      load: async () => (await extensionPages()).NextDueCell,
    },
    {
      point: 'equipment.fault-action',
      label: 'Registrar en Mantenimiento',
      permission: 'maintenance.work.record',
      load: async () => (await extensionPages()).RepairAction,
    },
  ],
};
