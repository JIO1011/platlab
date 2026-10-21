import { ArrowLeftRight, FlaskConical, Inbox, Package } from 'lucide-react';
import type { WebModule } from '../../app/web-module';

/**
 * Matraz sólido para las marcas de agua de Reactivos. El icono de trazo, agrandado, se ve como un
 * boceto; esta silueta rellena (cuerpo, líquido y burbujas en capas de opacidad) se lee como una
 * forma. Toma el color de `currentColor`; es decorativa.
 */
function FlaskMark({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 120 150" fill="currentColor" className={className} aria-hidden focusable="false">
      <rect x="36" y="2" width="48" height="11" rx="5.5" />
      <path fillOpacity="0.45" d="M45 13h30v37l38.4 73.2c5 9.6-1.9 21.3-12.7 21.3H19.3c-10.8 0-17.7-11.7-12.7-21.3L45 50V13z" />
      <path d="M23.4 88h73.2l16.8 35.2c5 9.6-1.9 21.3-12.7 21.3H19.3c-10.8 0-17.7-11.7-12.7-21.3L23.4 88z" />
      <circle cx="52" cy="72" r="5" fillOpacity="0.7" />
      <circle cx="68" cy="60" r="3.5" fillOpacity="0.6" />
      <circle cx="61" cy="40" r="2.5" fillOpacity="0.5" />
    </svg>
  );
}

/** Descriptor de Reactivos en la web; sus páginas y rutas están en `routes.tsx`. */
export const reagentsWebModule: WebModule = {
  code: 'reagents',
  Icon: FlaskConical,
  Mark: FlaskMark,
  sectionIcons: { inventario: Package, movimientos: ArrowLeftRight, solicitudes: Inbox },
  home: {
    counters: [
      { key: 'productsWithStock', label: (n) => (n === 1 ? 'reactivo con existencias' : 'reactivos con existencias') },
      { key: 'containersWithStock', label: (n) => (n === 1 ? 'frasco con existencias' : 'frascos con existencias') },
    ],
    pending: {
      permission: 'reagents.issue.approve',
      approver: (n) => (n === 1 ? '1 salida espera tu aprobación' : `${n} salidas esperan tu aprobación`),
      requester: (n) => (n === 1 ? 'Tienes 1 solicitud de salida pendiente' : `Tienes ${n} solicitudes de salida pendientes`),
    },
    trendNoun: { one: 'salida', many: 'salidas' },
  },
  // Reactivos con existencias en un área o de un departamento (ADR 0024): abre el Inventario filtrado.
  areas: {
    label: (n) => (n === 1 ? 'reactivo' : 'reactivos'),
    href: ({ kind, id }) => `reactivos/inventario?${kind === 'area' ? 'area' : 'departamento'}=${id}`,
  },
};
