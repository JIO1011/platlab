import { CalendarClock, ClipboardList, Wrench } from 'lucide-react';
import type { WebModule } from '../../app/web-module';

/** Las extensiones se descargan aparte, al mostrarse en Equipos (ver `extension-pages.ts`). */
const extensionPages = () => import('./extension-pages');

/** Descriptor de Mantenimiento en la web; sus páginas y rutas están en `routes.tsx`. */
export const maintenanceWebModule: WebModule = {
  code: 'maintenance',
  Icon: Wrench,
  sectionIcons: { trabajos: ClipboardList, planes: CalendarClock },
  home: {
    counters: [
      { key: 'overdue', label: (n) => (n === 1 ? 'vencido' : 'vencidos') },
      { key: 'next30', label: () => 'en 30 días' },
    ],
    trendNoun: { one: 'registro', many: 'registros' },
  },
  // En Equipos, sin duplicar (ADR 0020): la pestaña de la ficha y la columna con semáforo.
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
  ],
};
