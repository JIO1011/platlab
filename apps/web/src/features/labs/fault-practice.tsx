import { ClipboardList } from 'lucide-react';
import { useParams } from 'react-router';
import { useIncidentPractice } from './queries';
import { shortDateText } from './schedule-placement';

/**
 * La práctica en que se reportó un incidente (L-01e, ADR 0023; punto de extensión de la hoja del incidente en Equipos):
 * su código, quién la pidió, cuándo y en qué área. Si el incidente no nació de una práctica, no pinta nada.
 */
export function FaultPractice({ faultId }: { faultId: string }) {
  const { workspaceId = '' } = useParams();
  const practice = useIncidentPractice(workspaceId, faultId).data?.practice;
  if (!practice) return null;
  return (
    <p className="flex items-start gap-2 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink">
      <ClipboardList aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
      <span className="min-w-0 break-words">
        Reportado en la práctica <span className="font-semibold tabular-nums">{practice.code}</span> · {practice.requesterName} ·{' '}
        <span className="tabular-nums">
          {shortDateText(practice.date)} {practice.startsAt}–{practice.endsAt}
        </span>{' '}
        · {practice.areaName}
      </span>
    </p>
  );
}
