import { IconChip } from '@platlab/ui';
import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';

/**
 * Un aviso del Resumen en tarjeta (ADR 0021): icono, título, una frase y su acción, que lleva a donde se resuelve.
 * Se muestra solo si hay algo que avisar. El tono del icono acompaña al título, que es quien dice el estado; en el móvil
 * la acción ocupa todo el ancho, con 44 px de alto. Lo usan los Resúmenes de Equipos y de Mantenimiento.
 */
export function NoticeCard({
  icon,
  tone = 'warning',
  title,
  text,
  action,
  to,
}: {
  icon: LucideIcon;
  tone?: 'warning' | 'neutral' | 'danger';
  title: string;
  text: string;
  action: string;
  to: string;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card bg-surface p-4 shadow-raised sm:px-6">
      <IconChip icon={icon} tone={tone} />
      <div className="min-w-0 flex-1 basis-56">
        <p id={titleId} className="font-semibold text-ink">
          {title}
        </p>
        <p className="text-sm text-ink-muted">{text}</p>
      </div>
      <Link
        to={to}
        className="inline-flex h-11 w-full items-center justify-center rounded-control border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken sm:h-10 sm:w-auto"
      >
        {action}
      </Link>
    </section>
  );
}
