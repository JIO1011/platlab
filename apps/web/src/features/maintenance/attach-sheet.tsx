import { toast } from '@platlab/ui';
import { Paperclip } from 'lucide-react';
import { useState } from 'react';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { formatDate } from '../../app/format';
import { pdfFileError } from '../../app/pdf-file';
import { CertificateField } from './certificate-field';
import { maintenanceErrorMessage, useAttachCertificate } from './commands';

/**
 * «Adjuntar certificado» a un registro que no lo tiene (ADR 0020): el registro no cambia, solo se le suma el PDF.
 * Un reintento tras un corte no sube un segundo archivo: la clave es la del registro.
 */
export function AttachSheet({
  workspaceId,
  open,
  onOpenChange,
  record,
}: SheetBaseProps & { record: { id: string; performedOn: string; asset: { code: string; name: string } } }) {
  const attach = useAttachCertificate(workspaceId);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const submit = async () => {
    setGeneralError(null);
    if (!file) {
      setFileError('Elige el PDF del certificado.');
      return;
    }
    const problem = pdfFileError(file);
    if (problem) {
      setFileError(problem);
      return;
    }
    try {
      await attach.mutateAsync({ recordId: record.id, file });
      toast.success('Certificado adjuntado', { description: `${record.asset.code} · ${formatDate(record.performedOn)}` });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(maintenanceErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={Paperclip}
      title="Adjuntar certificado"
      description={`${record.asset.code} ${record.asset.name} · ${formatDate(record.performedOn)}`}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Adjuntar certificado"
      pending={attach.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={file !== null}
      focusFirst
      pendingText="Adjuntando el certificado…"
    >
      <CertificateField
        file={file}
        optional={false}
        error={fileError}
        disabled={attach.isPending}
        onChange={(next) => {
          setFile(next);
          setFileError(null);
        }}
      />
    </FormSheet>
  );
}
