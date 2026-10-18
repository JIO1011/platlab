import { Eye, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatAgo } from '../../app/format';
import { useNow } from '../../app/use-now';
import { useMaintenance } from './context';

/**
 * Cabecera de una sección de Mantenimiento, como la de Equipos: el título, «Actualizado hace…» con «Actualizar» y,
 * a la derecha, la acción primaria de la sección (en el móvil, debajo, a todo el ancho). En modo consulta, el aviso.
 */
export function SectionHeader({ title, updatedAt, actions }: { title: string; updatedAt: number; actions?: ReactNode }) {
  const { canOperate, freshness } = useMaintenance();
  const now = useNow(15_000);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 tabIndex={-1} data-focus-fallback className="text-display text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
            {title}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted">
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
          Mantenimiento está en modo consulta: puedes ver lo que hay por hacer, el historial y los planes, pero no registrar cambios.
        </p>
      )}
    </>
  );
}
