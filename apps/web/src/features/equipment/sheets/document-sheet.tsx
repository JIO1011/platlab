import { uploadAssetDocumentQuery, type AssetDocumentKind } from '@platlab/contracts';
import { Button, Field, toast } from '@platlab/ui';
import { FileText, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { fieldLabel, FilledInput } from '../../../app/filled';
import { FormSheet, validate, type SheetBaseProps } from '../../../app/form-sheet';
import { formatFileSize, pdfLimitText } from '../../../app/pdf-file';
import { PillField } from '../../../app/pills';
import { equipmentErrorMessage, useUploadAssetDocument } from '../commands';
import { DOCUMENT_TITLE_MAX, documentFileError, titleFromFileName } from '../document-file';
import { documentKindOptions } from '../document-text';

/**
 * «Agregar documento» (ADR 0019, E-01e): tipo, nombre y el PDF. El archivo se comprueba aquí (PDF, no vacío y dentro
 * del límite) antes de subirlo, y el servidor lo vuelve a comprobar. Elegir el archivo propone su nombre si Nombre
 * está vacío. Al terminar avisa y cierra; el documento
 * aparece cuando el servidor lo confirma.
 */
export function DocumentSheet({
  workspaceId,
  open,
  onOpenChange,
  assetId,
}: SheetBaseProps & { assetId: string }) {
  const upload = useUploadAssetDocument(workspaceId, assetId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { kind: '' as AssetDocumentKind | '', title: '', file: null as File | null } });
  const errors = form.formState.errors;
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    const query = validate(uploadAssetDocumentQuery, { kind: values.kind || undefined, title: values.title }, form);
    const fileError = documentFileError(values.file);
    if (fileError) form.setError('file', { message: fileError });
    if (!query || !values.file || fileError) return;
    try {
      await upload.mutateAsync({ ...query, file: values.file });
      toast.success('Documento agregado', { description: query.title });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(equipmentErrorMessage(error));
    }
  });

  return (
    <FormSheet
      icon={FileText}
      title="Agregar documento"
      description="Un PDF del equipo: su manual, la factura, la garantía o un informe. Queda a la vista de quien consulta la ficha."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Agregar documento"
      pending={upload.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <Controller
        control={form.control}
        name="kind"
        render={({ field }) => (
          <PillField
            label="Tipo"
            labelClassName={fieldLabel}
            size="sm"
            value={field.value}
            options={documentKindOptions}
            onChange={(kind) => {
              field.onChange(kind);
              form.clearErrors('kind');
            }}
            error={errors.kind?.message}
          />
        )}
      />
      <Field label="Nombre" labelClassName={fieldLabel} hint="Cómo se verá en la lista, por ejemplo «Manual de usuario»." error={errors.title?.message}>
        <FilledInput autoComplete="off" maxLength={DOCUMENT_TITLE_MAX} {...form.register('title', { onChange: () => form.clearErrors('title') })} />
      </Field>
      <Controller
        control={form.control}
        name="file"
        render={({ field }) => (
          <Field label="Archivo" labelClassName={fieldLabel} hint={`Solo PDF, hasta ${pdfLimitText}.`} error={errors.file?.message}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Button className="h-11 shrink-0" onClick={() => fileRef.current?.click()}>
                <Upload aria-hidden />
                Elegir PDF
              </Button>
              <p className="min-w-0 break-words text-sm text-ink-muted">
                {field.value ? `${field.value.name} · ${formatFileSize(field.value.size)}` : 'Ningún archivo'}
              </p>
              {/* El campo nativo queda oculto: lo abre el botón, y «Archivo» también lo activa como su rótulo. */}
              <FilledInput
                ref={fileRef}
                type="file"
                accept="application/pdf"
                hidden
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // Vacío el campo para poder elegir otra vez el mismo archivo.
                  event.target.value = '';
                  if (!file) return;
                  field.onChange(file);
                  form.clearErrors('file');
                  if (!form.getValues('title').trim()) {
                    form.setValue('title', titleFromFileName(file.name));
                    form.clearErrors('title');
                  }
                }}
              />
            </div>
          </Field>
        )}
      />
    </FormSheet>
  );
}
