import { Segmented, Skeleton, StatePanel } from '@platlab/ui';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useShell } from '../../app/app-shell';
import { useAreasOverview } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { AreasView, DepartmentsView } from './areas-view';
import type { AreaTarget } from './commands';
import { HeaderActions } from './extensions';
import { groupChoices } from './plan-model';
import { ArchiveSheet } from './sheets/archive-sheet';
import { AreaSheet } from './sheets/area-sheet';
import { ManagerSheet } from './sheets/manager-sheet';
import { NewAreaSheet, NewDepartmentSheet, NewShelfSheet, RenameSheet } from './sheets/name-sheets';

type View = 'areas' | 'departamentos';

/**
 * La hoja abierta. Las acciones de un área (encargado, estante nuevo, renombrar, archivar) abren su hoja con
 * `areaId` y, al terminar o cancelar, vuelven a la hoja del área; las de un departamento, a la página.
 */
type Dialog =
  | { kind: 'area'; areaId: string }
  | { kind: 'new-area'; groupId: string | null }
  | { kind: 'new-department' }
  | { kind: 'manager' | 'new-shelf'; areaId: string }
  | { kind: 'rename' | 'archive'; target: AreaTarget; areaId: string | null };

const intro: Record<View, string> = {
  areas: 'Dónde está cada cosa: el laboratorio por edificio, con lo que guarda cada área.',
  departamentos: 'De quién es cada cosa: lo que tiene cada departamento.',
};

/** Esqueleto con la forma de los cuartos mientras llegan las áreas. */
function PlanSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-4 pt-3 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-40 rounded-panel" />
      ))}
    </div>
  );
}

/**
 * Áreas y Departamentos (ADR 0024): el croquis del laboratorio. La app dibuja un cuadro por área dentro de su sede
 * o edificio, y otro por departamento; nadie dibuja ni mueve cuadros. Cada cuadro cuenta lo que hay por módulo y
 * cada cifra abre la lista del módulo filtrada. Todos los miembros con acceso consultan; quien administra crea,
 * renombra, archiva y asigna encargados, con una hoja por acción.
 */
export function AreasPage() {
  const { workspaceId, me } = useShell();
  const overview = useAreasOverview(workspaceId, me.areas !== 'none');
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const view: View = params.get('vista') === 'departamentos' ? 'departamentos' : 'areas';
  const base = `/e/${workspaceId}`;

  const changeView = (next: View) =>
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next === 'areas') copy.delete('vista');
        else copy.set('vista', next);
        return copy;
      },
      { replace: true },
    );

  const data = overview.data;
  const areaOf = (areaId: string) => data?.areas.find((area) => area.id === areaId);
  // De una hoja de acción se vuelve a la hoja del área de la que salió, o a la página.
  const backTo = (current: Dialog) => setDialog('areaId' in current && current.areaId ? { kind: 'area', areaId: current.areaId } : null);
  const close = () => setDialog(null);

  const sheet = (() => {
    if (!data || !dialog) return null;
    switch (dialog.kind) {
      case 'area': {
        const area = areaOf(dialog.areaId);
        return area ? (
          <AreaSheet
            area={area}
            canManage={data.canManage}
            onClose={close}
            onAction={(action) => {
              if (action.kind === 'manager' || action.kind === 'new-shelf') setDialog({ kind: action.kind, areaId: area.id });
              else setDialog({ kind: action.kind, target: action.target, areaId: area.id });
            }}
          />
        ) : null;
      }
      case 'new-area':
        return <NewAreaSheet workspaceId={workspaceId} groups={groupChoices(data.areas)} groupId={dialog.groupId} onClose={close} />;
      case 'new-department':
        return <NewDepartmentSheet workspaceId={workspaceId} onClose={close} />;
      case 'new-shelf': {
        const area = areaOf(dialog.areaId);
        return area ? <NewShelfSheet workspaceId={workspaceId} area={area} onClose={() => backTo(dialog)} /> : null;
      }
      case 'manager': {
        const area = areaOf(dialog.areaId);
        return area ? <ManagerSheet workspaceId={workspaceId} area={area} onClose={() => backTo(dialog)} /> : null;
      }
      case 'rename':
        return <RenameSheet workspaceId={workspaceId} target={dialog.target} onClose={() => backTo(dialog)} />;
      case 'archive':
        return (
          <ArchiveSheet
            workspaceId={workspaceId}
            target={dialog.target}
            onClose={() => backTo(dialog)}
            // Un área archivada ya no tiene hoja a la que volver.
            onArchived={() => (dialog.target.kind === 'area' ? close() : backTo(dialog))}
          />
        );
    }
  })();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 tabIndex={-1} data-focus-fallback className="text-display text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
            Áreas
          </h1>
          <p aria-live="polite" className="mt-2 max-w-prose text-body-lg font-medium text-ink-muted">{intro[view]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HeaderActions />
          <Segmented<View>
            label="Vista"
            value={view}
            onValueChange={changeView}
            options={[
              { value: 'areas', label: 'Áreas' },
              { value: 'departamentos', label: 'Departamentos' },
            ]}
          />
        </div>
      </header>

      <div className="mt-8">
        {me.areas === 'none' ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel icon={Lock} title="Sin permiso" description="Tu rol en este espacio no incluye las áreas. Si las necesitas, pídeselas a quien administra el espacio." />
          </div>
        ) : overview.isPending ? (
          <PlanSkeleton />
        ) : data === undefined ? (
          <QueryErrorState error={overview.error} onRetry={() => void overview.refetch()} />
        ) : view === 'areas' ? (
          <AreasView
            areas={data.areas}
            base={base}
            canManage={data.canManage}
            onOpen={(areaId) => setDialog({ kind: 'area', areaId })}
            onNew={(groupId) => setDialog({ kind: 'new-area', groupId })}
          />
        ) : (
          <DepartmentsView
            departments={data.departments}
            base={base}
            canManage={data.canManage}
            onNew={() => setDialog({ kind: 'new-department' })}
            onRename={(target) => setDialog({ kind: 'rename', target, areaId: null })}
            onArchive={(target) => setDialog({ kind: 'archive', target, areaId: null })}
          />
        )}
      </div>
      {sheet}
    </div>
  );
}
