// Prototipo R-01D: solo interfaz
import { cn } from '@platlab/ui';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

/** Lo que dura el despliegue (ms); pasado ese tiempo el contenido deja de recortarse. */
const REVEAL_MS = 220;

/**
 * Cuerpo que se despliega: la altura y la opacidad cambian con `grid-template-rows` (0fr a 1fr),
 * unos 200 ms con la curva de salida del sistema; con movimiento reducido, al instante. Cerrado
 * queda `inert`. Una vez desplegado ya no recorta, para que los menús de sugerencias puedan salirse.
 */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const [settled, setSettled] = useState(open);
  useEffect(() => {
    if (!open) {
      setSettled(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSettled(true), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [open]);
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out-expo motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div inert={!open} className={cn('min-h-0', settled ? 'overflow-visible' : 'overflow-hidden')}>
        {children}
      </div>
    </div>
  );
}

/**
 * Aparición progresiva de una sección: entra plegada a 0fr y se despliega en el cuadro siguiente.
 * El espacio que la separa de la anterior vive dentro (`pt-4`), para que no salte al montarla.
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
      <div className="pt-4">{children}</div>
    </Collapse>
  );
}

/**
 * Sección plana del formulario: sin tarjeta, separada de la anterior por una línea. El título va en
 * 14 px seminegrita con un icono de acento.
 */
export function Section({
  icon: Icon,
  title,
  badge,
  divided = true,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  /** La primera sección no lleva línea encima. */
  divided?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn(divided && 'border-t border-line pt-4')}>
      <h3 id={id} className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">
        <Icon className="size-4 shrink-0 text-action" aria-hidden />
        {title}
        {badge ? <span className="rounded-full border border-line-strong px-2 py-px text-xs font-medium text-ink-muted">{badge}</span> : null}
      </h3>
      {children}
    </section>
  );
}
