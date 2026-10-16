import { cn } from '@platlab/ui';
import type { LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { ModuleMark } from './module-mark';

/** Botón principal de la banda: invertido (blanco sobre el acento), la acción primaria de la pantalla. */
export const quickActionPrimary =
  'inline-flex h-11 items-center justify-center gap-2 rounded-control bg-surface px-6 text-sm font-bold text-action shadow-lg transition-[background-color,transform] duration-150 hover:bg-action-soft motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98]';

/** Botón secundario de la banda: contorno blanco sobre el degradado. */
export const quickActionSecondary =
  'inline-flex h-11 items-center justify-center gap-2 rounded-control border border-white/40 px-5 text-sm font-medium backdrop-blur-sm transition-colors duration-150 hover:bg-white/10';

/**
 * Acción rápida (ADR 0010, 04-10-2026) en banda compacta (ADR 0012, 05-10-2026): el degradado del
 * acento con el título, una frase y las acciones del módulo, debajo de los indicadores para no empujar
 * los datos. Sustituye a las acciones de la cabecera en el Resumen: sus botones son la acción primaria.
 * Los botones los trae quien la usa (con `quickActionPrimary` y `quickActionSecondary`); `className`
 * ajusta el relleno vertical a la ventana de cada Resumen.
 */
export function QuickActions({
  moduleCode,
  title,
  badge,
  description,
  className,
  children,
}: {
  moduleCode: string;
  title: string;
  badge: { icon: LucideIcon; label: string };
  description: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const BadgeIcon = badge.icon;
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        '@container relative shrink-0 overflow-hidden rounded-card bg-linear-to-br from-action to-action-deep px-6 py-[30px] text-on-action shadow-xl shadow-action/20 md:px-7',
        className,
      )}
    >
      {/* Se adapta a su ancho, no al de la pantalla: en el Resumen puede compartir fila con otra tarjeta. */}
      <div className="relative z-10 flex flex-col gap-4 @2xl:flex-row @2xl:items-center @2xl:justify-between">
        <div className="min-w-0 max-w-xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 id={titleId} className="text-2xl font-bold tracking-tight">
              {title}
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-md">
              <BadgeIcon className="size-3.5" aria-hidden />
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-on-action">{description}</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap @2xl:shrink-0">{children}</div>
      </div>
      <ModuleMark code={moduleCode} className="pointer-events-none absolute -bottom-10 right-6 size-44 rotate-12 text-white/15" />
      <div className="pointer-events-none absolute right-40 top-0 size-28 rounded-full bg-white/20 blur-3xl" aria-hidden />
    </section>
  );
}
