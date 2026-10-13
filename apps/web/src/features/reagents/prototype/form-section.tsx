// Prototipo R-01D: solo interfaz
import { IconChip, cn } from '@platlab/ui';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

/**
 * Cuerpo plegable: la altura y la opacidad cambian con `grid-template-rows` (0fr a 1fr), unos 200 ms
 * con la curva de salida del sistema; con movimiento reducido, al instante. Cerrado queda `inert`,
 * así que ni el teclado ni los lectores de pantalla llegan a lo que no se ve.
 */
function Collapse({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out-expo motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div inert={!open} className="min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/**
 * Aparición progresiva de una sección: entra plegada a 0fr y se despliega en el cuadro siguiente.
 * El espacio que la separa de la anterior vive dentro (`pt-3`), para que no salte al montarla.
 * `instant` la monta ya desplegada (al abrir la ventana con un reactivo elegido).
 */
export function Reveal({ children, instant = false }: { children: ReactNode; instant?: boolean }) {
  const [shown, setShown] = useState(instant);
  useEffect(() => {
    if (shown) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [shown]);
  return (
    <Collapse open={shown}>
      <div className="pt-3">{children}</div>
    </Collapse>
  );
}

/**
 * Sección del formulario como tarjeta (radio `panel`, borde fino). El encabezado entero es el botón
 * que la abre y la cierra; las acciones (p. ej. «Cambiar») van fuera de él para no anidar botones.
 * Las obligatorias van con el encabezado teñido de `action-soft`; las opcionales, neutras.
 */
export function FormSection({
  icon,
  title,
  required = false,
  optional = false,
  summary,
  actions,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  required?: boolean;
  optional?: boolean;
  /** Resumen en el encabezado; se lee mejor plegada la sección. */
  summary?: ReactNode;
  actions?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className={cn('flex items-center gap-1 pr-2', required ? 'bg-action-soft' : 'bg-surface')}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={onToggle}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action sm:min-h-10"
        >
          <IconChip icon={icon} tone={required ? 'accent' : 'neutral'} className={cn('size-6 rounded-[8px] [&>svg]:size-3.5', required && 'bg-surface')} />
          <span id={`${id}-title`} className="shrink-0 text-sm font-semibold text-ink">
            {title}
            {required ? (
              <span aria-hidden className="ml-0.5">
                *
              </span>
            ) : null}
          </span>
          {optional ? <span className="shrink-0 rounded-full border border-line-strong px-2 py-px text-xs font-medium text-ink-muted">Opcional</span> : null}
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-ink-muted">{open ? null : summary}</span>
          <ChevronDown className={cn('size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-out-expo motion-reduce:transition-none', open && 'rotate-180')} aria-hidden />
        </button>
        {actions}
      </div>
      <Collapse open={open} id={`${id}-body`}>
        <div className="border-t border-line px-3 py-3">{children}</div>
      </Collapse>
    </section>
  );
}

/** Subapartado plegable dentro de una sección (sin tarjeta: las tarjetas no se anidan). */
export function Disclosure({
  title,
  hint,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  hint?: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="border-t border-line pt-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={onToggle}
        className="flex min-h-[44px] w-full items-center gap-2 rounded-[8px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-9"
      >
        <ChevronDown className={cn('size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-out-expo motion-reduce:transition-none', !open && '-rotate-90')} aria-hidden />
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        {badge ? <span className="rounded-full border border-line-strong px-2 py-px text-xs font-medium text-ink-muted">{badge}</span> : null}
        {hint ? <span className="min-w-0 truncate text-[13px] text-ink-muted">{hint}</span> : null}
      </button>
      <Collapse open={open} id={`${id}-body`}>
        <div className="grid gap-3 pb-1 pt-2">{children}</div>
      </Collapse>
    </div>
  );
}
