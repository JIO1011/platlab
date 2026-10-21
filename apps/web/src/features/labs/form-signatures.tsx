import { Button, OptionRow, cn } from '@platlab/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { Draft, DraftSignature, FormIssues } from './form-draft';
import { MAX_SIGNATURES, addSignature, removeSignature, renameSignature, setRequester } from './form-edit';
import { Cell, EditableText, Ghost, sheetGrid } from './form-parts';

/** Las columnas del pie según las firmas (1 a 3): el rótulo «Entrega / Recepción» y una columna por firma. */
const footerColumns = [
  'sm:grid-cols-[minmax(0,1fr)_minmax(0,3.2fr)]',
  'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.6fr)]',
  'sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,1.07fr))]',
] as const;

/** Una firma física: espacio para firmar, la línea con su nombre y, si es la del solicitante, una nota en gris que no se imprime. */
function Signature({
  signature,
  error,
  canRemove,
  onChange,
}: {
  signature: DraftSignature;
  error: string | undefined;
  canRemove: boolean;
  onChange?: { rename: (label: string) => void; requester: (requester: boolean) => void; remove: () => void } | undefined;
}) {
  return (
    <div className="flex min-h-14 flex-col justify-end bg-white px-3 pb-0.5 print:min-h-0">
      {onChange ? (
        <div className="mb-1 print:hidden">
          <OptionRow checked={signature.requester} onChange={(event) => onChange.requester(event.target.checked)}>
            Es la firma de quien solicita
          </OptionRow>
        </div>
      ) : null}
      <div className="border-t border-dashed border-ink-subtle pt-0.5 text-center text-[11px] font-semibold uppercase italic print:text-[8pt]">
        {onChange ? (
          <span className="flex items-center gap-0.5">
            <EditableText
              label="Nombre de la firma"
              value={signature.label}
              maxLength={60}
              placeholder="Nombre de la firma"
              error={error}
              className="text-center uppercase italic placeholder:normal-case sm:min-h-5 sm:py-0"
              onChange={onChange.rename}
            />
            <Button variant="ghost" size="icon" className="size-11 shrink-0 sm:size-6" aria-label="Quitar la firma" disabled={!canRemove} onClick={onChange.remove}>
              <Trash2 aria-hidden />
            </Button>
          </span>
        ) : (
          signature.label.trim() || 'Firma'
        )}
      </div>
      <Ghost note className="min-h-[0.875rem] text-center text-[10px] leading-tight">
        {signature.requester ? 'Nombre de quien solicita (de su cuenta)' : undefined}
      </Ghost>
    </div>
  );
}

/**
 * El pie «Entrega / Recepción» de la hoja: de una a tres firmas físicas con su nombre; a lo sumo una es la de quien
 * solicita, y bajo ella se imprime su nombre. Con `onChange` se renombran, se quitan (queda una) y se agregan.
 */
export function Signatures({ draft, issues, onChange }: { draft: Draft; issues: FormIssues; onChange?: ((signatures: DraftSignature[]) => void) | undefined }) {
  const { signatures } = draft;
  const apply = (next: DraftSignature[] | undefined) => {
    if (next) onChange?.(next);
  };
  return (
    <footer aria-label="Entrega y recepción" className={cn(sheetGrid, footerColumns[signatures.length - 1], 'print:h-[18mm]')}>
      <Cell kind="head" className="flex flex-col items-center justify-center gap-1 text-center">
        Entrega / Recepción
        {onChange && signatures.length < MAX_SIGNATURES ? (
          <Button className="h-11 sm:h-6 print:hidden" onClick={() => apply(addSignature(signatures))}>
            <Plus aria-hidden />
            Agregar firma
          </Button>
        ) : null}
      </Cell>
      {signatures.map((signature) => (
        <Signature
          key={signature.id}
          signature={signature}
          error={issues.signatures[signature.id]}
          canRemove={signatures.length > 1}
          onChange={
            onChange
              ? {
                  rename: (label) => onChange(renameSignature(signatures, signature.id, label)),
                  requester: (requester) => onChange(setRequester(signatures, signature.id, requester)),
                  remove: () => apply(removeSignature(signatures, signature.id)),
                }
              : undefined
          }
        />
      ))}
    </footer>
  );
}
