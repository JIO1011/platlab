import type { Period, PeriodList } from '@platlab/contracts';
import { Badge, Button, Skeleton, cn, toast } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { CalendarDays, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { ConfirmArchive } from '../../app/confirm-archive';
import { formatDate, todayInZone } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, useArchivePeriod } from './commands';
import { ArchivedRows, ListCard, ListRows } from './list-card';
import { PeriodSheet } from './period-sheet';
import { periodState, periodStateTexts } from './period-status';

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

/**
 * Un período: su código en un cuadro, «Período P1 · Vigente» (el estado sale de sus fechas, no se activa a mano) y sus
 * fechas; el archivado lo dice, y el activo se edita o se archiva si quien lo ve administra.
 */
function PeriodRow({ workspaceId, period, today, onEdit }: { workspaceId: string; period: Period; today: string; onEdit?: () => void }) {
  const [archiving, setArchiving] = useState(false);
  const state = periodStateTexts[periodState(period, today)];
  return (
    <li className="grid gap-3 px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-xl bg-action-soft px-2 text-sm font-bold text-action-deep">
            {period.code}
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-bold tracking-tight text-ink">
              <span className="break-words">Período {period.code}</span>
              {period.archivedAt ? (
                <Badge tone="neutral">Archivado</Badge>
              ) : (
                <span className={cn('text-[13px] font-medium', state.tone === 'success' ? 'text-success' : 'text-ink-muted')}>{state.label}</span>
              )}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-ink-muted">
              <CalendarDays className="size-3.5 shrink-0" aria-hidden />
              {formatDate(period.startsOn)} – {formatDate(period.endsOn)}
            </p>
          </div>
        </div>
        {onEdit && !archiving ? (
          <div className="flex shrink-0 gap-1">
            <Button size="sm" className="h-11 sm:h-8" aria-haspopup="dialog" onClick={onEdit}>
              <Pencil aria-hidden />
              Editar
            </Button>
            <Button size="sm" variant="ghost" className="h-11 sm:h-8" onClick={() => setArchiving(true)}>
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

  const today = todayInZone(timeZone);

  return (
    <>
      <ListCard
        title="Períodos"
        description="Identifican cada práctica en su código (P1-S12-ANT03) y fuera de ellos no se agenda."
        action={
          canManage ? (
            <Button size="sm" className="h-11 sm:h-8" aria-haspopup="dialog" onClick={() => openSheet()}>
              <Plus aria-hidden />
              Nuevo período
            </Button>
          ) : undefined
        }
      >
        {periods.isPending ? (
          <div aria-busy="true" className="border-t border-line p-5 sm:px-6">
            <Skeleton className="h-16" />
          </div>
        ) : periods.isError ? (
          <div className="border-t border-line">
            <QueryErrorState error={periods.error} onRetry={() => void periods.refetch()} />
          </div>
        ) : (
          <>
            {active.length === 0 ? (
              <p className="border-t border-line px-5 py-5 text-sm text-ink-muted sm:px-6">Aún no hay períodos: mientras no exista uno, no se agenda.</p>
            ) : (
              <ListRows>
                {active.map((entry) => (
                  <PeriodRow key={entry.id} workspaceId={workspaceId} period={entry} today={today} {...(canManage ? { onEdit: () => openSheet(entry) } : {})} />
                ))}
              </ListRows>
            )}
            {archived.length > 0 ? (
              <ArchivedRows count={archived.length}>
                {archived.map((entry) => (
                  <PeriodRow key={entry.id} workspaceId={workspaceId} period={entry} today={today} />
                ))}
              </ArchivedRows>
            ) : null}
          </>
        )}
      </ListCard>
      {sheet ? (
        <PeriodSheet
          key={sheet.n}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          period={sheet.period}
          today={today}
        />
      ) : null}
    </>
  );
}
