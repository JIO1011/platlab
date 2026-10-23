import { Button, cn } from '@platlab/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { noIssues, type Draft, type DraftField, type FormIssues } from './form-draft';
import type { LogoFile } from './form-logo';
import { Masthead } from './form-masthead';
import { Cell, sheetGrid } from './form-parts';
import { ResourcesTable } from './form-resources';
import { FormRowsEditor, SheetRows } from './form-rows';
import { Signatures } from './form-signatures';

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
 * Lo que quien llena o revisa inyecta en la hoja (ADR 0023: llenar, revisar e imprimir usan esta misma hoja). Sin esto, la
 * hoja muestra los ejemplos en gris y filas de Recursos en blanco, que es la plantilla.
 */
interface PaperSlots {
  /** Lo que va en el valor de cada dato de la Sección I: un campo al llenar, el valor enviado al revisar. */
  value?: (field: DraftField) => ReactNode;
  /** Las filas (`<tr>`) del cuerpo de Recursos, con una celda por columna que se muestra, en el orden de la hoja. */
  resourceRows?: ReactNode;
}

type PaperProps = {
  draft: Draft;
  workspaceName: string;
  revision: number;
} & (
  | { mode: 'design'; issues: FormIssues; onChange: (draft: Draft) => void; uploadLogo: (logo: LogoFile) => Promise<string> }
  | { mode: 'fill' | 'view'; slots?: PaperSlots }
);

/**
 * La hoja de un formato (ADR 0023) como la plantilla A4 que recibe quien solicita, en una tabla de bordes finos y dibujada
 * desde su `layout`: encabezado en franja (membrete con logo y líneas, título y código), la Sección I (títulos de sección y
 * filas de 1 a 3 datos «etiqueta | valor»), Recursos, Observaciones y Entrega / Recepción. Se usa en tres modos:
 *
 * - `design`: se edita en el mismo lugar; recibe el borrador por `onChange` y sube el logo con `uploadLogo`.
 * - `fill` y `view`: solo lectura y la que se imprime. Dibujan igual; cambia lo que el llamador inyecta con `slots`
 *   (campos al llenar, valores al revisar). Sin `slots`, la plantilla en blanco.
 */
export function FormPaper(props: PaperProps) {
  const { draft, workspaceName, revision } = props;
  const design = props.mode === 'design' ? props : undefined;
  const slots = props.mode === 'design' ? undefined : props.slots;
  const set = (patch: Partial<Draft>) => design?.onChange({ ...draft, ...patch });
  const issues = design?.issues ?? noIssues;

  const sheet = (
    <article
      aria-label="Formato de la solicitud"
      className={cn(sheetGrid, 'mx-auto w-full max-w-[210mm] border border-line-strong text-[12px] leading-snug text-ink [print-color-adjust:exact] print:max-w-none print:text-[8pt]')}
    >
      <Masthead draft={draft} workspaceName={workspaceName} revision={revision} {...(design ? { design: { issues, set, uploadLogo: design.uploadLogo } } : {})} />
      {design ? <FormRowsEditor rows={draft.rows} issues={issues} onChange={(rows) => set({ rows })} /> : <SheetRows rows={draft.rows} {...(slots?.value ? { renderValue: slots.value } : {})} />}
      <ResourcesTable draft={draft} issues={issues} {...(design ? { onChange: set } : {})} {...(slots?.resourceRows ? { rows: slots.resourceRows } : {})} />
      <Observations draft={draft} editable={design !== undefined} set={set} />
      <Signatures draft={draft} issues={issues} onChange={design ? (signatures) => set({ signatures }) : undefined} />
    </article>
  );
  // Al editar, el asa de cada fila vive en un margen a la izquierda de la hoja; el papel no lo tiene.
  return design ? <div className="mx-auto w-full max-w-[calc(210mm+2.5rem)] pl-10">{sheet}</div> : sheet;
}
