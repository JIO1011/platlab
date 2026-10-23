import type { Closure } from '@platlab/contracts';
import { Button, Skeleton, sectionLabel, toast } from '@platlab/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ConfirmArchive } from '../../app/confirm-archive';
import { addDays, formatDate, todayInZone } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { ClosureSheet, type ClosureScope } from './closure-sheet';
import { labsErrorMessage, useVoidClosure } from './commands';
import { useClosures } from './queries';

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

/** Un cierre: las fechas y el motivo; el administrador puede anularlo. */
function ClosureRow({ workspaceId, closure, canManage }: { workspaceId: string; closure: Closure; canManage: boolean }) {
  const [voiding, setVoiding] = useState(false);
  return (
    <li className="grid gap-3 px-3 py-2.5">
      <div className="flex items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold tabular-nums text-ink">
            {closure.startsOn === closure.endsOn ? formatDate(closure.startsOn) : `${formatDate(closure.startsOn)} – ${formatDate(closure.endsOn)}`}
          </p>
          <p className="mt-0.5 break-words text-sm text-ink-muted">{closure.reason}</p>
        </div>
        {canManage && !voiding ? (
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setVoiding(true)}>
            Anular
          </Button>
        ) : null}
      </div>
      {voiding ? <VoidClosure workspaceId={workspaceId} closure={closure} onCancel={() => setVoiding(false)} /> : null}
    </li>
  );
}

/**
 * Los cierres del próximo año (ADR 0023), del más cercano al más lejano: los de un área o, sin ella, los feriados comunes.
 * El administrador agrega uno en su hoja y anula los que ya no valen; lo confirmado por el servidor es lo único que se muestra.
 */
export function ClosuresList({
  workspaceId,
  timeZone,
  scope,
  canManage,
  heading,
  addLabel,
  emptyText,
}: {
  workspaceId: string;
  timeZone: string;
  scope: ClosureScope;
  canManage: boolean;
  heading: string;
  addLabel: string;
  emptyText: string;
}) {
  const today = todayInZone(timeZone);
  const closures = useClosures(workspaceId, today, addDays(today, 365));
  // `n` monta la hoja de nuevo en cada apertura, con la fecha de hoy.
  const [sheet, setSheet] = useState<{ n: number; open: boolean } | null>(null);
  const items = (closures.data?.items ?? [])
    .filter((entry) => entry.areaId === (scope?.areaId ?? null))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.endsOn.localeCompare(b.endsOn));

  return (
    <section aria-label={heading} className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className={sectionLabel}>{heading}</h4>
        {canManage ? (
          <Button size="sm" aria-haspopup="dialog" onClick={() => setSheet({ n: (sheet?.n ?? 0) + 1, open: true })}>
            <Plus aria-hidden />
            {addLabel}
          </Button>
        ) : null}
      </div>
      {closures.isPending ? (
        <div aria-busy="true">
          <Skeleton className="h-16" />
        </div>
      ) : closures.isError ? (
        <QueryErrorState error={closures.error} onRetry={() => void closures.refetch()} />
      ) : items.length === 0 ? (
        <p className="rounded-control bg-surface-sunken px-3 py-3 text-sm text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line rounded-control border border-line bg-surface/60">
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
          scope={scope}
          today={today}
        />
      ) : null}
    </section>
  );
}
