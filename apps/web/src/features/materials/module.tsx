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
    agenda: {
      return: { noun: { one: 'devolución', many: 'devoluciones' }, href: (item) => `materiales/prestamos?vale=${item.ref}` },
    },
    // Lo que vence y lo que está bajo mínimo se listan en «Hay que atender» del Resumen.
    tasks: {
      overdueLoans: { label: (n) => (n === 1 ? 'préstamo atrasado' : 'préstamos atrasados'), href: 'materiales/prestamos?filtro=overdue' },
      expiring: { label: (n) => (n === 1 ? 'material vencido o por vencer' : 'materiales vencidos o por vencer'), href: 'materiales' },
      belowMinimum: { label: (n) => (n === 1 ? 'material bajo su mínimo' : 'materiales bajo su mínimo'), href: 'materiales' },
    },
  },
};
