import { REQUEST_MAX_LINES, type FormLayout, type LabsRequest, type RequestLine, type RequestOptions } from '@platlab/contracts';
import { cn, formatDecimal, normalizeDecimalInput } from '@platlab/ui';
import { X } from 'lucide-react';
import { useId, useRef, type ReactElement, type ReactNode, type RefObject } from 'react';
import type { Draft, ResourceKind } from './form-draft';
import { sheetCell } from './form-resources';
import { resourceRows } from './form-sheet';
import { denseCell } from './form-parts';
import { lineCodes } from './practice-assets';
import { CellNote, Frame, WrapShadow, bare, wrapped } from './request-cells';
import { catalogOf, scopeText, slotted, verdictOf, type CheckAnswer, type CheckPlan } from './request-check';
import { LINE_KINDS, groupsOf, presents, totalOf, type DraftEquipment, type DraftLine, type DraftMaterial, type DraftReagent, type RequestDraft } from './request-draft';
import type { RequestIssues } from './request-draft-issues';
import { SavedMark, VerdictMark } from './request-line-check';
import { ResourcePicker, type CatalogEntry } from './request-picker';

/** Cuántas celdas ocupa cada recurso en la tabla de la hoja: su nombre y sus cantidades (y el código de los equipos). */
const cellCount = (kind: ResourceKind, equipmentCode: boolean): number => (kind === 'reagents' ? 2 : kind === 'equipment' ? 3 + (equipmentCode ? 1 : 0) : 3);

/** Las líneas de un recurso con su posición en el borrador (lo que el servidor comprobó y los avisos van por esa posición). */
const linesOf = (draft: RequestDraft, kind: ResourceKind) => draft.lines.flatMap((line, index) => (line.kind === LINE_KINDS[kind] ? [{ line, index }] : []));

/** Las columnas de Recursos que la hoja muestra, en su orden, y cuántas filas de líneas hacen falta para el recurso con más. */
function layoutOf(paper: Draft, draft: RequestDraft) {
  const shown = paper.resources.filter((resource) => resource.shown);
  const rows = Math.max(0, ...shown.map((resource) => linesOf(draft, resource.kind).length));
  return { shown, rows };
}

// Una celda de tabla no respeta `min-h`: el alto de fila va en `h-8` (en papel, el de la planilla).
const viewCell = cn(sheetCell, denseCell, 'h-8 bg-white');
const fillCell = cn(sheetCell, 'h-8 bg-white px-2.5 py-1.5 align-top');
const blanks = (count: number, prefix: string, className = viewCell): ReactElement[] => Array.from({ length: count }, (_, at) => <td key={`${prefix}-${at}`} className={className} />);

const decimal = (text: string) => text.replace(/[^\d.,]/g, '');
const integer = (text: string) => text.replace(/\D/g, '');

/* ------------------------------------------------------------------ Al llenar ------------------------------------------------------------------ */

/** En pantalla, al llenar, al menos estas filas, y siempre una vacía al final mientras quepan líneas. */
const MIN_FILL_ROWS = 5;

interface FillProps {
  paper: Draft;
  draft: RequestDraft;
  layout: FormLayout;
  options: RequestOptions | undefined;
  /** La consulta sin guardar de lo que hay escrito y su respuesta (ADR 0023, «Disponibilidad y recursos»). */
  plan: CheckPlan | null;
  answer: CheckAnswer | undefined;
  issues: RequestIssues;
  onChange: (patch: Partial<RequestDraft>) => void;
}

/** Lo que comparten las celdas de una fila al llenar. */
interface Fill extends FillProps {
  groups: number;
  byGroupAllowed: boolean;
  slot: boolean;
  scope: string;
  taken: ReadonlySet<string>;
  quantityId: (kind: DraftLine['kind'], at: number) => string;
  setLine: (line: DraftLine) => void;
  addLine: (line: DraftLine) => void;
  removeLine: (id: string) => void;
}

