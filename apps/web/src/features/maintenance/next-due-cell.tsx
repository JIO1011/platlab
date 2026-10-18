import { Skeleton } from '@platlab/ui';
import { useParams } from 'react-router';
import { formatDate } from '../../app/format';
import { useWorkspaceMe } from '../../app/queries';
import { dueTone, todayInZone, workStatus } from './due';
import { DueDot, toneText } from './due-view';
import { useNextDue } from './queries';
import { kindLabels } from './work-text';

/**
 * La celda «Próximo mantenimiento» de la tabla de equipos (ADR 0020): «Calibración · 20 oct» con el punto del semáforo
 * —rojo vencido o no conforme, ámbar hasta 30 días, verde después— y «Sin plan» en gris. Si falla la carga, «—» con su
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
  if (!entry) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
        <DueDot tone="neutral" />
        Sin plan
      </span>
    );
  }
  const tone = dueTone(entry, today);
  const failed = entry.lastResult === 'fail';
  return (
    <span title={entry.plan.title} className="inline-flex items-start gap-1.5 text-sm">
      <DueDot tone={tone} className="mt-[7px]" />
      <span className="grid">
        <span className={failed ? `font-medium ${toneText.danger}` : 'text-ink'}>
          {kindLabels[entry.plan.kind]} · {failed ? 'No conforme' : <span className="tabular-nums">{formatDate(entry.dueOn)}</span>}
        </span>
        {failed ? null : <span className={`text-[13px] font-medium ${toneText[tone]}`}>{workStatus({ ...entry, lastPerformedOn: null }, today).text}</span>}
      </span>
    </span>
  );
}
