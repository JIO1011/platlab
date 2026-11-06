import { Skeleton } from '@platlab/ui';
import { useParams } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { useAssetBookings } from './queries';
import { shortDateText } from './schedule-placement';
import { StagePill } from './stage-pill';

/**
 * La pestaña «Reservas» de la ficha del equipo (L-01e, ADR 0023; punto de extensión de Equipos): las próximas reservas
 * del equipo en el Cronograma, cada una con su fecha, hora, código, área, quién la pidió y su etapa en texto.
 */
export function AssetBookingsTab({ assetId }: { assetId: string }) {
  const { workspaceId = '' } = useParams();
  const bookings = useAssetBookings(workspaceId, assetId);
  if (bookings.isPending)
    return (
      <div role="status" aria-busy="true" aria-label="Cargando reservas">
        <Skeleton className="h-32" />
      </div>
    );
  if (bookings.isError) return <QueryErrorState error={bookings.error} onRetry={() => void bookings.refetch()} />;

  const { items } = bookings.data;
  return (
    <section aria-labelledby="reservas-titulo" className="rounded-card bg-surface shadow-raised">
      <h2 id="reservas-titulo" className="border-b border-line px-5 py-3 text-sm font-bold text-ink md:px-6">
        Próximas reservas
      </h2>
      {items.length === 0 ? (
        <p className="px-5 py-5 text-sm text-ink-muted md:px-6">
          <span className="font-semibold text-ink">Sin reservas.</span> Este equipo no está apartado en ninguna práctica programada.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.activityId} className="grid gap-1 px-5 py-3.5 md:px-6">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <span className="font-semibold text-ink">{shortDateText(item.date)}</span>
                <span className="tabular-nums text-ink-muted">
                  {item.startsAt}–{item.endsAt}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-ink-muted">{item.code}</span>
                <StagePill stage={item.stage} />
              </p>
              <p className="break-words text-[13px] text-ink-muted">
                {item.areaName} · {item.requesterName}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
