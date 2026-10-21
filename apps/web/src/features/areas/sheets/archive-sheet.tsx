import { toast } from '@platlab/ui';
import { Archive } from 'lucide-react';
import { useState } from 'react';
import { FormSheet } from '../../../app/form-sheet';
import { areasErrorMessage, useArchive, type AreaTarget } from '../commands';

const copy = {
  area: {
    title: 'Archivar área',
    description: 'Se archivan también sus estantes. Si guarda reactivos o equipos, primero hay que trasladarlos.',
    submit: 'Archivar área',
  },
  shelf: {
    title: 'Archivar estante',
    description: 'Se archivan también sus niveles. Si guarda reactivos o equipos, primero hay que trasladarlos.',
    submit: 'Archivar estante',
  },
  department: {
    title: 'Archivar departamento',
    description: 'Deja de ofrecerse en los formularios. Lo que ya lo tiene como dueño lo conserva.',
    submit: 'Archivar departamento',
  },
} as const;

/**
 * Confirmación de archivar (ADR 0024): no se deshace desde la app. Si el área o el estante todavía guarda
 * algo, el servidor lo rechaza y dice qué hay dentro; ese mensaje se muestra tal cual.
 */
export function ArchiveSheet({
  workspaceId,
  target,
  onClose,
  onArchived,
}: {
  workspaceId: string;
  target: AreaTarget;
  /** Cancelar o cerrar sin archivar. */
  onClose: () => void;
  onArchived: () => void;
}) {
  const command = useArchive(workspaceId, target);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const text = copy[target.kind];

  const archive = async () => {
    setGeneralError(null);
    try {
      await command.mutateAsync(undefined);
      toast.success(`«${target.name}» archivado`);
      onArchived();
    } catch (error) {
      setGeneralError(areasErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={Archive}
      title={text.title}
      description={text.description}
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      submitLabel={text.submit}
      destructive
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void archive()}
    >
      <p className="break-words rounded-control bg-surface-sunken px-3 py-2.5 text-sm font-semibold text-ink">{target.name}</p>
    </FormSheet>
  );
}
