import { FORM_DEFAULT_LABELS } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import type { ReactNode } from 'react';
import type { Draft, FormIssues } from './form-draft';
import { ExtraFields } from './form-extra-fields';
import { Cell, Datum, EditableText, FieldSummary, Ghost, SystemDatum, cellKinds, dataGrid, denseCell, sheetGrid } from './form-parts';
import { hasTrailingGap, resourceRows } from './form-sheet';

const noIssues: FormIssues = { fields: {} };

/** El ancho (%) de las nueve columnas de Recursos: Reactivos (2), Equipos (4) y Materiales (3). */
const resourceWidths = [17.2, 8.6, 17.2, 7.5, 7.5, 9.7, 17.2, 7.5, 7.5];

/** Las filas de muestra de Recursos en pantalla; al imprimir van las que llenan la hoja (`resourceRows`). */
const SAMPLE_ROWS = 3;

/** El nombre de «Asignatura» o «Carrera»: se renombra en la hoja («Asignatura» → «Proyecto»); solo lectura, es su texto. */
function CoreName({ editable, name, fallback, error, onChange }: { editable: boolean; name: string; fallback: string; error?: string | undefined; onChange: (value: string) => void }) {
  return editable ? (
    <EditableText label={`Renombrar la etiqueta «${fallback}»`} value={name} maxLength={40} placeholder={fallback} error={error} className="uppercase placeholder:normal-case sm:min-h-5 sm:py-0" onChange={onChange} />
  ) : (
    name.trim() || fallback
  );
}

/** Un bloque del encabezado: una tira de color con su rótulo arriba y, debajo, su contenido. */
function MastheadBlock({ head, headClassName, children }: { head: string; headClassName?: string; children: ReactNode }) {
  return (
    <div className={cn(sheetGrid, 'grid-rows-[auto_minmax(0,1fr)]')}>
      <Cell kind="head" className={cn('py-0 text-center text-[10px] print:text-[7pt] print:leading-[3.5mm]', headClassName)}>
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
          <Ghost note className="text-[10px] leading-tight">
            Lo pone el sistema al programar
          </Ghost>
        </Cell>
      </MastheadBlock>
    </header>
  );
}

const sheetCell = 'border-b border-r border-line-strong last:border-r-0';

/**
 * La tabla de Recursos: Reactivos, Equipos y Materiales con sus cantidades; el docente la llena con lo que elige del
 * inventario. Es una tabla real para que, si no cabe en la hoja, su cabecera se repita en la página siguiente. Al
 * imprimir lleva las filas vacías que llenan lo que sobra (`resourceRows`); en pantalla, tres de muestra.
 */
