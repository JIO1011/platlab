import { Button, Sheet, sectionLabel } from '@platlab/ui';
import { Archive, Building2, Pencil, Plus } from 'lucide-react';
import { ManagerLine } from '../../../app/manager-line';
import type { AreaTarget } from '../commands';
import { shelfRows, type WorkspaceArea } from '../plan-model';

/** Lo que se puede hacer desde la hoja de un área; la página abre la hoja que corresponde. */
type AreaAction =
  | { kind: 'manager' }
  | { kind: 'new-shelf' }
  | { kind: 'rename'; target: AreaTarget }
  | { kind: 'archive'; target: AreaTarget };

const rowButton = 'size-11 sm:size-9';

/**
 * Un área abierta (ADR 0024): su encargado y sus estantes. Cualquiera con acceso a Áreas la consulta; quien
 * administra además asigna el encargado, crea, renombra y archiva estantes, y renombra o archiva el área.
 * Cada acción abre su propia hoja y, al terminar, vuelve aquí.
 */
export function AreaSheet({
  area,
  canManage,
  onAction,
  onClose,
}: {
  area: WorkspaceArea;
  canManage: boolean;
  onAction: (action: AreaAction) => void;
  onClose: () => void;
}) {
  const rows = shelfRows(area);
  const areaTarget: AreaTarget = { kind: 'area', id: area.id, name: area.name };
  return (
    <Sheet
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      icon={Building2}
      title={area.name}
      description={area.group?.name ?? 'Sin edificio'}
      footer={
        canManage ? (
          <>
            <Button variant="ghost" className="h-12 rounded-2xl px-4 text-danger hover:text-danger" onClick={() => onAction({ kind: 'archive', target: areaTarget })}>
              <Archive aria-hidden />
              Archivar
            </Button>
            <Button className="h-12 flex-1 rounded-2xl font-semibold" onClick={() => onAction({ kind: 'rename', target: areaTarget })}>
              <Pencil aria-hidden />
              Cambiar nombre
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="grid gap-6">
        <section aria-labelledby="area-manager" className="grid gap-2">
          <h3 id="area-manager" className={sectionLabel}>
            Encargado
          </h3>
          <div className="flex items-center justify-between gap-3">
            <ManagerLine manager={area.manager} />
            {canManage ? (
              <Button size="sm" onClick={() => onAction({ kind: 'manager' })}>
                {area.manager ? 'Cambiar' : 'Asignar'}
              </Button>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="area-shelves" className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 id="area-shelves" className={sectionLabel}>
              Estantes <span className="tabular-nums">({rows.length})</span>
            </h3>
            {canManage ? (
              <Button size="sm" onClick={() => onAction({ kind: 'new-shelf' })}>
                <Plus aria-hidden />
                Nuevo estante
              </Button>
            ) : null}
          </div>
          {rows.length === 0 ? (
            <p className="rounded-control bg-surface-sunken px-3 py-3 text-sm text-ink-muted">
              {canManage ? 'Esta área aún no tiene estantes. Agrega el primero con «Nuevo estante».' : 'Esta área aún no tiene estantes.'}
            </p>
          ) : (
            <ul aria-label={`Estantes de ${area.name}`} className="divide-y divide-line rounded-control border border-line bg-surface/60">
              {rows.map(({ shelf, depth }) => {
                const target: AreaTarget = { kind: 'shelf', id: shelf.id, name: shelf.name };
                return (
                  <li key={shelf.id} className="flex min-h-11 items-center justify-between gap-2 py-1 pr-1.5" style={{ paddingLeft: `${0.75 + depth}rem` }}>
                    <span className="min-w-0 break-words text-sm text-ink">{shelf.name}</span>
                    {canManage ? (
                      <span className="flex shrink-0">
                        <Button variant="ghost" size="icon" className={rowButton} aria-label={`Cambiar nombre de ${shelf.name}`} onClick={() => onAction({ kind: 'rename', target })}>
                          <Pencil aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" className={rowButton} aria-label={`Archivar ${shelf.name}`} onClick={() => onAction({ kind: 'archive', target })}>
                          <Archive aria-hidden />
                        </Button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Sheet>
  );
}
