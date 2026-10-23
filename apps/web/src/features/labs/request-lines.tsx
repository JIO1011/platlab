import { REQUEST_MAX_LINES, type FormLayout, type RequestLine, type RequestOptions } from '@platlab/contracts';
import { cn, formatDecimal, normalizeDecimalInput } from '@platlab/ui';
import { Plus, X } from 'lucide-react';
import { Fragment, type ReactElement, type ReactNode } from 'react';
import type { ComboOption } from '../../app/combobox';
import type { Draft, ResourceKind } from './form-draft';
import { sheetCell } from './form-resources';
import { resourceRows } from './form-sheet';
import { denseCell } from './form-parts';
import { CellNote, Frame, bare } from './request-cells';
import { CatalogPicker } from './request-catalog-picker';
import { LineCheck } from './request-line-check';
import {
  LINE_KINDS,
  groupsOf,
  newLine,
  presents,
  totalOf,
  type DraftEquipment,
  type DraftLine,
  type DraftMaterial,
  type DraftReagent,
  type RequestDraft,
  type RequestIssues,
} from './request-draft';

/** Cuántas celdas ocupa cada recurso en la tabla de la hoja: su nombre y sus cantidades (y el código de los equipos). */
const cellCount = (kind: ResourceKind, equipmentCode: boolean): number => (kind === 'reagents' ? 2 : kind === 'equipment' ? 3 + (equipmentCode ? 1 : 0) : 3);

/** Las líneas de un recurso con su posición en el borrador (lo que el servidor comprobó y los avisos van por esa posición). */
const linesOf = (draft: RequestDraft, kind: ResourceKind) => draft.lines.flatMap((line, index) => (line.kind === LINE_KINDS[kind] ? [{ line, index }] : []));

const cell = cn(sheetCell, 'bg-white px-1.5 py-0.5 align-top');
const decimal = (text: string) => text.replace(/[^\d.,]/g, '');
const integer = (text: string) => text.replace(/\D/g, '');

const emptyCells = (kind: ResourceKind, equipmentCode: boolean, prefix: string): ReactElement[] =>
  Array.from({ length: cellCount(kind, equipmentCode) }, (_, at) => <td key={`${prefix}-${at}`} className={cell} />);

/** Lo que la tabla necesita de la solicitud para dibujar sus filas. */
interface TableProps {
  paper: Draft;
  draft: RequestDraft;
  layout: FormLayout;
  /** Lo que el servidor dijo de cada línea al guardar; con cambios sin guardar es `null`. */
  saved: readonly RequestLine[] | null;
}

/** Las columnas de Recursos que la hoja muestra, en su orden, y cuántas filas de líneas hacen falta para el recurso con más. */
function layoutOf({ paper, draft }: TableProps) {
  const shown = paper.resources.filter((resource) => resource.shown);
  const rows = Math.max(0, ...shown.map((resource) => linesOf(draft, resource.kind).length));
  return { shown, rows };
}

interface FillProps extends TableProps {
  /** El catálogo de reactivos y los tipos de equipo, con lo disponible hoy; mientras cargan, no se agrega nada. */
  options: RequestOptions | undefined;
  issues: RequestIssues;
  onChange: (patch: Partial<RequestDraft>) => void;
}

interface LineCells {
  line: DraftLine;
  index: number;
  groups: number;
  byGroupAllowed: boolean;
  props: FillProps;
  setLine: (line: DraftLine) => void;
  remove: () => void;
}

/** El nombre de la línea con su buscador, el cambio a «no catalogado», su ✔ ⚠ ✖ y lo que falta; y «Quitar». */
function NameCell({ label, picker, toggle, line, index, props, remove }: { label: string; picker: ReactNode; toggle: ReactNode; line: DraftLine; index: number; props: FillProps; remove: () => void }) {
  const verdict = props.saved?.[index];
  return (
    <td className={cell}>
      <Frame className="items-start">
        <div className="min-w-0 flex-1">{picker}</div>
        <button
          type="button"
          aria-label={`Quitar ${line.name || label}`}
          onClick={remove}
          className="flex size-11 shrink-0 items-center justify-center rounded-[3px] text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-action sm:size-6"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </Frame>
      {toggle}
      {verdict ? (
        <div className="pt-0.5 text-[11px] print:hidden">
          <LineCheck line={verdict} compact />
        </div>
      ) : null}
      <CellNote>{props.issues.lines[index]}</CellNote>
    </td>
  );
}

/** Cambiar entre el catálogo y «no catalogado»: lo elegido o escrito se descarta. */
function CatalogToggle({ catalog, enabled, onToggle }: { catalog: boolean; enabled: boolean; onToggle: () => void }) {
  if (!enabled) return null;
  return (
    <button type="button" onClick={onToggle} className="-mx-1 min-h-11 rounded-[3px] px-1 text-left text-[11px] font-medium text-action underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-action sm:min-h-5">
      {catalog ? 'No está en el catálogo' : 'Elegir del catálogo'}
    </button>
  );
}

