import { List, Microscope, TriangleAlert } from 'lucide-react';
import type { WebModule } from '../../app/web-module';
import { pendingFaultsText } from './fault-text';

/**
 * Microscopio sólido para las marcas de agua de Equipos: tubo inclinado con su ocular y su objetivo,
 * brazo, platina, espejo y base, en capas de opacidad. Toma el color de `currentColor`; es decorativo.
 */
function MicroscopeMark({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 120 150" fill="currentColor" className={className} aria-hidden focusable="false">
      <g transform="rotate(-18 60 40)">
        <rect x="49" y="2" width="14" height="14" rx="3" />
        <rect x="44" y="16" width="24" height="52" rx="6" />
        <rect x="50" y="68" width="12" height="14" rx="3" fillOpacity="0.7" />
      </g>
      <path d="M68 32C112 34 124 100 90 128H74C100 100 96 56 64 50Z" />
      <rect x="30" y="92" width="64" height="9" rx="4" fillOpacity="0.45" />
      <circle cx="56" cy="114" r="6" fillOpacity="0.6" />
      <rect x="14" y="126" width="92" height="16" rx="8" />
    </svg>
  );
}

/** Descriptor de Equipos en la web; sus páginas y rutas están en `routes.tsx`. */
export const equipmentWebModule: WebModule = {
  code: 'equipment',
  Icon: Microscope,
  Mark: MicroscopeMark,
  sectionIcons: { inventario: List, reportes: TriangleAlert },
  home: {
    counters: [
      { key: 'assets', label: (n) => (n === 1 ? 'equipo' : 'equipos') },
      { key: 'faulted', label: () => 'fuera de servicio' },
    ],
    pending: {
      permission: 'equipment.fault.manage',
      approver: (n) => pendingFaultsText(n, true),
      requester: (n) => pendingFaultsText(n, false),
    },
    trendNoun: { one: 'cambio', many: 'cambios' },
  },
};
