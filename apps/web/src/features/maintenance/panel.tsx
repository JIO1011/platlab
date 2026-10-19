import { useId, type ReactNode } from 'react';

/** Un bloque de Indicadores: título, una frase que lo explica y su contenido. */
export function Panel({ id, title, description, children }: { id?: string; title: string; description?: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section id={id} aria-labelledby={titleId} className="scroll-mt-4 rounded-card bg-surface p-4 shadow-raised sm:p-5">
      <h2 id={titleId} tabIndex={-1} className="text-base font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
