import { Button, cn } from '@platlab/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { noIssues, type Draft, type FormIssues } from './form-draft';
import { Cell, EditableText, Ghost, sheetGrid } from './form-parts';
import { ResourcesTable } from './form-resources';
import { FormRowsEditor, SheetRows } from './form-rows';
import { Signatures } from './form-signatures';

/** Un bloque del encabezado: una tira de color con su rótulo arriba y, debajo, su contenido. */
function MastheadBlock({ head, headClassName, children }: { head: string; headClassName?: string; children: ReactNode }) {
  return (
    <div className={cn(sheetGrid, 'grid-rows-[auto_minmax(0,1fr)]')}>
      <Cell kind="head" className={cn('py-0 text-center text-[11px] print:text-[7pt] print:leading-[3.5mm]', headClassName)}>
        {head}
      </Cell>
      {children}
    </div>
  );
}

/** El encabezado en franja, de una sola fila: el espacio (en lugar del logo), la revisión con el título y el código. */
function Masthead({ draft, workspaceName, revision, issues, editable, set }: { draft: Draft; workspaceName: string; revision: number; issues: FormIssues; editable: boolean; set: (patch: Partial<Draft>) => void }) {
  const code = draft.documentCode.trim();
  return (
    <header className={cn(sheetGrid, 'sm:grid-cols-[minmax(0,0.9fr)_minmax(0,3.2fr)_minmax(0,1.3fr)] print:h-[14mm]')}>
      <Cell className="flex items-center justify-center text-center text-[12px] font-semibold print:py-0 print:text-[9pt]">{workspaceName}</Cell>
      <MastheadBlock head={revision > 0 ? `Revisión ${revision}` : 'Sin publicar'} headClassName="italic">
        <Cell kind="label" className={cn('flex flex-col justify-center text-center text-[15px] font-bold tracking-normal print:overflow-hidden print:whitespace-nowrap print:py-0 print:text-[12pt] print:leading-tight', editable && 'p-0.5')}>
          {editable ? (
            <EditableText
              label="Título del formato"
              value={draft.title}
              maxLength={120}
              placeholder="Título del formato"
              error={issues.title}
              className="text-center uppercase placeholder:normal-case sm:min-h-6 sm:py-0"
              onChange={(title) => set({ title })}
            />
          ) : (
            draft.title.trim() || 'Formato sin título'
          )}
        </Cell>
      </MastheadBlock>
      <MastheadBlock head="Código" headClassName="text-[11px]">
        <Cell className={cn('grid content-center gap-0.5 text-center print:py-0', editable && 'p-0.5')}>
          {editable ? (
            <EditableText
              label="Código del documento"
              value={draft.documentCode}
              maxLength={40}
              placeholder="Código"
              error={issues.documentCode}
              className="text-center font-bold sm:min-h-5 sm:py-0"
              onChange={(documentCode) => set({ documentCode })}
            />
          ) : code ? (
            <span className="font-bold print:text-[9pt]">{code}</span>
          ) : null}
          <Ghost note className="text-[11px] leading-tight">
            Lo pone el sistema al programar
          </Ghost>
        </Cell>
      </MastheadBlock>
    </header>
  );
}

/** Observaciones: un espacio en blanco al final de la hoja. Con edición, se quita o se vuelve a agregar. */
function Observations({ draft, editable, set }: { draft: Draft; editable: boolean; set: (patch: Partial<Draft>) => void }) {
  if (!draft.notes) {
    return editable ? (
      <div className="bg-white px-1 py-0.5 print:hidden">
        <Button className="h-11 sm:h-6" onClick={() => set({ notes: true })}>
          <Plus aria-hidden />
          Agregar Observaciones
        </Button>
      </div>
    ) : null;
  }
  return (
    <section aria-label="Observaciones" className={sheetGrid}>
      <Cell kind="label" dense className="flex items-center justify-between gap-1 py-0 pr-0.5">
        Observaciones
        {editable ? (
          <Button variant="ghost" size="icon" className="size-11 sm:size-6 print:hidden" aria-label="Quitar Observaciones" onClick={() => set({ notes: false })}>
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </Cell>
      <Cell className="min-h-14 print:h-[7.5mm] print:min-h-0" />
    </section>
  );
}

/**
 * La hoja de un formato (ADR 0023) como la plantilla A4 que recibe quien solicita, en una tabla de bordes finos y dibujada
 * desde su `layout`: encabezado en franja, la Sección I (títulos de sección y filas de 1 a 3 datos «etiqueta | valor»),
 * Recursos, Observaciones y Entrega / Recepción. Con `onChange` se edita en el mismo lugar; sin él es solo lectura y es la
 * que se imprime. Sin el logo (llega con el Core), el encabezado lleva el nombre del espacio de trabajo.
 */
export function FormPaper({
  draft,
  workspaceName,
  revision,
  issues = noIssues,
  onChange,
}: {
  draft: Draft;
  workspaceName: string;
  revision: number;
  issues?: FormIssues;
  onChange?: (draft: Draft) => void;
}) {
  const editable = onChange !== undefined;
  const set = (patch: Partial<Draft>) => onChange?.({ ...draft, ...patch });

  return (
    <article
      aria-label="Formato de la solicitud"
      className={cn(sheetGrid, 'mx-auto w-full max-w-[210mm] border border-line-strong text-[12px] leading-snug text-ink [print-color-adjust:exact] print:max-w-none print:text-[8pt]')}
    >
      <Masthead draft={draft} workspaceName={workspaceName} revision={revision} issues={issues} editable={editable} set={set} />
      {editable ? <FormRowsEditor rows={draft.rows} issues={issues} onChange={(rows) => set({ rows })} /> : <SheetRows rows={draft.rows} />}
      <ResourcesTable draft={draft} issues={issues} onChange={editable ? set : undefined} />
      <Observations draft={draft} editable={editable} set={set} />
      <Signatures draft={draft} issues={issues} onChange={editable ? (signatures) => set({ signatures }) : undefined} />
    </article>
  );
}
