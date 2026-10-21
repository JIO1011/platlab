import type { Space } from '@platlab/contracts';
import { Button, Skeleton, toast } from '@platlab/ui';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { ConfirmArchive } from '../../app/confirm-archive';
import { CodeTag } from '../../app/code-tag';
import { QueryErrorState } from '../../app/states';
import { useLabsAccess } from './area-access';
import { ClosuresList } from './closures';
import { labsErrorMessage, useArchiveSpace } from './commands';
import { hoursSummary } from './hours-text';
import { useSpaces } from './queries';
import { SpaceSheet } from './space-sheet';

/** Archivar el espacio con su confirmación aquí mismo: deja de agendarse y no se deshace desde esta pantalla. */
function ArchiveSpace({ workspaceId, space, areaName, onCancel }: { workspaceId: string; space: Space; areaName: string; onCancel: () => void }) {
  const archive = useArchiveSpace(workspaceId, space.areaId);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setError(null);
    try {
      await archive.mutateAsync(undefined);
      toast.success('Espacio archivado', { description: areaName });
    } catch (failure) {
      setError(labsErrorMessage(failure));
    }
  };
  return (
    <ConfirmArchive
      label={`Archivar el espacio de ${areaName}`}
      text={`${areaName} dejará de agendarse. Sus cierres siguen y el área sigue en Áreas.`}
      action="Archivar espacio"
      pending={archive.isPending}
      error={error}
      onConfirm={() => void confirm()}
      onCancel={onCancel}
    />
  );
}

/** Sigla, aforo y horario semanal del espacio; quien administra los edita o archiva. */
function SpaceDetails({ workspaceId, space, areaName, canManage, onEdit }: { workspaceId: string; space: Space; areaName: string; canManage: boolean; onEdit: () => void }) {
  const [archiving, setArchiving] = useState(false);
  const hours = hoursSummary(space.weeklyHours);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="grid gap-1 text-sm">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums text-ink">
            <span>{space.capacity === 1 ? 'Aforo: 1 persona' : `Aforo: ${space.capacity} personas`}</span>
            <span className="inline-flex items-center gap-1.5">
              Sigla
              <CodeTag>{space.abbreviation}</CodeTag>
            </span>
          </p>
          {hours.length === 0 ? (
            <p className="text-ink-muted">Sin horario: no se puede agendar ningún día.</p>
          ) : (
            <ul className="grid gap-0.5 tabular-nums text-ink-muted">
              {hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        {canManage && !archiving ? (
          <div className="flex gap-1">
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
      {archiving ? <ArchiveSpace workspaceId={workspaceId} space={space} areaName={areaName} onCancel={() => setArchiving(false)} /> : null}
    </div>
  );
}

/**
 * El panel «Laboratorio» de la hoja de un área (ADR 0023): si el área está habilitada para prácticas, su sigla, su aforo, su horario
 * semanal y sus cierres; si no, «Habilitar para prácticas» a quien administra. Lo confirmado por el servidor es lo único que se muestra.
 */
export function AreaLabPanel({ areaId, areaName }: { areaId: string; areaName: string }) {
  const { workspaceId, me, canManage } = useLabsAccess();
  const spaces = useSpaces(workspaceId);
  // `n` monta la hoja de nuevo en cada apertura.
  const [sheet, setSheet] = useState<{ n: number; open: boolean } | null>(null);
  const openSheet = () => setSheet({ n: (sheet?.n ?? 0) + 1, open: true });

  if (!me || spaces.isPending) return <Skeleton className="h-24" />;
  if (spaces.isError) return <QueryErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />;

  // Un espacio archivado cuenta como no habilitado: la hoja lo reactiva con sus datos.
  const space = spaces.data.items.find((entry) => entry.areaId === areaId);
  const active = space && space.archivedAt === null ? space : undefined;

  return (
    <>
      {active ? (
        <div className="grid gap-5">
          <SpaceDetails workspaceId={workspaceId} space={active} areaName={areaName} canManage={canManage} onEdit={openSheet} />
          <ClosuresList
            workspaceId={workspaceId}
            timeZone={me.workspace.timeZone}
            scope={{ areaId, areaName }}
            canManage={canManage}
            heading="Cierres próximos"
            addLabel="Nuevo cierre"
            emptyText="Sin cierres en el próximo año."
          />
        </div>
      ) : (
        <div className="grid justify-items-start gap-3 rounded-control bg-surface-sunken px-3 py-3">
          <p className="text-sm text-ink-muted">
            {canManage ? 'Esta área aún no se agenda para prácticas.' : 'Esta área no está habilitada para prácticas.'}
          </p>
          {canManage ? (
            <Button variant="primary" className="h-11 sm:h-10" aria-haspopup="dialog" onClick={openSheet}>
              Habilitar para prácticas
            </Button>
          ) : null}
        </div>
      )}
      {sheet ? (
        <SpaceSheet
          key={sheet.n}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          areaId={areaId}
          areaName={areaName}
          space={space}
          takenAbbreviations={spaces.data.items.filter((entry) => entry.areaId !== areaId).map((entry) => entry.abbreviation)}
        />
      ) : null}
    </>
  );
}
