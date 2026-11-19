import { HandHelping, Package } from 'lucide-react';
import type { WebModule } from '../../app/web-module';

/** Descriptor de Materiales en la web; sus páginas y rutas están en `routes.tsx`. */
export const materialsWebModule: WebModule = {
  code: 'materials',
  Icon: Package,
  sectionIcons: { inventario: Package, prestamos: HandHelping },
  // La tarjeta del Inicio: lo prestado y lo que pide reposición. Sin gráfico hasta que Materiales tenga actividad propia.
  home: {
    counters: [
      { key: 'openLoans', label: (n) => (n === 1 ? 'préstamo abierto' : 'préstamos abiertos') },
      { key: 'belowMinimum', label: () => 'bajo mínimo' },
    ],
    trendNoun: { one: 'movimiento', many: 'movimientos' },
  },
};
