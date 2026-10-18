import { voidRecordRequest } from '@platlab/contracts';
import { Field, Textarea, toast } from '@platlab/ui';
import { Ban } from 'lucide-react';
import { useState } from 'react';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { formatDate } from '../../app/format';
import { maintenanceErrorMessage, useVoidRecord } from './commands';

/**
 * «Anular registro» (Administrador, M-01b): el registro sigue a la vista, con el motivo, y deja de contar para la
 * próxima fecha del plan. No toca Equipos. Sin interfaz optimista: el historial cambia con lo que el servidor confirma.
 */
export function VoidSheet({
  workspaceId,
  open,
  onOpenChange,
  record,
}: SheetBaseProps & { record: { id: string; performedOn: string; asset: { code: string; name: string } } }) {
  const voidRecord = useVoidRecord(workspaceId, record.id);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const submit = async () => {
    setGeneralError(null);
    setReasonError(undefined);
    const parsed = voidRecordRequest.safeParse({ reason: reason.trim() });
    if (!parsed.success) {
      setReasonError(reason.trim() === '' ? 'Escribe por qué se anula el registro.' : 'El motivo es demasiado largo.');
      return;
    }
    try {
      await voidRecord.mutateAsync(parsed.data);
      toast.success('Registro anulado', { description: `${record.asset.code} · ${formatDate(record.performedOn)}` });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(maintenanceErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={Ban}
      title="Anular registro"
      description={`${record.asset.code} ${record.asset.name} · ${formatDate(record.performedOn)}`}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Anular registro"
      destructive
      pending={voidRecord.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={reason.trim() !== ''}
      focusFirst
      pendingText="Anulando el registro…"
    >
      <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
        Queda a la vista como anulado y deja de contar para la próxima fecha. Lo que aplicó en Equipos (estado físico, incidente) no cambia:
        corrígelo en Equipos.
      </p>
      <Field label="Motivo de la anulación" required error={reasonError}>
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
