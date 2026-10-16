import { Eye, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatAgo } from '../../app/format';
import { useNow } from '../../app/use-now';
import { useEquipment } from './context';

/**
 * Cabecera de una sección de Equipos: el título Display y «Actualizado hace…» (la marca más antigua de lo
 * que la sección muestra) con «Actualizar»; a la derecha, las acciones de la sección si las hay (en el móvil,
 * debajo, a todo el ancho). En modo consulta, el aviso de que no se registran cambios.
 */
export function SectionHeader({ title, updatedAt, actions }: { title: string; updatedAt: number; actions?: ReactNode }) {
  const { canOperate, freshness } = useEquipment();
  const now = useNow(15_000);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-display text-ink">{title}</h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted">
            {updatedAt > 0 ? <span>Actualizado {formatAgo(updatedAt, now)}</span> : <span>Cargando…</span>}
            <button
              type="button"
              onClick={freshness.refresh}
              className="-my-1 inline-flex items-center gap-1 rounded-[6px] px-1.5 py-1.5 font-medium text-action transition-colors hover:bg-action-soft"
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
          Equipos está en modo consulta: puedes ver el inventario, pero no registrar cambios.
        </p>
      )}
    </>
  );
}
