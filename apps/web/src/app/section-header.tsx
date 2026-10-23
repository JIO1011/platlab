import { Eye, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatAgo } from './format';
import { useModuleContext } from './module-app';
import { useNow } from './use-now';

/** Lo que cada sección pasa a su cabecera: el título, la marca de lo que muestra y sus acciones. */
interface SectionHeaderProps {
  title: string;
  updatedAt: number;
  /** Una línea breve sobre lo que muestra la sección (por ejemplo, el período), antes de «Actualizado…». */
  detail?: ReactNode;
  actions?: ReactNode;
}

/**
 * Cabecera de una sección de un módulo (ADR 0022): el título Display y «Actualizado hace…» (la marca más antigua de lo
 * que la sección muestra) con «Actualizar»; a la derecha, las acciones de la sección si las hay (en el móvil,
 * debajo, a todo el ancho). En modo consulta (`canOperate` falso), el aviso `readOnlyNotice` de que no se registran
 * cambios. El estado y el aviso salen del contexto de la app del módulo (`ModuleOutlet`). El título admite el foco de respaldo al cambiar de sección (`data-focus-fallback`).
 */
export function SectionHeader({ title, updatedAt, detail, actions }: SectionHeaderProps) {
  const { canOperate, freshness, readOnlyNotice } = useModuleContext();
  const now = useNow(15_000);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 tabIndex={-1} data-focus-fallback className="text-display text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
            {title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-muted">
            {detail}
            {updatedAt > 0 ? <span>Actualizado {formatAgo(updatedAt, now)}</span> : <span>Cargando…</span>}
            <button
              type="button"
              onClick={freshness.refresh}
              className="-my-3 inline-flex min-h-11 items-center gap-1 rounded-[6px] px-1.5 py-1.5 font-medium text-action transition-colors hover:bg-action-soft sm:-my-1 sm:min-h-0"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {freshness.refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </p>
        </div>
        {actions ? <div className="grid w-full gap-2 sm:flex sm:w-auto">{actions}</div> : null}
      </header>
      {canOperate ? null : (
        <p role="status" className="mt-5 flex items-center gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-sm text-warning">
          <Eye className="size-4 shrink-0" aria-hidden />
          {readOnlyNotice}
        </p>
      )}
    </>
  );
}
