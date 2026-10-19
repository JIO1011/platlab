import { useId, type ReactNode } from 'react';

/**
 * Una tarjeta del Resumen: título (con su icono a la izquierda, si lo lleva), una frase que lo explica y, a la
 * derecha, su enlace o acción. El contenido va debajo.
 */
export function Panel({
  id,
  title,
  description,
  icon,
  action,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section id={id} aria-labelledby={titleId} className="scroll-mt-4 rounded-card bg-surface p-5 shadow-raised sm:p-6">
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
        {icon}
        <div className="min-w-0 flex-1 basis-48">
          <h2 id={titleId} tabIndex={-1} className="text-lg font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}