function textInput(label: string, value: string, onChange: (text: string) => void, maxLength: number, placeholder: string) {
  return <input aria-label={label} autoComplete="off" maxLength={maxLength} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className={bare} />;
}

function reagentCells({ line, index, props, setLine, remove }: LineCells & { line: DraftReagent }): ReactElement[] {
  const reagents = props.options?.reagents ?? [];
  const choices: ComboOption[] = reagents.map((reagent) => ({ id: reagent.id, label: reagent.name, keywords: reagent.code, detail: `${reagent.code} · Disponible: ${formatDecimal(reagent.available)} ${reagent.unit}` }));
  const invalid = props.issues.lines[index] !== undefined;
  const picker = line.catalog ? (
    <CatalogPicker
      label="Reactivo del catálogo"
      value={line.name}
      options={choices}
      placeholder="Buscar reactivo"
      invalid={invalid}
      onPick={(option) => setLine({ ...line, name: option.label, itemId: option.id, unit: reagents.find((reagent) => reagent.id === option.id)?.unit ?? '' })}
    />
  ) : (
    textInput('Reactivo no catalogado', line.name, (name) => setLine({ ...line, name }), 200, 'Nombre del reactivo')
  );
  return [
    <NameCell
      key="name"
      label="el reactivo"
      line={line}
      index={index}
      props={props}
      remove={remove}
      picker={picker}
      toggle={<CatalogToggle catalog={line.catalog} enabled={props.options?.reagentsEnabled ?? false} onToggle={() => setLine({ ...line, catalog: !line.catalog, itemId: null, name: '', unit: '' })} />}
    />,
    <td key="quantity" className={cell}>
      <Frame>
        <input aria-label={`Cantidad de ${line.name || 'reactivo'}`} inputMode="decimal" autoComplete="off" value={line.quantity} onChange={(event) => setLine({ ...line, quantity: decimal(event.target.value) })} className={bare} />
        {line.catalog ? (
          <span className="shrink-0 pr-1.5 text-ink-muted">{line.unit}</span>
        ) : (
          <input aria-label={`Unidad de ${line.name || 'reactivo'}`} autoComplete="off" maxLength={10} placeholder="Unidad" value={line.unit} onChange={(event) => setLine({ ...line, unit: event.target.value })} className={cn(bare, 'w-14 shrink-0')} />
        )}
      </Frame>
    </td>,
  ];
}

/** Las dos celdas de cantidad: por curso (el total) y por grupo. Lo que se escribe en una decide cuál se pide; el total por grupo lo calcula la hoja. */
function quantityCells(line: DraftEquipment | DraftMaterial, { groups, byGroupAllowed, setLine }: LineCells, clean: (text: string) => string, mode: 'numeric' | 'decimal'): ReactElement[] {
  const label = line.name || (line.kind === 'equipment' ? 'equipo' : 'material');
  return [
    <td key="course" className={cell}>
      <Frame>
        <input
          aria-label={`Cantidad por curso de ${label}`}
          inputMode={mode}
          autoComplete="off"
          value={line.byGroup ? totalOf(line.perGroup, groups) : line.quantity}
          onChange={(event) => setLine({ ...line, byGroup: false, perGroup: '', quantity: clean(event.target.value) })}
          className={cn(bare, line.byGroup && 'text-ink-muted')}
        />
      </Frame>
    </td>,
    <td key="group" className={cell}>
      {byGroupAllowed ? (
        <Frame>
          <input
            aria-label={`Cantidad por grupo de ${label}`}
            inputMode={mode}
            autoComplete="off"
            value={line.byGroup ? line.perGroup : ''}
            onChange={(event) => {
              const perGroup = clean(event.target.value);
              setLine({ ...line, byGroup: perGroup !== '', perGroup });
            }}
            className={bare}
          />
        </Frame>
      ) : null}
    </td>,
  ];
}

function equipmentCells(cells: LineCells & { line: DraftEquipment }): ReactElement[] {
  const { line, index, props, setLine, remove } = cells;
  const types = props.options?.equipmentTypes ?? [];
  const choices: ComboOption[] = types.map((type) => ({ id: type.id, label: type.name, detail: `${type.available} operativos` }));
  const picker = line.catalog ? (
    <CatalogPicker
      label="Tipo de equipo"
      value={line.name}
      options={choices}
      placeholder="Buscar equipo"
      invalid={props.issues.lines[index] !== undefined}
      onPick={(option) => setLine({ ...line, name: option.label, assetTypeId: option.id })}
    />
  ) : (
    textInput('Equipo no catalogado', line.name, (name) => setLine({ ...line, name }), 200, 'Nombre del equipo')
  );
  return [
    <NameCell
      key="name"
      label="el equipo"
      line={line}
      index={index}
      props={props}
      remove={remove}
      picker={picker}
      toggle={<CatalogToggle catalog={line.catalog} enabled={props.options?.equipmentEnabled ?? false} onToggle={() => setLine({ ...line, catalog: !line.catalog, assetTypeId: null, name: '' })} />}
    />,
    ...quantityCells(line, cells, integer, 'numeric'),
    // El código lo escribe el laboratorio al entregar el equipo.
    ...(props.paper.equipmentCode ? [<td key="code" className={cell} />] : []),
  ];
}