function ResourcesTable({ extras }: { extras: number }) {
  const head = (kind: 'head' | 'label') => cn(sheetCell, denseCell, cellKinds[kind], 'text-center');
  const sub = cn(head('label'), 'text-[10px]');
  return (
    <>
      <div
        role="region"
        aria-label="Recursos de la actividad"
        tabIndex={0}
        className="overflow-x-auto bg-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action print:overflow-visible"
      >
        <table className="w-full min-w-[40rem] table-fixed border-separate border-spacing-0 text-[11px] print:min-w-0 print:text-[8pt]">
          <colgroup>
            {resourceWidths.map((width, at) => (
              <col key={at} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} className={head('head')}>
                Reactivos
              </th>
              <th rowSpan={2} className={sub}>
                Cantidad total
              </th>
              <th rowSpan={2} className={head('head')}>
                Equipos
              </th>
              <th colSpan={3} className={sub}>
                Cantidad
              </th>
              <th rowSpan={2} className={head('head')}>
                Materiales
              </th>
              <th colSpan={2} className={sub}>
                Cantidad
              </th>
            </tr>
            <tr>
              {['Por curso', 'Por grupo', 'Código', 'Por curso', 'Por grupo'].map((name, at) => (
                <th key={at} className={sub}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {Array.from({ length: resourceRows(extras) }, (_, line) => (
              <tr key={line} className={cn('print:break-inside-avoid', line >= SAMPLE_ROWS && 'hidden print:table-row')}>
                {resourceWidths.map((_width, column) => (
                  <td key={column} className={cn(sheetCell, denseCell, 'bg-white')} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="bg-white px-2 py-0.5 text-[11px] text-ink-subtle print:hidden">El docente elige del inventario; por curso = por grupo × nº de grupos.</p>
    </>
  );
}

/** Una firma física: espacio para firmar, la línea con su nombre y, si lo hay, una nota en gris que no se imprime. */
function Signature({ caption, note }: { caption: string; note?: string }) {
  return (
    <div className="flex min-h-14 flex-col justify-end bg-white px-3 pb-0.5 print:min-h-0">
      <div className="border-t border-dashed border-ink-subtle pt-0.5 text-center text-[11px] font-semibold uppercase italic print:text-[8pt]">{caption}</div>
      <Ghost note className="min-h-[0.875rem] text-center text-[10px] leading-tight">
        {note}
      </Ghost>
    </div>
  );
}

/**
 * La hoja del Formato (ADR 0023) como la plantilla estándar A4 que recibe quien solicita, en una tabla de bordes finos:
 * encabezado en franja, Sección I (el membrete de la actividad: datos del sistema con candado y datos extra intercalados),
 * Recursos, Observaciones y Entrega / Recepción. Con `onChange` se edita en el mismo lugar (título, código, nombres de
 * asignatura y carrera y datos extra); sin él es solo lectura y es la que se imprime. Sin el logo (llega con el Core), el
 * encabezado lleva el nombre del espacio de trabajo.
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

  // Los datos del sistema: los de antes de los extra y los de después, en la rejilla de la Sección I.
  const lead: ReactNode = (
    <>
      <Datum
        labelClassName={editable ? 'p-0.5' : undefined}
        label={<CoreName editable={editable} name={draft.subjectLabel} fallback={FORM_DEFAULT_LABELS.subjectLabel} error={issues.subjectLabel} onChange={(subjectLabel) => set({ subjectLabel })} />}
        value={<Ghost>Se elige de una lista</Ghost>}
      />
      <Datum
        labelClassName={editable ? 'p-0.5' : undefined}
        label={<CoreName editable={editable} name={draft.unitLabel} fallback={FORM_DEFAULT_LABELS.unitLabel} error={issues.unitLabel} onChange={(unitLabel) => set({ unitLabel })} />}
        value={<Ghost>Se elige de una lista</Ghost>}
      />
      <SystemDatum span="full" editable={editable} label="Título de la práctica" example="Nombre de la práctica o del trabajo" />
      <SystemDatum editable={editable} label="Tipo de actividad" example="Práctica, servicio, capacitación…" />
      <SystemDatum editable={editable} label="Docente" example="Nombre del docente" />
    </>
  );
  const tail: ReactNode = (
    <>
      <SystemDatum editable={editable} label="Fecha(s) programada(s)" example="Una o varias fechas" />
      <SystemDatum editable={editable} label="Horario" example="17:00 - 20:00" />
      <SystemDatum editable={editable} label="Nº alumnos" example="10" />
      <SystemDatum editable={editable} label="Nº grupos" example="1" />
    </>
  );

  return (
    <article
      aria-label="Formato de la solicitud"
      className={cn(sheetGrid, 'mx-auto w-full max-w-[210mm] border border-line-strong text-[12px] leading-snug text-ink [print-color-adjust:exact] print:max-w-none print:text-[8pt]')}
    >
      <Masthead draft={draft} workspaceName={workspaceName} revision={revision} issues={issues} editable={editable} set={set} />

      <Cell kind="head" dense className="flex flex-wrap items-center justify-between gap-x-3">
        <h2>Sección I. Datos de la actividad (docente)</h2>
        {editable ? <span className="text-[11px] font-medium normal-case tracking-normal print:hidden">El candado marca lo que pone el sistema</span> : null}
      </Cell>
      <section aria-label="Datos de la actividad">
        {editable ? (
          <ExtraFields fields={draft.fields} issues={issues.fields} onChange={(fields) => set({ fields })} lead={lead} tail={tail} />
        ) : (
          <div className={dataGrid}>
            {lead}
            {draft.fields.map((field) => (
              <Datum key={field.id} label={field.label.trim() || 'Sin etiqueta'} value={<FieldSummary field={field} />} />
            ))}
            {tail}
            {hasTrailingGap(draft.fields.length) ? <div className="col-span-2 hidden bg-white sm:block" /> : null}
          </div>
        )}
      </section>

      <ResourcesTable extras={draft.fields.length} />

      <section aria-label="Observaciones" className={sheetGrid}>
        <Cell kind="label" dense>
          Observaciones
        </Cell>
        <Cell className="min-h-14 print:h-[7.5mm] print:min-h-0" />
      </section>

      <footer aria-label="Entrega y recepción" className={cn(sheetGrid, 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.6fr)] print:h-[18mm]')}>
        <Cell kind="head" className="flex items-center justify-center text-center">
          Entrega / Recepción
        </Cell>
        <Signature caption="Asistente de laboratorio" />
        <Signature caption="Docente" note="Nombre del docente (de su cuenta)" />
      </footer>
    </article>
  );
}
