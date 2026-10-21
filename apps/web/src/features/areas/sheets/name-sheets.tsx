import { Field, Select } from '@platlab/ui';
import { Building2, FolderPlus, MapPinPlus, Pencil, Users } from 'lucide-react';
import { useState } from 'react';
import { fieldLabel, filled } from '../../../app/filled';
import { useCreateDepartment, useCreateLocation, useRename, type AreaTarget } from '../commands';
import { NameSheet } from './name-sheet';

const NONE = '__none__';

/** «+ Nueva área»: el nombre y, si ya hay sedes o edificios, dónde queda (opcional). */
export function NewAreaSheet({
  workspaceId,
  groups,
  groupId,
  onClose,
}: {
  workspaceId: string;
  groups: Array<{ id: string; name: string }>;
  /** El edificio donde se pidió crearla; vacío, sin edificio. */
  groupId: string | null;
  onClose: () => void;
}) {
  const command = useCreateLocation(workspaceId);
  const [parent, setParent] = useState(groupId ?? NONE);
  return (
    <NameSheet
      icon={MapPinPlus}
      title="Nueva área"
      description="Un cuarto del laboratorio. Después le agregas estantes y su encargado."
      label="Nombre del área"
      placeholder="Laboratorio de Química"
      maxLength={200}
      submitLabel="Crear área"
      pending={command.isPending}
      save={(name) => command.mutateAsync({ name, parentId: parent === NONE ? null : parent })}
      saved={(name) => `Área «${name}» creada`}
      onClose={onClose}
    >
      {groups.length > 0 ? (
        <Field label="Edificio o sede" labelClassName={fieldLabel} optional>
          <Select
            value={parent}
            onValueChange={setParent}
            options={[{ value: NONE, label: 'Sin edificio' }, ...groups.map((group) => ({ value: group.id, label: group.name }))]}
            placeholder="Elige una opción"
            triggerClassName={filled}
          />
        </Field>
      ) : null}
    </NameSheet>
  );
}

/** «+ Estante»: un estante dentro del área. */
export function NewShelfSheet({ workspaceId, area, onClose }: { workspaceId: string; area: { id: string; name: string }; onClose: () => void }) {
  const command = useCreateLocation(workspaceId);
  return (
    <NameSheet
      icon={FolderPlus}
      title="Nuevo estante"
      description={`Queda dentro de ${area.name}.`}
      label="Nombre del estante"
      placeholder="Estante A"
      maxLength={200}
      submitLabel="Crear estante"
      pending={command.isPending}
      save={(name) => command.mutateAsync({ name, parentId: area.id })}
      saved={(name) => `Estante «${name}» creado`}
      onClose={onClose}
    />
  );
}

/** «+ Nuevo departamento»: de quién son las cosas, aparte de dónde están. */
export function NewDepartmentSheet({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const command = useCreateDepartment(workspaceId);
  return (
    <NameSheet
      icon={Users}
      title="Nuevo departamento"
      description="Una carrera o una unidad dueña de reactivos y equipos. Se elige al ingresarlos."
      label="Nombre del departamento"
      placeholder="Ingeniería Química"
      maxLength={120}
      submitLabel="Crear departamento"
      pending={command.isPending}
      save={(name) => command.mutateAsync({ name })}
      saved={(name) => `Departamento «${name}» creado`}
      onClose={onClose}
    />
  );
}

const kindText = { area: 'del área', shelf: 'del estante', department: 'del departamento' } as const;

/** Renombrar un área, un estante o un departamento: el cambio se ve en todas partes donde aparece. */
export function RenameSheet({ workspaceId, target, onClose }: { workspaceId: string; target: AreaTarget; onClose: () => void }) {
  const command = useRename(workspaceId, target);
  return (
    <NameSheet
      icon={target.kind === 'department' ? Users : target.kind === 'area' ? Building2 : Pencil}
      title="Cambiar nombre"
      description="El nombre nuevo se ve en las listas, las fichas y los formularios."
      label={`Nombre ${kindText[target.kind]}`}
      initialName={target.name}
      maxLength={target.kind === 'department' ? 120 : 200}
      submitLabel="Guardar nombre"
      pending={command.isPending}
      save={(name) => command.mutateAsync({ name })}
      saved={(name) => `Ahora se llama «${name}»`}
      onClose={onClose}
    />
  );
}
