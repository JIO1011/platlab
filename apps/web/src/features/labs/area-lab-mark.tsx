import { Clock } from 'lucide-react';
import { useLabsAccess } from './area-access';
import { useSpaces } from './queries';

/** La marca del cuadro de un área con espacio activo (ADR 0023): «Habilitada para prácticas». Todas comparten una consulta. */
export function AreaLabMark({ areaId }: { areaId: string }) {
  const { workspaceId } = useLabsAccess();
  const spaces = useSpaces(workspaceId);
  if (!spaces.data?.items.some((entry) => entry.areaId === areaId && entry.archivedAt === null)) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
      <Clock className="size-3.5 shrink-0" aria-hidden />
      Habilitada para prácticas
    </p>
  );
}
