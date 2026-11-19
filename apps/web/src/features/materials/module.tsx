import { HandHelping, Package } from 'lucide-react';
import type { WebModule } from '../../app/web-module';

/** Descriptor de Materiales en la web; sus páginas y rutas están en `routes.tsx`. */
export const materialsWebModule: WebModule = {
  code: 'materials',
  Icon: Package,
  sectionIcons: { inventario: Package, prestamos: HandHelping },
  // La tarjeta del Inicio: lo prestado, lo que pide reposición y lo que vence pronto (MA-01f). Sin gráfico hasta que
  // Materiales tenga actividad propia.
  home: {
    counters: [
      { key: 'openLoans', label: (n) => (n === 1 ? 'préstamo abierto' : 'préstamos abiertos') },
      { key: 'belowMinimum', label: () => 'bajo mínimo' },
      { key: 'expiring', label: () => 'por vencer' },
    ],
    trendNoun: { one: 'movimiento', many: 'movimientos' },
  },
};
