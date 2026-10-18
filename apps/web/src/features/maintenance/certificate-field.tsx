import { Button } from '@platlab/ui';
import { FileText, Paperclip, X } from 'lucide-react';
import { useId, useRef } from 'react';
import { certificateLimitText, formatFileSize } from './certificate-file';

/**
 * El campo del certificado PDF: «Elegir PDF», y elegido, su nombre y su peso con «Quitar». El archivo no se
 * sube aquí: lo adjunta quien guarda, después del registro.
 */
export function CertificateField({
  file,
  onChange,
  error,
  label = 'Certificado (PDF)',
  optional = true,
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string | null | undefined;
  label?: string;
  optional?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const describedBy = error ? `${id}-error` : `${id}-hint`;
  return (
    <div className="grid content-start gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium text-ink">
        {label}{' '}
        {optional ? (
          <span className="font-normal text-ink-subtle">(opcional)</span>
        ) : (
          <span aria-hidden className="ml-0.5">
            *
          </span>
        )}
      </span>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-control bg-surface-sunken px-3 py-2.5">
          <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-ink">
            <span className="block break-all font-medium">{file.name}</span>
            <span className="block text-[13px] text-ink-muted">{formatFileSize(file.size)}</span>
          </p>
          <Button size="sm" className="max-sm:h-11" disabled={disabled} onClick={() => onChange(null)} aria-label={`Quitar ${file.name}`}>
            <X aria-hidden />
            Quitar
          </Button>
        </div>
      ) : (
        <Button
          className="h-11 justify-self-start sm:h-10"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onClick={() => input.current?.click()}
        >
          <Paperclip aria-hidden />
          Elegir PDF
        </Button>
      )}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
          Un solo PDF de hasta {certificateLimitText}. Queda en el historial del equipo.
        </p>
      )}
    </div>
  );
}
