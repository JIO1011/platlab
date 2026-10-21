import type { Space } from '@platlab/contracts';
import { Badge, Button, Skeleton, StatePanel, toast } from '@platlab/ui';
import { DoorOpen, Pencil, Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ConfirmArchive } from '../../app/confirm-archive';
import { addDays, todayInZone } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { ClosuresSection } from './closures';
import { labsErrorMessage, useArchiveSpace } from './commands';
import { useLabs } from './context';
import { hoursSummary } from './hours-text';
import { LeadDaysSection } from './lead-days';
import { useClosures, useLabsSettings, useSpaces } from './queries';
import { SectionHeader } from '../../app/section-header';
import { SpaceSheet } from './space-sheet';

/** Una hoja de espacio abierta: habilitar, editar o volver a habilitar uno archivado; `n` la monta de nuevo en cada apertura. */
type SpaceForm = { n: number; open: boolean; space?: Space };

/** Los espacios por sede o edificio, en el orden en que llegan (el servidor los ordena por sede y nombre del área). */
function groupSpaces(items: Space[]): Array<[string | null, Space[]]> {
  const groups = new Map<string | null, Space[]>();
  for (const item of items) groups.set(item.groupName, [...(groups.get(item.groupName) ?? []), item]);
  return [...groups];
}

/** Archivar un espacio con su confirmación aquí mismo: deja de agendarse y no se deshace desde esta pantalla. */
function ArchiveSpace({ workspaceId, space, onCancel }: { workspaceId: string; space: Space; onCancel: () => void }) {
  const archive = useArchiveSpace(workspaceId, space.areaId);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setError(null);
    try {
      await archive.mutateAsync(undefined);
      toast.success('Espacio archivado', { description: space.areaName });
    } catch (failure) {
      setError(labsErrorMessage(failure));
    }
  };
  return (
    <ConfirmArchive
      label={`Archivar ${space.areaName}`}
      text={`${space.areaName} dejará de agendarse. Sus cierres siguen y el área sigue en Áreas.`}
      action="Archivar espacio"
      pending={archive.isPending}
      error={error}
      onConfirm={() => void confirm()}
      onCancel={onCancel}
    />
  );
}

/**
 * Un espacio en su tarjeta (ADR 0023): el área, su aforo y el resumen de su horario. Un espacio activo se edita o se
 * archiva; uno archivado se habilita de nuevo, salvo que su área también esté archivada en «Áreas».
 */
