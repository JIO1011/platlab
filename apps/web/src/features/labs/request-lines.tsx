import type { FormLayout, LabsRequest, RequestLine } from '@platlab/contracts';
import { cn, formatDecimal, normalizeDecimalInput } from '@platlab/ui';
import type { ReactElement } from 'react';
import type { Draft, ResourceKind } from './form-draft';
import { sheetCell } from './form-resources';
import { resourceRows } from './form-sheet';
import { denseCell } from './form-parts';
import { lineCodes } from './practice-assets';
import { LineCheck } from './request-line-check';
import { LINE_KINDS, groupsOf, totalOf, type DraftLine, type RequestDraft } from './request-draft';

/** Cuántas celdas ocupa cada recurso en la tabla de la hoja: su nombre y sus cantidades (y el código de los equipos). */
const cellCount = (kind: ResourceKind, equipmentCode: boolean): number => (kind === 'reagents' ? 2 : kind === 'equipment' ? 3 + (equipmentCode ? 1 : 0) : 3);

/** Las líneas de un recurso con su posición en el borrador (lo que el servidor comprobó y los avisos van por esa posición). */
const linesOf = (draft: RequestDraft, kind: ResourceKind) => draft.lines.flatMap((line, index) => (line.kind === LINE_KINDS[kind] ? [{ line, index }] : []));

/** Lo que la tabla necesita de la solicitud para dibujar sus filas. */
interface TableProps {
  paper: Draft;
  draft: RequestDraft;
  layout: FormLayout;
  /** Lo que el servidor dijo de cada línea al guardar; al llenar es `null` (lo dice el panel «Recursos»). */
  saved: readonly RequestLine[] | null;
  /** El bloque de la hoja que se imprime: sus equipos apartados llenan la columna «Código» (L-01e). Sin bloque, queda en blanco. */
  block?: Pick<LabsRequest['blocks'][number], 'holds'> | undefined;
}

/** Las columnas de Recursos que la hoja muestra, en su orden, y cuántas filas de líneas hacen falta para el recurso con más. */
function layoutOf({ paper, draft }: TableProps) {
  const shown = paper.resources.filter((resource) => resource.shown);
  const rows = Math.max(0, ...shown.map((resource) => linesOf(draft, resource.kind).length));
  return { shown, rows };
}

/** La cantidad de una línea como se lee en la hoja: el total, y por separado lo pedido por grupo. */
function viewAmounts(line: DraftLine, groups: number): [course: string, group: string] {
  if (line.kind === 'reagent') return [`${formatDecimal(normalizeDecimalInput(line.quantity))} ${line.unit}`.trim(), ''];
  const show = (text: string) => (text === '' ? '' : line.kind === 'material' ? formatDecimal(normalizeDecimalInput(text)) : text);
  if (!line.byGroup) return [show(line.quantity), ''];
  return [show(totalOf(line.perGroup, groups)), show(line.perGroup)];
}

// Una celda de tabla no respeta `min-h`: el alto de fila va en `h-8` (en papel, el de la planilla).
const viewCell = cn(sheetCell, denseCell, 'h-8 bg-white');

/** Una línea en la hoja de solo lectura: su nombre con su ✔ ⚠ ✖ (que no se imprime) y sus cantidades, o las celdas en blanco. */
function viewCells(found: { line: DraftLine; index: number } | undefined, { paper, draft, layout, saved, block }: TableProps, kind: ResourceKind, prefix: string): ReactElement[] {
  if (!found) return Array.from({ length: cellCount(kind, paper.equipmentCode) }, (_, at) => <td key={`${prefix}-${at}`} className={viewCell} />);
  const { line, index } = found;
  const verdict = saved?.[index];
  const [course, group] = viewAmounts(line, groupsOf(draft, layout));
  const quantity = (key: string, text: string) => (
    <td key={`${prefix}-${key}`} className={viewCell}>
      {text}
    </td>
  );
  return [
    <td key={`${prefix}-name`} className={viewCell}>
      <span className="break-words">{line.name}</span>
      {verdict ? (
        <div className="pt-0.5 text-[11px] print:hidden">
          <LineCheck line={verdict} compact />
        </div>
      ) : null}
    </td>,
    ...(line.kind === 'reagent' ? [quantity('total', course)] : [quantity('course', course), quantity('group', group), ...(kind === 'equipment' && paper.equipmentCode ? [quantity('code', lineCodes(block, index + 1))] : [])]),
  ];
}

/**
 * Las filas de la tabla de Recursos en la hoja de solo lectura: las líneas pedidas, con lo que el servidor comprobó (en
 * pantalla) y, al imprimir, filas en blanco hasta llenar la hoja, como en la plantilla. Sin líneas, tres filas en blanco.
 */
export function ViewRows(props: TableProps) {
  const { paper, draft } = props;
  const { shown, rows } = layoutOf(props);
  const columns = shown.map((resource) => ({ resource, lines: linesOf(draft, resource.kind) }));
  const blanks = Math.max(resourceRows(paper), rows) - rows;
  return (
    <>
      {Array.from({ length: rows + blanks }, (_, at) => (
        <tr key={at} className={cn('print:break-inside-avoid', at >= Math.max(rows, 3) && 'hidden print:table-row')}>
          {columns.flatMap(({ resource, lines }) => viewCells(lines[at], props, resource.kind, `${resource.kind}-${at}`))}
        </tr>
      ))}
    </>
  );
}
