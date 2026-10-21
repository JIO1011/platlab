import type { AreasOverview } from '@platlab/contracts';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, StatePanel } from '@platlab/ui';
import { Archive, MapPinned, EllipsisVertical, Pencil, Plus, Users } from 'lucide-react';
import { ManagerLine } from '../../app/manager-line';
import type { AreaTarget } from './commands';
import { byName, groupAreas } from './plan-model';
import { Contour, NewRoom } from './plan';
import { Room } from './room';

const areasCount = (n: number) => (n === 1 ? '1 área' : `${n} áreas`);

/** El croquis de las áreas: un contorno por sede o edificio, con un cuarto por área y, para quien administra, el cuarto por construir. */
export function AreasView({
  areas,
  base,
  canManage,
  onOpen,
  onNew,
}: {
  areas: AreasOverview['areas'];
  base: string;
  canManage: boolean;
  onOpen: (areaId: string) => void;
  /** Crear un área dentro de una sede o un edificio (o sin él, con `null`). */
  onNew: (groupId: string | null) => void;
}) {
  if (areas.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel
          icon={MapPinned}
          title="Aún no hay áreas"
          description={
            canManage
              ? 'Crea la primera: es el cuarto del laboratorio donde se guardan reactivos y equipos.'
              : 'Cuando el Administrador cree las áreas del laboratorio, aparecerán aquí con lo que guarda cada una.'
          }
          action={
            canManage ? (
              <Button variant="primary" onClick={() => onNew(null)}>
                <Plus aria-hidden />
                Nueva área
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }
  return (
    <div className="grid gap-9 pt-3">
      {groupAreas(areas).map((group) => (
        <Contour key={group.id ?? 'sin-edificio'} title={group.name} count={areasCount(group.areas.length)} muted={group.id === null}>
          {group.areas.map((area) => (
            <Room
              key={area.id}
              name={area.name}
              subtitle={<ManagerLine manager={area.manager} />}
              base={base}
              filter={{ kind: 'area', id: area.id }}
              counts={area.counts}
              onOpen={() => onOpen(area.id)}
            />
          ))}
          {canManage ? <NewRoom label="Nueva área" onClick={() => onNew(group.id)} /> : null}
        </Contour>
      ))}
    </div>
  );
}

/** Los departamentos con los mismos cuadros y sus cifras; renombrar y archivar van en el menú de cada cuadro. */
export function DepartmentsView({
  departments,
  base,
  canManage,
  onNew,
  onRename,
  onArchive,
}: {
  departments: AreasOverview['departments'];
  base: string;
  canManage: boolean;
  onNew: () => void;
  onRename: (target: AreaTarget) => void;
  onArchive: (target: AreaTarget) => void;
}) {
  if (departments.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel
          icon={Users}
          title="Aún no hay departamentos"
          description={
            canManage
              ? 'Un departamento es de quién son las cosas: una carrera o una unidad. Crea el primero para elegirlo al ingresar reactivos y equipos.'
              : 'Cuando el Administrador cree los departamentos, aparecerán aquí con lo que tiene cada uno.'
          }
          action={
            canManage ? (
              <Button variant="primary" onClick={onNew}>
                <Plus aria-hidden />
                Nuevo departamento
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }
  return (
    <div className="pt-3">
      <Contour title="Departamentos" icon={Users} count={`${departments.length}`}>
        {[...departments].sort(byName).map((department) => {
          const target: AreaTarget = { kind: 'department', id: department.id, name: department.name };
          return (
            <Room
              key={department.id}
              name={department.name}
              base={base}
              filter={{ kind: 'department', id: department.id }}
              counts={department.counts}
              actions={
                canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Acciones de ${department.name}`}>
                        <EllipsisVertical aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      <DropdownMenuItem onSelect={() => onRename(target)}>
                        <Pencil aria-hidden />
                        Cambiar nombre
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onArchive(target)}>
                        <Archive aria-hidden />
                        Archivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            />
          );
        })}
        {canManage ? <NewRoom label="Nuevo departamento" onClick={onNew} /> : null}
      </Contour>
    </div>
  );
}
