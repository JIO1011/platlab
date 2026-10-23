import type { RequestSummary } from '@platlab/contracts';
import { ChevronDown } from 'lucide-react';
import { Fragment, useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { RequestBadges } from './request-status';

/** Un dato por línea en el móvil y todos en una, separados por puntos, desde `sm`. */
function Facts({ facts }: { facts: readonly string[] }) {
  return (
    <span className="grid gap-0.5 text-sm text-ink-muted sm:flex sm:flex-wrap sm:gap-x-2">
      {facts.map((fact, at) => (
        <Fragment key={`${at}-${fact}`}>
          {at > 0 ? (
            <span aria-hidden className="max-sm:hidden">
              ·
            </span>
          ) : null}
          <span className="min-w-0 break-words">{fact}</span>
        </Fragment>
      ))}
    </span>
  );
}

/**
 * Una tarjeta de la lista de solicitudes, al estilo de «Por atender» de Reactivos: título, cuenta y frase corta.
 * Con `collapsible` va plegada (un `<details>`) hasta que se abre.
 */
export function RequestSection({
  title,
  count,
  hint,
  action,
  collapsible = false,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  action?: ReactNode;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const heading = (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <h2 id={id} className="text-lg font-bold text-ink">
        {title}
      </h2>
      <span className="text-sm font-medium text-ink-muted tabular-nums">{count === 1 ? '1 solicitud' : `${count} solicitudes`}</span>
    </span>
  );
  const hinted = hint ? <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span> : null;
  const card = 'min-w-0 rounded-card bg-surface shadow-raised';

  if (collapsible) {
    return (
      <details className={`group ${card}`}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-card p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:p-6 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            {heading}
            {hinted}
          </span>
          <ChevronDown className="size-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
      </details>
    );
  }
  return (
    <article aria-labelledby={id} className={`${card} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {heading}
          {hinted}
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

/** Las filas de una sección, con divisor; llegan al borde de la tarjeta para que el foco ocupe todo el ancho. */
export function RequestList({ label, children }: { label: string; children: ReactNode }) {
  return <ul aria-label={label} className="-mx-5 mt-3 divide-y divide-line sm:-mx-6">{children}</ul>;
}

/**
 * Una fila de solicitud: código, título (el enlace que abre la hoja, extendido a toda la fila), datos y, a la derecha,
 * la pastilla de estado (salvo `hideStatus`), «Fuera de plazo» y lo que sume `badges`. `action` (p. ej. «Duplicar») queda sobre el enlace.
 */
export function RequestItem({
  to,
  request,
  facts,
  note,
  badges,
  action,
  hideStatus = false,
}: {
  to: string;
  request: RequestSummary;
  facts: readonly string[];
  note?: string;
  badges?: ReactNode;
  action?: ReactNode;
  /** Quita la pastilla de estado cuando toda la lista es del mismo estado; «Fuera de plazo» y `badges` se quedan. */
  hideStatus?: boolean;
}) {
  return (
    <li className="relative flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 py-3.5 transition-colors hover:bg-surface-sunken/40 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-action sm:px-6">
      <div className="grid min-w-0 flex-1 basis-56 gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CodeTag>{request.code}</CodeTag>
          <Link
            to={to}
            className={`min-w-0 break-words after:absolute after:inset-0 focus-visible:outline-none ${request.title ? 'font-semibold text-ink' : 'text-ink-muted'}`}
          >
            {request.title ?? 'Sin título'}
          </Link>
        </p>
        <Facts facts={facts} />
        {note ? <p className="text-sm text-ink">{note}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        <RequestBadges status={request.status} late={request.late} hideStatus={hideStatus} />
        {badges}
        {action ? <span className="relative z-10">{action}</span> : null}
      </div>
    </li>
  );
}
