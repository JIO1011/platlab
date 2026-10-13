import { cn, sectionLabel } from '@platlab/ui';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

/** Lo que dura el despliegue (ms); pasado ese tiempo el contenido deja de recortarse. */
const REVEAL_MS = 220;

/**
 * Cuerpo que se despliega: la altura y la opacidad cambian con `grid-template-rows` (0fr a 1fr),
 * unos 200 ms con la curva de salida del sistema; con movimiento reducido, al instante. Sus campos
 * se pueden usar desde el primer cuadro: solo se despliega, nunca se pliega. Una vez desplegado ya no
 * recorta, para que los menús de sugerencias puedan salirse.
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
      <div className={cn('min-h-0', settled ? 'overflow-visible' : 'overflow-hidden')}>
        {children}
      </div>
    </div>
  );
}

/**
 * Aparición progresiva de una sección: entra plegada a 0fr y se despliega en el cuadro siguiente.
 * El espacio y la línea que la separan de la anterior viven dentro de la sección, para que no salten
 * al montarla. `instant` la monta ya desplegada (al abrir la ventana con un reactivo elegido).
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
    <Collapse open={shown}>{children}</Collapse>
  );
}

/**
 * Banda del formulario (como las de la salida): de borde a borde, separada de la anterior por una
 * línea y con `py-5`. El rótulo va en mayúsculas grises con un icono pequeño; la marca «Opcional»,
 * en gris a la derecha. Va dentro de un contenedor que sale del relleno del cuerpo (`-mx-6`).
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
    <section aria-labelledby={id} className={cn('px-6 py-5', divided && 'border-t border-line')}>
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