function SpaceCard({ space, canManage, onEdit, workspaceId }: { space: Space; canManage: boolean; onEdit: (space: Space) => void; workspaceId: string }) {
  const [archiving, setArchiving] = useState(false);
  const archived = space.archivedAt !== null;
  const hours = hoursSummary(space.weeklyHours);
  return (
    <li className="grid gap-3 rounded-card bg-surface px-4 py-4 shadow-raised sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="break-words font-semibold text-ink">{space.areaName}</span>
            {space.areaArchived ? <Badge tone="warning">Área archivada</Badge> : null}
          </p>
          <p className="mt-1 text-sm tabular-nums text-ink-muted">{space.capacity === 1 ? 'Aforo: 1 persona' : `Aforo: ${space.capacity} personas`}</p>
        </div>
        {canManage && !archiving ? (
          <div className="flex gap-2 max-sm:w-full">
            {archived ? (
              space.areaArchived ? null : (
                <Button className="h-11 sm:h-9 max-sm:flex-1" aria-haspopup="dialog" onClick={() => onEdit(space)}>
                  <RotateCcw aria-hidden />
                  Habilitar de nuevo
                </Button>
              )
            ) : (
              <>
                <Button className="h-11 sm:h-9 max-sm:flex-1" aria-haspopup="dialog" onClick={() => onEdit(space)}>
                  <Pencil aria-hidden />
                  Editar
                </Button>
                <Button variant="ghost" className="h-11 sm:h-9 max-sm:flex-1" onClick={() => setArchiving(true)}>
                  Archivar
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
      {hours.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin horario: no se puede agendar ningún día.</p>
      ) : (
        <ul className="grid gap-0.5 text-sm tabular-nums text-ink">
          {hours.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {space.areaArchived && !archived ? <p className="text-sm text-ink-muted">El área se archivó en Áreas: ya no se agenda.</p> : null}
      {archiving ? <ArchiveSpace workspaceId={workspaceId} space={space} onCancel={() => setArchiving(false)} /> : null}
    </li>
  );
}

/**
 * Espacios de Laboratorios (ADR 0023): las áreas del Núcleo que se pueden agendar, por sede o edificio, con su aforo y
 * su horario; la anticipación con que se solicita y los cierres (feriados comunes y cierres de un área). El
 * Administrador habilita, edita, archiva y carga cierres; lo confirmado por el servidor es lo único que se muestra.
 */
export function LabsSpacesPage() {
  const { workspaceId, me, canManageSpaces } = useLabs();
  const spaces = useSpaces(workspaceId);
  const settings = useLabsSettings(workspaceId);
  const today = todayInZone(me.workspace.timeZone);
  const closures = useClosures(workspaceId, today, addDays(today, 365));
  const [form, setForm] = useState<SpaceForm | null>(null);
  const openForm = (space?: Space) => setForm({ n: (form?.n ?? 0) + 1, open: true, ...(space ? { space } : {}) });

  const items = spaces.data?.items ?? [];
  const active = items.filter((entry) => entry.archivedAt === null);
  const archived = items.filter((entry) => entry.archivedAt !== null);

  const enable = canManageSpaces ? (
    <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => openForm()}>
      <Plus aria-hidden />
      Habilitar área
    </Button>
  ) : undefined;

  return (
    <>
      <SectionHeader
        title="Espacios"
        updatedAt={Math.min(spaces.dataUpdatedAt, settings.dataUpdatedAt, closures.dataUpdatedAt)}
        actions={enable}
      />
      <div className="mt-6 grid gap-8">
        <section aria-labelledby="labs-spaces" className="grid gap-4">
          <h2 id="labs-spaces" className="text-lg font-semibold text-ink">
            Áreas que se agendan
          </h2>
          {spaces.isPending ? (
            <div aria-busy="true">
              <Skeleton className="h-48 rounded-card" />
            </div>
          ) : spaces.isError ? (
            <div className="rounded-card bg-surface shadow-raised">
              <QueryErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
            </div>
          ) : active.length === 0 ? (
            <div className="rounded-card bg-surface shadow-raised">
              <StatePanel
                icon={DoorOpen}
                title="Aún no hay áreas habilitadas"
                description={
                  canManageSpaces ? (
                    <>
                      Habilita un área para poder agendarla. Si todavía no existe, créala en{' '}
                      <Link to={`/e/${workspaceId}/areas`} className="font-medium text-action underline">
                        Áreas
                      </Link>
                      .
                    </>
                  ) : (
                    'Quien administra el espacio habilita las áreas que se agendan. Cuando existan, las verás aquí.'
                  )
                }
                action={
                  canManageSpaces ? (
                    <Button variant="primary" className="h-11 sm:h-10" aria-haspopup="dialog" onClick={() => openForm()}>
                      <Plus aria-hidden />
                      Habilitar área
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            groupSpaces(active).map(([group, entries]) => (
              <div key={group ?? ''} className="grid gap-3">
                <h3 className="text-sm font-medium text-ink-muted">{group ?? 'Sin sede ni edificio'}</h3>
                <ul className="grid gap-3 sm:gap-4">
                  {entries.map((entry) => (
                    <SpaceCard key={entry.areaId} workspaceId={workspaceId} space={entry} canManage={canManageSpaces} onEdit={openForm} />
                  ))}
                </ul>
              </div>
            ))
          )}
          {archived.length > 0 ? (
            <details>
              <summary className="min-h-11 cursor-pointer list-none text-sm font-medium text-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action [&::-webkit-details-marker]:hidden">
                Archivados ({archived.length})
              </summary>
              <ul className="mt-3 grid gap-3 sm:gap-4">
                {archived.map((entry) => (
                  <SpaceCard key={entry.areaId} workspaceId={workspaceId} space={entry} canManage={canManageSpaces} onEdit={openForm} />
                ))}
              </ul>
            </details>
          ) : null}
        </section>
        <LeadDaysSection workspaceId={workspaceId} settings={settings} canManage={canManageSpaces} />
        <ClosuresSection
          workspaceId={workspaceId}
          closures={closures}
          spaces={active.filter((entry) => !entry.areaArchived)}
          today={today}
          canManage={canManageSpaces}
        />
      </div>
      {form ? (
        <SpaceSheet
          key={form.n}
          workspaceId={workspaceId}
          open={form.open}
          onOpenChange={(open) => setForm((current) => (current ? { ...current, open } : current))}
          space={form.space}
        />
      ) : null}
    </>
  );
}
