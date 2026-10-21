import { Button, cn } from '@platlab/ui';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { RESOURCE_LABELS, type Draft, type DraftResource, type FormIssues, type ResourceKind } from './form-draft';
import { renameResource, setResourceShown } from './form-edit';
import { EditableText, cellKinds, denseCell } from './form-parts';
import { resourceRows } from './form-sheet';

/** Las filas de muestra de Recursos en pantalla; al imprimir van las que llenan la hoja (`resourceRows`). */
const SAMPLE_ROWS = 3;

/** El ancho relativo de las columnas de cada recurso: su nombre y sus cantidades. Se reparten a 100 % entre las que se muestran. */
const columnWeights = (kind: ResourceKind, equipmentCode: boolean): number[] => {
  if (kind === 'reagents') return [17.2, 8.6];
  return kind === 'equipment' ? [17.2, 7.5, 7.5, ...(equipmentCode ? [9.7] : [])] : [17.2, 7.5, 7.5];
};

/** Lo que cada recurso pide, bajo «Cantidad». */
const quantities = (kind: ResourceKind, equipmentCode: boolean): string[] => {
  if (kind === 'reagents') return [];
  return kind === 'equipment' ? ['Por curso', 'Por grupo', ...(equipmentCode ? ['Código'] : [])] : ['Por curso', 'Por grupo'];
};

const sheetCell = 'border-b border-r border-line-strong last:border-r-0';
const smallIcon = 'size-6 sm:size-5';

/**
 * La tabla de Recursos: las columnas que el formato muestra (Reactivos, Equipos y Materiales) con sus cantidades; el docente
 * la llena con lo que elige del inventario. Es una tabla real para que, si no cabe en la hoja, su cabecera se repita en la
 * página siguiente. Al imprimir lleva las filas vacías que llenan lo que sobra (`resourceRows`); en pantalla, tres de
 * muestra. Con `onChange` se renombran las columnas, se ocultan (queda al menos una) y se quita o se pone el «Código» de
 * los equipos.
 */
export function ResourcesTable({ draft, issues, onChange }: { draft: Draft; issues: FormIssues; onChange?: ((patch: Partial<Draft>) => void) | undefined }) {
  const editable = onChange !== undefined;
  const shown = draft.resources.filter((resource) => resource.shown);
  const hidden = draft.resources.filter((resource) => !resource.shown);
  const weights = shown.flatMap((resource) => columnWeights(resource.kind, draft.equipmentCode));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const head = cn(sheetCell, denseCell, cellKinds.head, 'text-center');
  const sub = cn(sheetCell, denseCell, cellKinds.label, 'text-center text-[10px]');

  const heading = (resource: DraftResource) => (
    <th key={resource.kind} rowSpan={2} className={cn(head, editable && 'p-0.5')}>
      {onChange ? (
        <span className="flex items-center gap-0.5">
          <EditableText
            label={`Nombre de la columna ${RESOURCE_LABELS[resource.kind]}`}
            value={resource.label}
            maxLength={40}
            placeholder={RESOURCE_LABELS[resource.kind]}
            error={issues.resources[resource.kind]}
            className="text-center uppercase placeholder:normal-case sm:min-h-5 sm:py-0"
            onChange={(label) => onChange({ resources: renameResource(draft.resources, resource.kind, label) })}
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn(smallIcon, 'shrink-0')}
            aria-label={`Ocultar la columna ${RESOURCE_LABELS[resource.kind]}`}
            disabled={shown.length === 1}
            onClick={() => {
              const resources = setResourceShown(draft.resources, resource.kind, false);
              if (resources) onChange({ resources });
            }}
          >
            <EyeOff aria-hidden />
          </Button>
        </span>
      ) : (
        resource.label.trim() || RESOURCE_LABELS[resource.kind]
      )}
    </th>
  );

  return (
    <>
      <div
        role="region"
        aria-label="Recursos de la actividad"
        tabIndex={0}
        className="overflow-x-auto bg-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action print:overflow-visible"
      >
        <table
          style={{ '--columns': weights.length } as CSSProperties}
          className="w-full min-w-[calc(var(--columns)*4.5rem)] table-fixed border-separate border-spacing-0 text-[11px] print:min-w-0 print:text-[8pt]"
        >
          <colgroup>
            {weights.map((weight, at) => (
              <col key={at} style={{ width: `${(weight / total) * 100}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {shown.flatMap((resource) => [
                heading(resource),
                resource.kind === 'reagents' ? (
                  <th key={`${resource.kind}-quantity`} rowSpan={2} className={sub}>
                    Cantidad total
                  </th>
                ) : (
                  <th key={`${resource.kind}-quantity`} colSpan={quantities(resource.kind, draft.equipmentCode).length} className={sub}>
                    Cantidad
                  </th>
                ),
              ])}
            </tr>
            <tr>
              {shown.flatMap((resource) =>
                quantities(resource.kind, draft.equipmentCode).map((name) => (
                  <th key={`${resource.kind}-${name}`} className={cn(sub, onChange && name === 'Código' && 'p-0')}>
                    {onChange && name === 'Código' ? (
                      <span className="flex items-center justify-center gap-0.5">
                        {name}
                        <Button variant="ghost" size="icon" className={cn(smallIcon, 'shrink-0')} aria-label="Quitar la columna Código de los equipos" onClick={() => onChange({ equipmentCode: false })}>
                          <X aria-hidden />
                        </Button>
                      </span>
                    ) : (
                      name
                    )}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {Array.from({ length: resourceRows(draft) }, (_, line) => (
              <tr key={line} className={cn('print:break-inside-avoid', line >= SAMPLE_ROWS && 'hidden print:table-row')}>
                {weights.map((_weight, column) => (
                  <td key={column} className={cn(sheetCell, denseCell, 'bg-white')} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-white px-1 py-0.5 print:hidden">
        {onChange ? (
          <>
            {hidden.map((resource) => (
              <Button key={resource.kind} className="h-11 sm:h-6" onClick={() => onChange({ resources: draft.resources.map((item) => (item.kind === resource.kind ? { ...item, shown: true } : item)) })}>
                <Eye aria-hidden />
                Mostrar {resource.label}
              </Button>
            ))}
            {shown.some((resource) => resource.kind === 'equipment') && !draft.equipmentCode ? (
              <Button className="h-11 sm:h-6" onClick={() => onChange({ equipmentCode: true })}>
                <Plus aria-hidden />
                Agregar el Código a Equipos
              </Button>
            ) : null}
            {shown.length === 1 ? <p className="text-[12px] text-ink-muted">Al menos una columna de Recursos queda en la hoja.</p> : null}
          </>
        ) : null}
        <p className="px-1 text-[11px] text-ink-subtle">El docente elige del inventario; por curso = por grupo × nº de grupos.</p>
      </div>
    </>
  );
}
