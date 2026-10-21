import { CalendarRange, ClipboardList, DoorOpen } from 'lucide-react';
import type { WebModule } from '../../app/web-module';

/**
 * Descriptor de Laboratorios en la web (ADR 0023); sus páginas y rutas están en `routes.tsx`. Hasta L-01b no hay
 * solicitudes que contar: la tarjeta del Inicio no lleva cifras.
 */
export const labsWebModule: WebModule = {
  code: 'labs',
  Icon: CalendarRange,
  sectionIcons: { espacios: DoorOpen, formato: ClipboardList },
  home: {
    counters: [],
    trendNoun: { one: 'solicitud', many: 'solicitudes' },
  },
};
