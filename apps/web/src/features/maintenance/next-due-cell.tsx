import { Skeleton } from '@platlab/ui';
import { useParams } from 'react-router';
import { formatDate } from '../../app/format';
import { useWorkspaceMe } from '../../app/queries';
import { dueTone, todayInZone, workStatus } from './due';
import { DuePill } from './due-view';
import { useNextDue } from './queries';
import { kindLabels } from './work-text';

/**
 * La celda «Próximo mantenimiento» de la tabla de equipos (ADR 0020, 0021): el tipo y la fecha en texto
 * («Calibración · 20/10/2026») y debajo el plazo en pastilla —rojo vencido o no conforme, ámbar hasta 30 días, verde
 * después— y «Sin plan» en gris. Si falla la carga, «—» con su
 * título: nunca «Sin plan», que sería afirmar algo que no se sabe. Las filas visibles se piden juntas.
 */
export function NextDueCell({ assetId, assetIds }: { assetId: string; assetIds: string[] }) {
  const { workspaceId = '' } = useParams();
  const me = useWorkspaceMe(workspaceId);
  const next = useNextDue(workspaceId, assetId, assetIds);
  if (next.isPending || !me.data) return <Skeleton className="h-4 w-24" />;
  if (next.isError) {
    return (
      <span title="No se pudo cargar el próximo mantenimiento" className="text-ink-muted">
        —<span className="sr-only"> No se pudo cargar el próximo mantenimiento</span>
      </span>
    );
  }
  const today = todayInZone(me.data.workspace.timeZone, Date.now());
  const entry = next.data;
  if (!entry) return <DuePill tone="neutral">Sin plan</DuePill>;
  const tone = dueTone(entry, today);
  const failed = entry.lastResult === 'fail';
  return (
    <span title={entry.plan.title} className="grid min-w-0 justify-items-start gap-1 text-sm">
      <span className="max-w-full truncate text-ink">
        {kindLabels[entry.plan.kind]} · <span className="tabular-nums">{formatDate(entry.dueOn)}</span>
      </span>
      <DuePill tone={failed ? 'danger' : tone}>{failed ? 'No conforme' : workStatus({ ...entry, lastPerformedOn: null }, today).text}</DuePill>
    </span>
  );
}
