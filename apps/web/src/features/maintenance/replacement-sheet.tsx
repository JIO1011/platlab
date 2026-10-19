import { dismissReplacementRequest } from '@platlab/contracts';
import { Field, Textarea, toast } from '@platlab/ui';
import { BellOff } from 'lucide-react';
import { useState } from 'react';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { formatDate } from '../../app/format';
import { maintenanceErrorMessage, useDismissReplacement } from './commands';

/**
 * «Descartar» de «Evaluar reemplazo» (Administrador, M-01c): oculta el aviso del equipo 6 meses, con motivo. El descarte
 * se guarda y no se edita; no cambia el equipo. Sin interfaz optimista: la lista cambia con lo que el servidor confirma.
 */
export function ReplacementSheet({ workspaceId, open, onOpenChange, asset }: SheetBaseProps & { asset: { id: string; code: string; name: string } }) {
  const dismiss = useDismissReplacement(workspaceId, asset.id);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const submit = async () => {
    setGeneralError(null);
    setReasonError(undefined);
    const parsed = dismissReplacementRequest.safeParse({ reason: reason.trim() });
    if (!parsed.success) {
      setReasonError(reason.trim() === '' ? 'Escribe por qué se descarta el aviso.' : 'El motivo es demasiado largo.');
      return;
    }
    try {
      const { dismissedUntil } = await dismiss.mutateAsync(parsed.data);
      toast.success('Aviso descartado', { description: `${asset.code} · vuelve a avisar a partir del ${formatDate(dismissedUntil)}` });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(maintenanceErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={BellOff}
      title="Descartar aviso"
      description={`${asset.code} ${asset.name}`}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Descartar aviso"
      pending={dismiss.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={reason.trim() !== ''}
      focusFirst
      pendingText="Descartando el aviso…"
    >
      <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
        El aviso de este equipo se oculta 6 meses y vuelve después si sigue cumpliendo alguna condición. El descarte queda guardado con tu
        motivo y no se edita. El equipo no cambia.
      </p>
      <Field label="Motivo del descarte" required hint="Queda registrado con tu nombre. Hasta 500 caracteres." error={reasonError}>
        <Textarea
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(undefined);
          }}
        />
      </Field>
    </FormSheet>
  );
}
