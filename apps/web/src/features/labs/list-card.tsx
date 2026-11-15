import { cn } from '@platlab/ui';
import { useId, type ReactNode } from 'react';
import { softCard } from './style';

/**
 * Una tarjeta de Formatos con su cabecera (título, frase y la acción de crear a la derecha) y debajo sus filas, con
 * divisor: «Plantillas de solicitud» y «Períodos». Las filas llegan al borde de la tarjeta para que su foco ocupe todo el ancho.
 */
export function ListCard({ title, description, action, children }: { title: string; description: ReactNode; action?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn(softCard, 'min-w-0 overflow-hidden')}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 p-5 sm:px-6">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-bold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Las filas de una tarjeta de Formatos, con su divisor arriba y entre ellas. */
export function ListRows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line border-t border-line">{children}</ul>;
}

/** Los archivados de una tarjeta, plegados bajo «Archivados (N)» hasta que se abren. */
export function ArchivedRows({ count, children }: { count: number; children: ReactNode }) {
  return (
    <details className="border-t border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center px-5 text-sm font-medium text-action-deep focus-visible:outline-2 -outline-offset-2 focus-visible:outline-action sm:px-6 [&::-webkit-details-marker]:hidden">
        Archivados ({count})
      </summary>
      <ListRows>{children}</ListRows>
    </details>
  );
}
