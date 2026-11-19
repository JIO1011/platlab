import { Badge } from '@platlab/ui';
import { CalendarClock } from 'lucide-react';
import type { ExpiryStatus } from './text';

const badgeTone = { danger: 'danger', warning: 'warning', accent: 'info', neutral: 'neutral' } as const;

/** El semáforo de un lote en una pastilla (02 §12, MA-01f): el texto dice el estado y el color lo refuerza. */
export function ExpiryBadge({ status }: { status: ExpiryStatus }) {
  return (
    <Badge tone={badgeTone[status.tone]} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px]">
      <CalendarClock className="size-3 shrink-0" aria-hidden />
      {status.label}
    </Badge>
  );
}
