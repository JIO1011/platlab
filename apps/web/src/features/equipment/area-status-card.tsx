import type { Area } from '@platlab/contracts';
import { Skeleton, StatePanel } from '@platlab/ui';
import { ArrowRight, Microscope } from 'lucide-react';
import { Link } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { attentionAreas, hasSeveralSites } from './area-order';
import { AreaStatus } from './areas';
import { useEquipment } from './context';
import { useAreas } from './queries';

/**
 * Barra fina del reparto del área (verde operativos, ámbar uso limitado, rojo fuera de servicio), con huecos de 2 px.
 * Solo acompaña: el estado ya está escrito en `AreaStatus`.
 */
function HealthBar({ area }: { area: Area }) {
  const parts = [
    { count: Math.max(0, area.total - area.faulted - area.restricted), tone: 'bg-success' },
    { count: area.restricted, tone: 'bg-warning' },
    { count: area.faulted, tone: 'bg-danger' },
  ].filter((part) => part.count > 0);
  return (
    <div aria-hidden className="mt-2.5 flex h-1.5 gap-[2px]">
      {parts.map((part) => (
        <span key={part.tone} className={`rounded-full ${part.tone}`} style={{ flex: `${part.count} 1 0%` }} />
      ))}
    </div>
  );
}

/**
 * «Estado por área» del Resumen de Equipos (ADR 0019): las áreas que más atención piden, hasta seis, cada una con su
 * estado en texto y color. Como en la tabla del Inventario, el nombre es el enlace y se extiende sobre toda la fila, y el
 * foco se dibuja en ella. Al pie, «Ver inventario» (o «Ver las N áreas» si hay más de seis) lleva al Inventario.
 */
export function AreaStatusCard() {
  const { workspaceId, base } = useEquipment();
  const areas = useAreas(workspaceId);
  const items = areas.data?.items ?? [];
  const rows = attentionAreas(items);
  const showParent = hasSeveralSites(items);

  return (
    <article aria-labelledby="estado-por-area" className="flex min-w-0 flex-col rounded-card bg-surface p-6 shadow-raised">
      <h2 id="estado-por-area" className="text-lg font-bold text-ink">
        Estado por área
      </h2>
      {areas.isPending ? (
        <div role="status" aria-busy="true" aria-label="Cargando" className="mt-4 grid gap-3">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-14 rounded-panel" />
          ))}
        </div>
      ) : areas.isError ? (
        <QueryErrorState error={areas.error} onRetry={() => void areas.refetch()} />
      ) : rows.length === 0 ? (
        <StatePanel
          icon={Microscope}
          title="Aún no hay equipos"
          description="Cuando se registren equipos, sus áreas aparecerán aquí con cómo están."
          className="py-8"
        />
      ) : (
        <>
          {/* Las filas llegan al borde de la tarjeta: el divisor y el foco ocupan todo el ancho. */}
          <ul aria-label="Áreas" className="-mx-6 mt-3 divide-y divide-line">
            {rows.map((area) => (
              <li
                key={area.id}
                className="relative px-6 py-3.5 transition-colors hover:bg-surface-sunken/40 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-action"
              >
                <Link
                  to={`${base}/inventario/area/${area.id}`}
                  className="block truncate font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {area.name}
                </Link>
                {showParent && area.parentName ? <p className="truncate text-[13px] text-ink-muted">{area.parentName}</p> : null}
                <div className="mt-2">
                  <AreaStatus area={area} />
                </div>
                <HealthBar area={area} />
              </li>
            ))}
          </ul>
          <Link
            to={`${base}/inventario`}
            className="mt-4 inline-flex items-center gap-1 self-start rounded-control text-sm font-medium text-action transition-colors hover:text-action-hover"
          >
            {items.length > rows.length ? `Ver las ${items.length} áreas` : 'Ver inventario'}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </>
      )}
    </article>
  );
}
