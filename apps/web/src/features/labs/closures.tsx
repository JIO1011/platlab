import type { Closure, ClosureList, Space } from '@platlab/contracts';
import { Badge, Button, Skeleton, StatePanel, toast } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { CalendarOff, Plus } from 'lucide-react';
import { useState } from 'react';
import { ConfirmArchive } from '../../app/confirm-archive';
import { formatDate } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { ClosureSheet } from './closure-sheet';
import { labsErrorMessage, useVoidClosure } from './commands';

/** Anular un cierre con su confirmación aquí mismo: deja de contar, no se borra y no se deshace desde esta pantalla. */
function VoidClosure({ workspaceId, closure, onCancel }: { workspaceId: string; closure: Closure; onCancel: () => void }) {
  const voidClosure = useVoidClosure(workspaceId, closure.id);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setError(null);
    try {
      await voidClosure.mutateAsync(undefined);
      toast.success('Cierre anulado', { description: closure.reason });
    } catch (failure) {
      setError(labsErrorMessage(failure));
    }
  };
  return (
    <ConfirmArchive
      label={`Anular el cierre «${closure.reason}»`}
      text="El cierre dejará de contar y ya no aparecerá en la lista. Los días volverán a poder agendarse."
      action="Anular cierre"
      pending={voidClosure.isPending}
      error={error}
      onConfirm={() => void confirm()}
      onCancel={onCancel}
    />
  );
}

/** Un cierre: las fechas, el motivo y de qué es; sin área, el feriado común lleva «Todo el espacio». */
function ClosureRow({ workspaceId, closure, canManage }: { workspaceId: string; closure: Closure; canManage: boolean }) {
  const [voiding, setVoiding] = useState(false);
  return (
    <li className="grid gap-3 rounded-card bg-surface px-4 py-4 shadow-raised sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="font-semibold tabular-nums text-ink">
            {closure.startsOn === closure.endsOn ? formatDate(closure.startsOn) : `${formatDate(closure.startsOn)} – ${formatDate(closure.endsOn)}`}
          </p>
          <p className="mt-1 break-words text-sm text-ink-muted">{closure.reason}</p>
          <p className="mt-2 text-sm text-ink">{closure.areaName === null ? <Badge tone="info">Todo el espacio</Badge> : closure.areaName}</p>
        </div>
        {canManage && !voiding ? (
          <Button variant="ghost" className="h-11 sm:h-9 max-sm:w-full" onClick={() => setVoiding(true)}>
            Anular
          </Button>
        ) : null}
      </div>
      {voiding ? <VoidClosure workspaceId={workspaceId} closure={closure} onCancel={() => setVoiding(false)} /> : null}
    </li>
  );
}

/**
 * Cierres de Laboratorios (ADR 0023): los próximos feriados comunes y cierres de un área, del más cercano al más lejano.
 * Crear uno abre su hoja; anularlo pide confirmación y lo quita de la lista.
 */
export function ClosuresSection({
  workspaceId,
  closures,
  spaces,
  today,
  canManage,
}: {
  workspaceId: string;
  closures: UseQueryResult<ClosureList>;
  /** Los espacios activos que se pueden cerrar. */
  spaces: Space[];
  today: string;
  canManage: boolean;
}) {
  // `n` monta la hoja de nuevo en cada apertura, con la fecha de hoy.
  const [sheet, setSheet] = useState<{ n: number; open: boolean } | null>(null);
  const items = [...(closures.data?.items ?? [])].sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.endsOn.localeCompare(b.endsOn));
  const create = () => setSheet({ n: (sheet?.n ?? 0) + 1, open: true });

  return (
    <section aria-labelledby="labs-closures" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 id="labs-closures" className="text-lg font-semibold text-ink">
          Cierres próximos
        </h2>
        {canManage ? (
          <Button className="h-11 sm:h-9 max-sm:w-full" aria-haspopup="dialog" onClick={create}>
            <Plus aria-hidden />
            Nuevo cierre
          </Button>
        ) : null}
      </div>
      {closures.isPending ? (
        <div aria-busy="true">
          <Skeleton className="h-24 rounded-card" />
        </div>
      ) : closures.isError ? (
        <div className="rounded-card bg-surface shadow-raised">
          <QueryErrorState error={closures.error} onRetry={() => void closures.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-card bg-surface shadow-raised">
          <StatePanel
            icon={CalendarOff}
            title="Sin cierres en el próximo año"
            description={canManage ? 'Registra los feriados de todo el espacio y los cierres de un área para que no se agenden esos días.' : 'Cuando se registren feriados o cierres, los verás aquí.'}
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:gap-4">
          {items.map((entry) => (
            <ClosureRow key={entry.id} workspaceId={workspaceId} closure={entry} canManage={canManage} />
          ))}
        </ul>
      )}
      {sheet ? (
        <ClosureSheet
          key={sheet.n}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          spaces={spaces}
          today={today}
        />
      ) : null}
    </section>
  );
}
