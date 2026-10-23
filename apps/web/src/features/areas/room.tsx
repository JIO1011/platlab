import type { AreaFilter } from '../../app/web-module';
import { cn } from '@platlab/ui';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { webModules } from '../../app/modules';

const number = new Intl.NumberFormat('es-EC');

/**
 * Una cifra por módulo que cuenta aquí (ADR 0024): su icono, cuánto hay y qué es. Los módulos dicen cómo se
 * llama lo que cuentan y adónde lleva (`areas` de su descriptor); la sección no los nombra. Solo salen los que
 * la persona consulta. Cada cifra abre la lista del módulo ya filtrada por esta área o este departamento.
 */
function Figures({ base, filter, counts }: { base: string; filter: AreaFilter; counts: Record<string, number> }) {
  const figures = webModules.flatMap((module) => {
    const count = counts[module.code];
    return module.areas && count !== undefined ? [{ module, areas: module.areas, count }] : [];
  });
  if (figures.length === 0) return null;
  return (
    <ul aria-label="Lo que hay" className="mt-auto grid gap-0.5 border-t border-line pt-2">
      {figures.map(({ module, areas, count }) => (
        <li key={module.code}>
          <Link
            to={`${base}/${areas.href(filter)}`}
            className="group/figure relative z-10 -mx-2 flex min-h-11 items-center gap-2.5 rounded-control px-2 transition-colors hover:bg-action-soft sm:min-h-9"
          >
            <module.Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
            <span className={cn('text-lg font-semibold tabular-nums', count === 0 ? 'text-ink-subtle' : 'text-ink')}>{number.format(count)}</span>
            <span className="min-w-0 truncate text-sm text-ink-muted">{areas.label(count)}</span>
            <ChevronRight className="ml-auto size-4 shrink-0 text-ink-subtle transition-colors group-hover/figure:text-action" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Un cuarto del croquis: nombre, quien lo atiende (`subtitle`) y las cifras por módulo. Con `onOpen`, el nombre
 * es el botón que abre el cuarto y se extiende sobre toda la tarjeta; las cifras quedan por encima, cada una con
 * su enlace. Sin `onOpen` (un departamento), `actions` trae los controles propios del cuadro.
 */
export function Room({
  name,
  subtitle,
  base,
  filter,
  counts,
  onOpen,
  marks,
  actions,
}: {
  name: string;
  subtitle?: ReactNode;
  base: string;
  filter: AreaFilter;
  counts: Record<string, number>;
  onOpen?: () => void;
  /** Marcas pequeñas bajo el subtítulo: las que otros módulos aportan (ADR 0020). */
  marks?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li
      className={cn(
        'relative flex min-h-40 flex-col gap-3 rounded-panel bg-surface p-4 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo has-[button[data-room]:focus-visible]:outline-2 has-[button[data-room]:focus-visible]:outline-offset-2 has-[button[data-room]:focus-visible]:outline-action',
        // Solo el cuarto que se abre sube como tarjeta-enlace (DESIGN.md, Elevation & Depth).
        onOpen && 'hover:shadow-float motion-safe:hover:-translate-y-1',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid min-w-0 gap-2">
          <h3 className="line-clamp-2 break-words text-lg font-bold leading-snug tracking-tight text-ink">
            {onOpen ? (
              <button type="button" data-room onClick={onOpen} className="text-left after:absolute after:inset-0 after:rounded-panel focus-visible:outline-none">
                {name}
              </button>
            ) : (
              name
            )}
          </h3>
          {subtitle}
          {marks}
        </div>
        {actions ? <div className="relative z-10 -mr-2 -mt-2 shrink-0">{actions}</div> : null}
      </div>
      <Figures base={base} filter={filter} counts={counts} />
    </li>
  );
}