interface CellsProps {
  /** La línea de esa columna en esa fila, con su posición en el borrador. */
  found: { line: DraftLine; index: number } | undefined;
  at: number;
  /** La primera fila vacía de la columna: se escribe en ella para agregar. Las demás vacías esperan. */
  editable: boolean;
  fill: Fill;
}

/** Al elegir, el cursor pasa a la cantidad de esa fila (la línea nueva se dibuja después). */
const focusLater = (id: string) => window.setTimeout(() => document.getElementById(id)?.focus(), 0);

function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Quitar ${name}`}
      onClick={onRemove}
      className="absolute right-0.5 top-0.5 flex size-7 items-center justify-center rounded-full bg-white text-ink-subtle opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-action group-hover/line:opacity-100 group-focus-within/line:opacity-100 max-sm:size-11 [@media(hover:none)]:opacity-100 print:hidden"
    >
      <X className="size-3.5" aria-hidden />
    </button>
  );
}

/** La celda del nombre: el control, quitar la línea y el aviso del servidor. */
function NameCell({ line, issue, children, onRemove }: { line: DraftLine | undefined; issue: string | undefined; children: ReactNode; onRemove: (() => void) | undefined }) {
  return (
    <td className={cn(fillCell, 'group/line relative')}>
      <Frame>
        {children}
        {line && onRemove ? <RemoveButton name={line.name || 'la línea'} onRemove={onRemove} /> : null}
      </Frame>
      <CellNote>{issue}</CellNote>
    </td>
  );
}

function ReagentCells({ found, at, editable, fill }: CellsProps) {
  const anchor = useRef<HTMLTableCellElement>(null);
  const line = found?.line.kind === 'reagent' ? found.line : undefined;
  if (!line && !editable) return <>{blanks(2, `reagent-${at}`, fillCell)}</>;
  const index = found?.index ?? -1;
  const quantityId = fill.quantityId('reagent', at);
  const set = (next: Pick<DraftReagent, 'catalog' | 'itemId' | 'name' | 'unit'>) =>
    line ? fill.setLine({ ...line, ...next }) : fill.addLine({ id: crypto.randomUUID(), kind: 'reagent', quantity: '', ...next });
  const pick = (entry: CatalogEntry) => {
    set({ catalog: true, itemId: entry.id, name: entry.name, unit: entry.unit });
    focusLater(quantityId);
  };
  const free = (name: string) => {
    set({ catalog: false, itemId: null, name, unit: line?.unit ?? '' });
    focusLater(quantityId);
  };
  const issue = line ? fill.issues.lines[index] : undefined;
  return (
    <>
      <NameCell line={line} issue={issue} onRemove={line ? () => fill.removeLine(line.id) : undefined}>
        <ResourcePicker
          kind="reagent"
          label={`Reactivo de la fila ${at + 1}`}
          value={line?.name ?? ''}
          selectedId={line?.itemId ?? null}
          options={fill.options}
          catalog={catalogOf(fill.plan, fill.answer)}
          slotted={fill.slot}
          scope={fill.scope}
          taken={fill.taken}
          invalid={issue !== undefined}
          anchor={anchor}
          onPick={pick}
          onFree={free}
        />
      </NameCell>
      <td ref={anchor} className={fillCell}>
        {line ? (
          <Frame>
            {/* Cantidad, unidad y marca comparten una columna angosta: menos aire a los lados para que quepan. */}
            <input
              id={quantityId}
              aria-label={`Cantidad total de ${line.name || 'reactivo'}`}
              inputMode="decimal"
              autoComplete="off"
              value={line.quantity}
              onChange={(event) => fill.setLine({ ...line, quantity: decimal(event.target.value) })}
              className={cn(bare, 'px-1.5 text-right')}
            />
            {line.catalog ? (
              <span className="shrink-0 pr-1 text-ink-muted">{line.unit}</span>
            ) : (
              <input aria-label={`Unidad de ${line.name || 'reactivo'}`} autoComplete="off" maxLength={10} placeholder="Unidad" value={line.unit} onChange={(event) => fill.setLine({ ...line, unit: event.target.value })} className={cn(bare, 'w-14 shrink-0 px-1 print:placeholder:text-transparent')} />
            )}
            <VerdictMark verdict={verdictOf(line, index, fill.plan, fill.answer)} />
          </Frame>
        ) : null}
      </td>
    </>
  );
}

/** Las dos celdas de cantidad: por curso (el total) y por grupo. Lo que se escribe en una decide cuál se pide; el total por grupo lo calcula la hoja. */
function QuantityCells({ line, at, index, fill, anchor }: { line: DraftEquipment | DraftMaterial; at: number; index: number; fill: Fill; anchor?: RefObject<HTMLTableCellElement | null> }) {
  const label = line.name || (line.kind === 'equipment' ? 'equipo' : 'material');
  const clean = line.kind === 'equipment' ? integer : decimal;
  const mode = line.kind === 'equipment' ? 'numeric' : 'decimal';
  return (
    <>
      <td className={fillCell}>
        <Frame>
          <input
            id={fill.quantityId(line.kind, at)}
            aria-label={`Cantidad por curso de ${label}`}
            inputMode={mode}
            autoComplete="off"
            value={line.byGroup ? totalOf(line.perGroup, fill.groups) : line.quantity}
            onChange={(event) => fill.setLine({ ...line, byGroup: false, perGroup: '', quantity: clean(event.target.value) })}
            className={cn(bare, line.byGroup && 'text-ink-muted')}
          />
          {line.kind === 'equipment' ? <VerdictMark verdict={verdictOf(line, index, fill.plan, fill.answer)} /> : null}
        </Frame>
      </td>
      <td ref={anchor} className={fillCell}>
        {fill.byGroupAllowed ? (
          <Frame>
            <input
              aria-label={`Cantidad por grupo de ${label}`}
              inputMode={mode}
              autoComplete="off"
              value={line.byGroup ? line.perGroup : ''}
              onChange={(event) => {
                const perGroup = clean(event.target.value);
                fill.setLine({ ...line, byGroup: perGroup !== '', perGroup });
              }}
              className={bare}
            />
          </Frame>
        ) : null}
      </td>
    </>
  );
}

function EquipmentCells({ found, at, editable, fill }: CellsProps) {
  const anchor = useRef<HTMLTableCellElement>(null);
  const line = found?.line.kind === 'equipment' ? found.line : undefined;
  const code = fill.paper.equipmentCode ? 1 : 0;
  if (!line && !editable) return <>{blanks(3 + code, `equipment-${at}`, fillCell)}</>;
  const index = found?.index ?? -1;
  const quantityId = fill.quantityId('equipment', at);
  const set = (next: Pick<DraftEquipment, 'catalog' | 'assetTypeId' | 'name'>) =>
    line ? fill.setLine({ ...line, ...next }) : fill.addLine({ id: crypto.randomUUID(), kind: 'equipment', byGroup: false, perGroup: '', quantity: '1', ...next });
  const issue = line ? fill.issues.lines[index] : undefined;
  return (
    <>
      <NameCell line={line} issue={issue} onRemove={line ? () => fill.removeLine(line.id) : undefined}>
        <ResourcePicker
          kind="equipment"
          label={`Equipo de la fila ${at + 1}`}
          value={line?.name ?? ''}
          selectedId={line?.assetTypeId ?? null}
          options={fill.options}
          catalog={catalogOf(fill.plan, fill.answer)}
          slotted={fill.slot}
          scope={fill.scope}
          taken={fill.taken}
          invalid={issue !== undefined}
          anchor={anchor}
          onPick={(entry) => {
            set({ catalog: true, assetTypeId: entry.id, name: entry.name });
            focusLater(quantityId);
          }}
          onFree={(name) => {
            set({ catalog: false, assetTypeId: null, name });
            focusLater(quantityId);
          }}
        />
      </NameCell>
      {line ? <QuantityCells line={line} at={at} index={index} fill={fill} anchor={anchor} /> : <>{[<td key="course" className={fillCell} />, <td key="group" ref={anchor} className={fillCell} />]}</>}
      {/* El código lo escribe el laboratorio al entregar el equipo. */}
      {code ? <td className={fillCell} /> : null}
    </>
  );
}

function MaterialCells({ found, at, editable, fill }: CellsProps) {
  const line = found?.line.kind === 'material' ? found.line : undefined;
  if (!line && !editable) return <>{blanks(3, `material-${at}`, fillCell)}</>;
  const index = found?.index ?? -1;
  // Escribir en la fila vacía agrega el material; borrar el nombre de uno sin cantidad lo quita.
  const write = (name: string) => {
    if (!line) return name.trim() === '' ? undefined : fill.addLine({ id: crypto.randomUUID(), kind: 'material', name, byGroup: false, perGroup: '', quantity: '' });
    if (name === '' && line.quantity === '' && line.perGroup === '') return fill.removeLine(line.id);
    fill.setLine({ ...line, name });
  };
  const issue = line ? fill.issues.lines[index] : undefined;
  return (
    <>
      <NameCell line={line} issue={issue} onRemove={line ? () => fill.removeLine(line.id) : undefined}>
        <span className="grid min-w-0 flex-1">
        <input
          aria-label={`Material de la fila ${at + 1}`}
          aria-invalid={issue !== undefined || undefined}
          autoComplete="off"
          maxLength={200}
          placeholder="Escribe el material"
          value={line?.name ?? ''}
          onChange={(event) => write(event.target.value)}
          className={cn(bare, line?.name && wrapped, 'print:placeholder:text-transparent')}
        />
        <WrapShadow value={line?.name ?? ''} />
        </span>
      </NameCell>
      {line ? <QuantityCells line={line} at={at} index={index} fill={fill} /> : <>{blanks(2, `material-${at}-q`, fillCell)}</>}
    </>
  );
}

const CELLS = { reagents: ReagentCells, equipment: EquipmentCells, materials: MaterialCells } as const;

/**
 * Las filas de la tabla de Recursos al llenar (ADR 0023, «Disponibilidad y recursos»). La hoja pone un recurso por
 * columna: la fila N lleva la línea N de cada uno. En pantalla, al menos cinco filas y una vacía al final en cada columna,
 * donde se escribe para agregar; al imprimir, las filas de la plantilla. Reactivos y Equipos se eligen con el buscador de
 * su celda; junto a la cantidad, ✔ o ⚠ según lo que hay escrito ahora.
 */
export function FillRows(props: FillProps) {
  const { paper, draft, layout, plan, onChange } = props;
  const base = useId();
  const { shown, rows } = layoutOf(paper, draft);
  const full = draft.lines.length >= REQUEST_MAX_LINES;
  const screenRows = Math.max(MIN_FILL_ROWS, rows + (full ? 0 : 1));
  const printRows = Math.max(resourceRows(paper), rows);
  const fill: Fill = {
    ...props,
    groups: groupsOf(draft, layout),
    byGroupAllowed: presents(layout, 'grupos'),
    slot: plan ? slotted(plan.body) : false,
    scope: scopeText(plan?.body),
    taken: new Set(draft.lines.flatMap((line) => (line.kind === 'reagent' && line.itemId ? [line.itemId] : line.kind === 'equipment' && line.assetTypeId ? [line.assetTypeId] : []))),
    quantityId: (kind, at) => `${base}-${kind}-${at}`,
    setLine: (next) => onChange({ lines: draft.lines.map((line) => (line.id === next.id ? next : line)) }),
    addLine: (line) => onChange({ lines: [...draft.lines, line] }),
    removeLine: (id) => onChange({ lines: draft.lines.filter((line) => line.id !== id) }),
  };
  const columns = shown.map((resource) => ({ kind: resource.kind, lines: linesOf(draft, resource.kind) }));
  return (
    <>
      {Array.from({ length: Math.max(screenRows, printRows) }, (_, at) => (
        <tr key={at} className={cn('print:break-inside-avoid', at >= screenRows && 'hidden print:table-row', at >= printRows && 'print:hidden')}>
          {columns.map(({ kind, lines }) => {
            const Cells = CELLS[kind];
            // Por posición: al escribir en la fila vacía, la línea nueva queda en el mismo control y no pierde el foco.
            return <Cells key={`${kind}-${at}`} found={lines[at]} at={at} editable={!full && at === lines.length} fill={fill} />;
          })}
        </tr>
      ))}
    </>
  );
}

/* --------------------------------------------------------------- Solo lectura --------------------------------------------------------------- */

/** Lo que la tabla necesita de la solicitud para dibujar sus filas. */
interface TableProps {
  paper: Draft;
  draft: RequestDraft;
  layout: FormLayout;
  /** Lo que el servidor dijo de cada línea al guardar. */
  saved: readonly RequestLine[] | null;
  /** El bloque de la hoja que se imprime: sus equipos apartados llenan la columna «Código» (L-01e). Sin bloque, queda en blanco. */
  block?: Pick<LabsRequest['blocks'][number], 'holds'> | undefined;
}

/** La cantidad de una línea como se lee en la hoja: el total, y por separado lo pedido por grupo. */
function viewAmounts(line: DraftLine, groups: number): [course: string, group: string] {
  if (line.kind === 'reagent') return [`${formatDecimal(normalizeDecimalInput(line.quantity))} ${line.unit}`.trim(), ''];
  const show = (text: string) => (text === '' ? '' : line.kind === 'material' ? formatDecimal(normalizeDecimalInput(text)) : text);
  if (!line.byGroup) return [show(line.quantity), ''];
  return [show(totalOf(line.perGroup, groups)), show(line.perGroup)];
}

/** Una línea en la hoja de solo lectura: su nombre y sus cantidades, con su ✔ ⚠ ✖ junto al total (no se imprime), o las celdas en blanco. */
function viewCells(found: { line: DraftLine; index: number } | undefined, { paper, draft, layout, saved, block }: TableProps, kind: ResourceKind, prefix: string): ReactElement[] {
  if (!found) return blanks(cellCount(kind, paper.equipmentCode), prefix);
  const { line, index } = found;
  const verdict = saved?.[index];
  const [course, group] = viewAmounts(line, groupsOf(draft, layout));
  const quantity = (key: string, text: string, marked = false) => (
    <td key={`${prefix}-${key}`} className={viewCell}>
      {marked && verdict ? (
        <span className="flex items-center justify-between gap-1">
          {text}
          <SavedMark line={verdict} />
        </span>
      ) : (
        text
      )}
    </td>
  );
  return [
    <td key={`${prefix}-name`} className={viewCell}>
      <span className="break-words">{line.name}</span>
    </td>,
    ...(line.kind === 'reagent'
      ? [quantity('total', course, true)]
      : [quantity('course', course, line.kind === 'equipment'), quantity('group', group), ...(kind === 'equipment' && paper.equipmentCode ? [quantity('code', lineCodes(block, index + 1))] : [])]),
  ];
}

/**
 * Las filas de la tabla de Recursos en la hoja de solo lectura: las líneas pedidas, con lo que el servidor comprobó (en
 * pantalla) y, al imprimir, filas en blanco hasta llenar la hoja, como en la plantilla. Sin líneas, tres filas en blanco.
 */
export function ViewRows(props: TableProps) {
  const { paper, draft } = props;
  const { shown, rows } = layoutOf(paper, draft);
  const columns = shown.map((resource) => ({ resource, lines: linesOf(draft, resource.kind) }));
  const blankRows = Math.max(resourceRows(paper), rows) - rows;
  return (
    <>
      {Array.from({ length: rows + blankRows }, (_, at) => (
        <tr key={at} className={cn('print:break-inside-avoid', at >= Math.max(rows, 3) && 'hidden print:table-row')}>
          {columns.flatMap(({ resource, lines }) => viewCells(lines[at], props, resource.kind, `${resource.kind}-${at}`))}
        </tr>
      ))}
    </>
  );
}
