import { cn, sectionLabel } from '@platlab/ui';
import type { LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';

/**
 * Marco de una sección del ingreso (ADR 0015, ajuste del 13-10-2026): un recuadro `rounded-2xl` de
 * borde suave y `p-5`, con su cabecera (icono, rótulo en mayúsculas y, a la derecha, «Opcional»).
 * Todos los marcos se ven desde el inicio. Con `card` es la tarjeta lateral: fondo algo distinto,
 * sombra propia y, en escritorio, fija arriba mientras se desplaza el resto.
 */
export function Section({
  icon: Icon,
  title,
  badge,
  card = false,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  /** La tarjeta aparte de «Clasificación y seguridad». */
  card?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'rounded-2xl border p-5',
        card
          ? 'border-line-strong/70 bg-surface-sunken/80 shadow-float lg:sticky lg:top-0 lg:max-h-[calc(90dvh-14.5rem)] lg:self-start lg:overflow-y-auto'
          : 'border-line bg-white/55',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 id={id} className={cn(sectionLabel, 'flex items-center gap-2')}>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {title}
        </h3>
        {badge ? <span className="text-xs font-medium text-ink-muted">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}
