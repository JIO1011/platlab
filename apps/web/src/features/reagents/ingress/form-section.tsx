import { cn, sectionLabel } from '@platlab/ui';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';

/**
 * Marco de una sección del ingreso (ADR 0015, ajuste del 13-10-2026): un recuadro `rounded-2xl` de
 * borde suave y `p-5`, con su cabecera (icono, rótulo en mayúsculas y, a la derecha, «Opcional»).
 * Todos los marcos se ven desde el inicio. Con `card` es la tarjeta lateral: fondo algo distinto,
 * sombra propia y, en escritorio, fija arriba mientras se desplaza el resto.
 *
 * Con `fold`, la sección es un desplegable (14-10-2026): su cabecera es un botón entero (`aria-expanded`,
 * «Opcional» y un chevron que gira) y el cuerpo se pliega sin desmontarse, para que lo escrito se conserve. Plegado,
 * el cuerpo queda `inert`: ni el teclado ni los lectores llegan a él. El estado lo lleva quien la usa.
 */
export function Section({
  icon: Icon,
  title,
  badge,
  card = false,
  fold,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  /** La tarjeta aparte de «Clasificación y seguridad». */
  card?: boolean;
  /** Vuelve la sección un desplegable: `open` y `onToggle` los lleva quien la usa. */
  fold?: { open: boolean; onToggle: () => void };
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const bodyId = `${id}-body`;
  const frame = cn(
    'rounded-2xl border p-5',
    card
      ? 'border-line-strong/70 bg-surface-sunken/80 shadow-float lg:sticky lg:top-0 lg:max-h-[calc(90dvh-14.5rem)] lg:self-start lg:overflow-y-auto'
      : 'border-line bg-white/55',
    className,
  );
  const heading = cn(sectionLabel, 'flex items-center gap-2');
  if (!fold) {
    return (
      <section aria-labelledby={id} className={frame}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id={id} className={heading}>
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {title}
          </h3>
          {badge ? <span className="text-xs font-medium text-ink-muted">{badge}</span> : null}
        </div>
        {children}
      </section>
    );
  }
  return (
    <section aria-labelledby={id} className={cn(frame, 'py-0')}>
      <h3 id={id}>
        <button
          type="button"
          aria-expanded={fold.open}
          aria-controls={bodyId}
          onClick={fold.onToggle}
          className="group -mx-2 flex min-h-14 w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-xl px-2 text-left transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        >
          <span className={heading}>
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {title}
          </span>
          <span className="flex items-center gap-2">
            {badge ? <span className="text-xs font-medium text-ink-muted">{badge}</span> : null}
            <ChevronDown
              className={cn('size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-out-expo motion-reduce:transition-none', fold.open && 'rotate-180')}
              aria-hidden
            />
          </span>
        </button>
      </h3>
      {/* Plegado, el cuerpo mide 0 y no se desmonta: lo escrito se conserva. Abrir y cerrar anima el alto con la curva del sistema. */}
      <div
        id={bodyId}
        inert={!fold.open}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out-expo motion-reduce:transition-none',
          fold.open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="-mx-1 min-h-0 overflow-hidden px-1">
          <div className="pb-5 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}
