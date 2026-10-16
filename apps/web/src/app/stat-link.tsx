import { StatCard, type StatCardProps } from '@platlab/ui';
import { Link } from 'react-router';

/** Indicador del Resumen que abre la lista que lo explica (ADR 0011): el enlace envuelve la tarjeta. */
export function StatLink({ to, ...stat }: { to: string } & StatCardProps) {
  return (
    <Link to={to} className="group block rounded-card focus-visible:outline-offset-4">
      <StatCard {...stat} />
    </Link>
  );
}