function materialCells(cells: LineCells & { line: DraftMaterial }): ReactElement[] {
  const { line, index, props, setLine, remove } = cells;
  return [
    <NameCell key="name" label="el material" line={line} index={index} props={props} remove={remove} picker={textInput('Material', line.name, (name) => setLine({ ...line, name }), 200, 'Material')} toggle={null} />,
    ...quantityCells(line, cells, decimal, 'decimal'),
  ];
}

/**
 * Las filas de la tabla de Recursos al llenar. La hoja pone un recurso por columna: la fila N lleva la línea N de cada uno.
 * Cada celda es un control; la última fila trae el «+ Agregar» de cada columna. Tras guardar, cada línea lleva lo que el
 * servidor comprobó (✔ ⚠ ✖ y lo disponible); validar no reserva nada.
 */
export function FillRows(props: FillProps) {
  const { draft, layout, options, onChange, paper } = props;
  const { shown, rows } = layoutOf(props);
  const groups = groupsOf(draft, layout);
  const byGroupAllowed = presents(layout, 'grupos');
  const columns = shown.map((resource) => ({ resource, lines: linesOf(draft, resource.kind) }));

  const setLine = (next: DraftLine) => onChange({ lines: draft.lines.map((line) => (line.id === next.id ? next : line)) });
  const removeLine = (id: string) => onChange({ lines: draft.lines.filter((line) => line.id !== id) });
  const add = (kind: DraftLine['kind']) => {
    const catalog = kind === 'reagent' ? (options?.reagentsEnabled ?? false) : kind === 'equipment' ? (options?.equipmentEnabled ?? false) : false;
    onChange({ lines: [...draft.lines, newLine(kind, catalog)] });
  };

  const cellsOf = ({ line, index }: { line: DraftLine; index: number }): ReactElement[] => {
    const shared = { index, groups, byGroupAllowed, props, setLine, remove: () => removeLine(line.id) };
    if (line.kind === 'reagent') return reagentCells({ ...shared, line });
    if (line.kind === 'equipment') return equipmentCells({ ...shared, line });
    return materialCells({ ...shared, line });
  };

  return (
    <>
      {Array.from({ length: rows }, (_, at) => (
        <tr key={at}>
          {columns.flatMap(({ resource, lines }) => {
            const found = lines[at];
            return found ? cellsOf(found).map((node, position) => <Fragment key={`${found.line.id}-${position}`}>{node}</Fragment>) : emptyCells(resource.kind, paper.equipmentCode, `${resource.kind}-${at}`);
          })}
        </tr>
      ))}
      <tr>
        {columns.flatMap(({ resource }) => {
          const kind = LINE_KINDS[resource.kind];
          const label = resource.label.trim() || resource.kind;
          return [
            <td key={`${resource.kind}-add`} className={cn(cell, 'align-middle')}>
              <button
                type="button"
                aria-label={`Agregar a ${label}`}
                disabled={!options || draft.lines.length >= REQUEST_MAX_LINES}
                onClick={() => add(kind)}
                className="-mx-1 flex min-h-11 items-center gap-1 rounded-[3px] px-1 text-[11px] font-semibold text-action transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-action disabled:pointer-events-none disabled:opacity-40 sm:min-h-6"
              >
                <Plus className="size-3.5" aria-hidden />
                Agregar
              </button>
            </td>,
            ...emptyCells(resource.kind, paper.equipmentCode, `${resource.kind}-add`).slice(1),
          ];
        })}
      </tr>
    </>
  );
}

/** La cantidad de una línea como se lee en la hoja: el total, y por separado lo pedido por grupo. */
function viewAmounts(line: DraftLine, groups: number): [course: string, group: string] {
  if (line.kind === 'reagent') return [`${formatDecimal(normalizeDecimalInput(line.quantity))} ${line.unit}`.trim(), ''];
  const show = (text: string) => (text === '' ? '' : line.kind === 'material' ? formatDecimal(normalizeDecimalInput(text)) : text);
  if (!line.byGroup) return [show(line.quantity), ''];
  return [show(totalOf(line.perGroup, groups)), show(line.perGroup)];
}

const viewCell = cn(sheetCell, denseCell, 'bg-white');

/** Una línea en la hoja de solo lectura: su nombre con su ✔ ⚠ ✖ (que no se imprime) y sus cantidades, o las celdas en blanco. */
function viewCells(found: { line: DraftLine; index: number } | undefined, { paper, draft, layout, saved }: TableProps, kind: ResourceKind, prefix: string): ReactElement[] {
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
    ...(line.kind === 'reagent' ? [quantity('total', course)] : [quantity('course', course), quantity('group', group), ...(kind === 'equipment' && paper.equipmentCode ? [quantity('code', '')] : [])]),
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
