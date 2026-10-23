import type { Period, PeriodList } from '@platlab/contracts';
import { Badge, Button, Skeleton, toast } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { ConfirmArchive } from '../../app/confirm-archive';
import { formatDate, todayInZone } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, useArchivePeriod } from './commands';
import { PeriodSheet } from './period-sheet';

/** Archivar un período con su confirmación aquí mismo: deja de contar para agendar y no se deshace desde esta pantalla. */
function ArchivePeriod({ workspaceId, period, onCancel }: { workspaceId: string; period: Period; onCancel: () => void }) {
  const archive = useArchivePeriod(workspaceId, period.id);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setError(null);
    try {
      await archive.mutateAsync(undefined);
      toast.success('Período archivado', { description: period.code });
    } catch (failure) {
      setError(labsErrorMessage(failure));
    }
  };
  return (
    <ConfirmArchive
      label={`Archivar el período ${period.code}`}
      text={`${period.code} dejará de contar y sus fechas volverán a quedar fuera de todo período, sin agenda. Las solicitudes que ya lo llevan en su código siguen.`}
      action="Archivar período"
      pending={archive.isPending}
      error={error}
      onConfirm={() => void confirm()}
      onCancel={onCancel}
    />
  );
}

/** Un período: su código y sus fechas; el archivado lo dice, y el activo se edita o se archiva si quien lo ve administra. */
function PeriodRow({ workspaceId, period, onEdit }: { workspaceId: string; period: Period; onEdit?: () => void }) {
  const [archiving, setArchiving] = useState(false);
  return (
    <li className="grid gap-3 px-3 py-2.5">
      <div className="flex items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink">
            <span className="break-words">{period.code}</span>
            {period.archivedAt ? <Badge tone="neutral">Archivado</Badge> : null}
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-ink-muted">
            {formatDate(period.startsOn)} – {formatDate(period.endsOn)}
          </p>
        </div>
        {onEdit && !archiving ? (
          <div className="flex shrink-0 gap-1">
            <Button size="sm" aria-haspopup="dialog" onClick={onEdit}>
              <Pencil aria-hidden />
              Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setArchiving(true)}>
              Archivar
            </Button>
          </div>
        ) : null}
      </div>
      {archiving ? <ArchivePeriod workspaceId={workspaceId} period={period} onCancel={() => setArchiving(false)} /> : null}
    </li>
  );
}

/**
 * Los períodos de Laboratorios (ADR 0023, «Períodos y sigla»): identifican cada práctica en su código y fuera de ellos no se
 * agenda. Los activos van por fecha de inicio y los archivados, plegados. El Administrador crea, edita y archiva; lo
 * confirmado por el servidor es lo único que se muestra.
 */
export function PeriodsSection({
  workspaceId,
  periods,
  timeZone,
  canManage,
}: {
  workspaceId: string;
  periods: UseQueryResult<PeriodList>;
  timeZone: string;
  canManage: boolean;
}) {
  // `n` monta la hoja de nuevo en cada apertura; sin `period`, es un período nuevo.
  const [sheet, setSheet] = useState<{ n: number; open: boolean; period?: Period } | null>(null);
  const openSheet = (period?: Period) => setSheet({ n: (sheet?.n ?? 0) + 1, open: true, ...(period ? { period } : {}) });
  const items = periods.data?.items ?? [];
  const active = items.filter((entry) => entry.archivedAt === null);
  const archived = items.filter((entry) => entry.archivedAt !== null);

  return (
    <section aria-labelledby="labs-periods" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="labs-periods" className="text-lg font-semibold text-ink">
          Períodos
        </h2>
        {canManage ? (
          <Button size="sm" aria-haspopup="dialog" onClick={() => openSheet()}>
            <Plus aria-hidden />
            Nuevo período
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 rounded-card bg-surface px-4 py-4 shadow-raised sm:px-5">
        <p className="text-sm text-ink-muted">Identifican cada práctica en su código (P1-S12-ANT03) y fuera de ellos no se agenda.</p>
        {periods.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-16" />
          </div>
        ) : periods.isError ? (
          <QueryErrorState error={periods.error} onRetry={() => void periods.refetch()} />
        ) : (
          <>
            {active.length === 0 ? (
              <p className="rounded-control bg-surface-sunken px-3 py-3 text-sm text-ink-muted">Aún no hay períodos: mientras no exista uno, no se agenda.</p>
            ) : (
              <ul className="divide-y divide-line">
                {active.map((entry) => (
                  <PeriodRow key={entry.id} workspaceId={workspaceId} period={entry} {...(canManage ? { onEdit: () => openSheet(entry) } : {})} />
                ))}
              </ul>
            )}
            {archived.length > 0 ? (
              <details>
                <summary className="min-h-11 cursor-pointer list-none text-sm font-medium text-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action [&::-webkit-details-marker]:hidden">
                  Archivados ({archived.length})
                </summary>
                <ul className="mt-1 divide-y divide-line">
                  {archived.map((entry) => (
                    <PeriodRow key={entry.id} workspaceId={workspaceId} period={entry} />
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </div>
      {sheet ? (
        <PeriodSheet
          key={sheet.n}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          period={sheet.period}
          today={todayInZone(timeZone)}
        />
      ) : null}
    </section>
  );
}
