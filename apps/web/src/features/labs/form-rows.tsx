import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DroppableContainer,
  type Modifier,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FORM_MAX_FREE_FIELDS, FORM_MAX_PER_ROW } from '@platlab/contracts';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  OptionRow,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  cn,
} from '@platlab/ui';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, GripVertical, Lock, Move, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMediaQuery } from '../../app/use-media-query';
import { SYSTEM_LABELS, fieldsOf, freeKeys, isEssential, newField, typeLabels, type DraftField, type DraftRow, type FieldType, type FormIssues, type SystemKey } from './form-draft';
import {
  addField,
  addSection,
  canAddFree,
  moveItem,
  placeInNewRow,
  placeInRow,
  removeField,
  removeSection,
  removedOptional,
  renameField,
  renameSection,
  restoreSystemField,
  shiftField,
  shiftSection,
  updateFree,
  type Direction,
} from './form-edit';
import { Cell, Datum, EditableText, FieldSummary, Ghost, datumRoot, dataRowGrid, fieldTypes, reveal, sheetGrid, typeIcons } from './form-parts';

/** Lo que se ve en el valor de un dato del sistema, en gris, como ejemplo de lo que llenará el sistema o el docente. */
const SYSTEM_EXAMPLES: Record<SystemKey, string> = {
  titulo: 'Nombre de la práctica o del trabajo',
  docente: 'Nombre del docente',
  tipo: 'Se elige de una lista',
  asignatura: 'Se elige de una lista',
  carrera: 'Se elige de una lista',
  fecha: 'Una o varias fechas',
  horario: '17:00 - 20:00',
  participantes: '10',
  grupos: '1',
};

function FieldValue({ field }: { field: DraftField }) {
  return field.kind === 'system' ? <Ghost>{SYSTEM_EXAMPLES[field.key]}</Ghost> : <FieldSummary field={field} />;
}

/** El título de una sección: en la hoja de solo lectura, como la barra de color; el editor lo hace editable. */
function SectionTitle({ children }: { children: string }) {
  return (
    <Cell kind="head" dense>
      <h2>{children.trim() || 'Sección sin título'}</h2>
    </Cell>
  );
}

/**
 * La Sección I de solo lectura: la que se imprime y la que ve quien no edita el formato. `renderValue` pone en el valor de
 * cada dato lo que se llena o se revisó; sin él, el ejemplo en gris.
 */
export function SheetRows({ rows, renderValue }: { rows: readonly DraftRow[]; renderValue?: (field: DraftField) => ReactNode }) {
  return (
    <section aria-label="Datos de la actividad" className={sheetGrid}>
      {rows.map((row) =>
        row.kind === 'section' ? (
          <SectionTitle key={row.id}>{row.title}</SectionTitle>
        ) : (
          <div key={row.id} className={dataRowGrid(row.fields.length)}>
            {row.fields.map((field) => (
              <Datum key={field.id} label={field.label.trim() || 'Sin etiqueta'} value={renderValue ? renderValue(field) : <FieldValue field={field} />} />
            ))}
          </div>
        ),
      )}
    </section>
  );
}

const instructions =
  'Para mover, pulsa Espacio en el asa, usa las flechas y vuelve a pulsar Espacio para soltar. Esc cancela. También puedes usar el botón Mover de cada dato, o Alt con las flechas en su etiqueta.';

/** Curva de salida del sistema (--ease-out-expo): los vecinos se abren paso al arrastrar y se asientan al soltar. */
const settle = { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };

/** Los controles de edición miden 44 px en el móvil; en escritorio, 24 px para no ensanchar la fila de la hoja. */
const iconButton = 'size-11 sm:size-6';

const directions: Array<{ direction: Direction; label: string; Icon: typeof ArrowUp }> = [
  { direction: 'up', label: 'Subir', Icon: ArrowUp },
  { direction: 'down', label: 'Bajar', Icon: ArrowDown },
  { direction: 'left', label: 'A la izquierda', Icon: ArrowLeft },
  { direction: 'right', label: 'A la derecha', Icon: ArrowRight },
];

const arrowKeys: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const sectionKeys: Record<string, -1 | 1> = { ArrowUp: -1, ArrowDown: 1 };

/** Lo que dice el candado de un dato esencial, como texto accesible y como ayuda al pasar el puntero. */
const ESSENTIAL_NOTE = 'No se quita: lo usan el Cronograma y el aforo';

/** El tipo de lo que se arrastra: un dato, o una fila o título de sección completos. */
const kindOf = (item: { data: { current?: Record<string, unknown> | undefined } } | null | undefined) => item?.data.current?.type;

/** Soltar entre dos elementos de la hoja (o en sus extremos) saca el dato a una fila propia. */
const isGap = (container: DroppableContainer) => kindOf(container) === 'gap';

/**
 * Una fila o título solo se ordena entre filas. Un dato, con puntero: una franja entre filas gana si el puntero está sobre
 * ella; si no, el dato más cercano. Con el teclado no hay puntero y cuentan todos los datos y franjas.
 */
const collide: CollisionDetection = (args) => {
  if (kindOf(args.active) === 'row') return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((container) => kindOf(container) === 'row') });
  const targets = args.droppableContainers.filter((container) => kindOf(container) !== 'row');
  if (!args.pointerCoordinates) return closestCenter({ ...args, droppableContainers: targets });
  const gap = pointerWithin({ ...args, droppableContainers: targets.filter(isGap) });
  return gap.length > 0 ? gap : closestCenter({ ...args, droppableContainers: targets.filter((container) => !isGap(container)) });
};

/** Una fila arrastrada sube y baja, sin irse de lado. */
const verticalForRows: Modifier = ({ transform, active }) => (kindOf(active) === 'row' ? { ...transform, x: 0 } : transform);

/**
 * La franja de una posición entre elementos: invisible, salvo mientras se arrastra un dato; entonces una guía tenue marca
 * dónde puede caer y la de destino se vuelve una barra con su rótulo.
 */
function Gap({ index, last }: { index: number; last: boolean }) {
  const { active } = useDndContext();
  const dragging = kindOf(active) === 'field';
  const { setNodeRef, isOver } = useDroppable({ id: `gap-${index}`, data: { type: 'gap', index }, disabled: !dragging });
  return (
    <div ref={setNodeRef} aria-hidden className={cn('pointer-events-none absolute inset-x-0 z-[5] h-5 print:hidden', last ? 'bottom-0 translate-y-1/2' : 'top-0 -translate-y-1/2')}>
      <span
        className={cn(
          'absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-action transition-[opacity,height] duration-150 ease-out-expo',
          isOver ? 'h-1 opacity-100' : dragging ? 'h-0.5 opacity-30' : 'h-0.5 opacity-0',
        )}
      />
      {isOver ? <span className="absolute left-2 top-1/2 -translate-y-full rounded-[4px] bg-action px-1.5 text-[11px] font-medium leading-4 text-white">Fila nueva aquí</span> : null}
    </div>
  );
}

/**
 * Una fila o título de la Sección I con su asa en el margen izquierdo de la hoja: se arrastra (o se mueve con Espacio y las
 * flechas) y los demás se abren paso. Aloja las franjas de destino de los datos que se suelten entre filas.
 */
function RowShell({ id, label, index, last, reduceMotion, children }: { id: string; label: string; index: number; last: boolean; reduceMotion: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'row' },
    transition: reduceMotion ? null : settle,
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn('group/edit relative', isDragging && 'z-20 shadow-float')}>
      <Gap index={index} last={false} />
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        data-focus={`row-${id}`}
        aria-label={`Mover ${label}`}
        title="Arrastra para mover"
        className={cn(
          'absolute inset-y-0 -left-10 flex w-9 touch-none items-center justify-center rounded-control text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action',
          isDragging ? 'cursor-grabbing bg-surface-sunken text-ink' : 'cursor-grab',
        )}
      >
        <GripVertical className="size-5" aria-hidden />
      </button>
      {children}
      {last ? <Gap index={index + 1} last /> : null}
    </div>
  );
}

interface FieldProps {
  field: DraftField;
  number: number;
  keyName: string | undefined;
  problem: FormIssues['fields'][string] | undefined;
  reduceMotion: boolean;
  canMove: (direction: Direction) => boolean;
  canShiftRow: (step: -1 | 1) => boolean;
  onRename: (label: string) => void;
  onUpdate: (patch: Parameters<typeof updateFree>[2]) => void;
  onMove: (direction: Direction, focus: string) => void;
  onShiftRow: (step: -1 | 1, focus: string) => void;
  onRemove: () => void;
}

/** Los ajustes de un dato en un popover: tipo, opciones y obligatorio si es libre; de un dato del sistema, qué se puede hacer con él. */
function FieldSettings({ field, number, keyName, problem, onUpdate }: Pick<FieldProps, 'field' | 'number' | 'keyName' | 'problem' | 'onUpdate'>) {
  const name = field.label.trim() || `${number}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn(iconButton, problem?.options && 'text-danger')} aria-label={`Ajustes del dato ${name}`}>
          <SlidersHorizontal aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-80 gap-3 p-3">
        {field.kind === 'free' ? (
          <>
            <fieldset className="grid gap-0.5">
              <legend className="mb-1 text-sm font-medium text-ink">Tipo de dato</legend>
              {fieldTypes.map((type) => {
                const Icon = typeIcons[type];
                return (
                  <OptionRow key={type} type="radio" name={`type-${field.id}`} checked={field.type === type} onChange={() => onUpdate({ type })}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-ink-muted" aria-hidden />
                      {typeLabels[type]}
                    </span>
                  </OptionRow>
                );
              })}
            </fieldset>
            {field.type === 'list' ? (
              <Field label="Opciones" required error={problem?.options} hint="Una por línea, sin repetirse.">
                <Textarea rows={4} value={field.options} onChange={(event) => onUpdate({ options: event.target.value })} />
              </Field>
            ) : null}
            <OptionRow checked={field.required} onChange={(event) => onUpdate({ required: event.target.checked })}>
              Obligatorio
            </OptionRow>
            <p className="px-2 text-[13px] text-ink-muted">
              Clave de la respuesta: <code className="font-mono text-ink">{keyName}</code>
            </p>
          </>
        ) : (
          <p className="flex items-start gap-2 px-2 text-[13px] text-ink-muted">
            {isEssential(field) ? <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : null}
            {isEssential(field) ? `${ESSENTIAL_NOTE}. Puedes renombrarlo y moverlo.` : 'Dato del sistema: se renombra y se mueve, y conserva su clave en todos los formatos. Puedes quitarlo y volver a agregarlo.'}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** «Mover» con botones, para quien no arrastra: el dato un paso en cada dirección y, aparte, la fila entera arriba o abajo. */
function MoveMenu({ field, name, canMove, canShiftRow, onMove, onShiftRow }: { field: DraftField; name: string } & Pick<FieldProps, 'canMove' | 'canShiftRow' | 'onMove' | 'onShiftRow'>) {
  const focus = `move-menu-${field.id}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={iconButton} data-focus={focus} aria-label={`Mover el dato ${name} con botones`}>
          <Move aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-64 gap-2 p-3">
        <p className="text-sm font-medium text-ink">Mover «{name}»</p>
        <div className="grid grid-cols-2 gap-1">
          {directions.map(({ direction, label, Icon }) => (
            <Button key={direction} variant="secondary" className="h-11 justify-start sm:h-9" aria-label={`${label}: ${name}`} disabled={!canMove(direction)} onClick={() => onMove(direction, focus)}>
              <Icon aria-hidden />
              {label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 border-t border-line pt-2">
          {([-1, 1] as const).map((step) => (
            <Button key={step} variant="secondary" className="h-11 justify-start sm:h-9" disabled={!canShiftRow(step)} onClick={() => onShiftRow(step, focus)}>
              {step < 0 ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}
              {step < 0 ? 'Subir la fila' : 'Bajar la fila'}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Lo que dice al lado de la etiqueta: el candado de un dato esencial o el asterisco de un libre obligatorio. */
function Marker({ field }: { field: DraftField }) {
  if (isEssential(field)) {
    return (
      <span role="img" aria-label={ESSENTIAL_NOTE} title={ESSENTIAL_NOTE} className="flex shrink-0 items-center px-1 text-ink-muted">
        <Lock className="size-3.5" aria-hidden />
      </span>
    );
  }
  return field.kind === 'free' && field.required ? (
    <span role="img" aria-label="Obligatorio" title="Obligatorio" className="flex shrink-0 items-center px-1 font-bold text-ink">
      <span aria-hidden>*</span>
    </span>
  ) : null;
}

/** Un dato de la Sección I: su asa y su etiqueta (que se renombra en el sitio, con candado o asterisco) y lo que se pedirá, con los controles al pasar o enfocar. */
function FieldDatum(props: FieldProps) {
  const { field, number, problem, reduceMotion, onRename, onMove, onRemove } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: field.id,
    data: { type: 'field' },
    transition: reduceMotion ? null : settle,
  });
  const name = field.label.trim() || `${number}`;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(datumRoot, 'group/edit relative', isDragging && 'z-20 shadow-float ring-2 ring-action', isOver && !isDragging && 'outline-2 -outline-offset-2 outline-action')}
    >
      {isOver && !isDragging ? <span aria-hidden className="pointer-events-none absolute -top-2.5 left-2 z-10 rounded-[4px] bg-action px-1.5 text-[11px] font-medium leading-4 text-white">Soltar aquí</span> : null}
      <Cell kind="label" dense className="flex items-stretch gap-0 p-0">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          data-focus={`move-${field.id}`}
          aria-label={`Mover el dato ${name}`}
          title="Arrastra para mover"
          className={cn(
            'flex w-5 shrink-0 touch-none items-center justify-center self-stretch rounded-control text-ink-subtle transition-colors hover:bg-action-soft hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action max-sm:w-11',
            isDragging ? 'cursor-grabbing text-ink' : 'cursor-grab',
          )}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 py-0.5">
          <EditableText
            label={`Etiqueta del dato ${number}`}
            value={field.label}
            maxLength={80}
            placeholder="Etiqueta del dato"
            error={problem?.label}
            focusKey={`label-${field.id}`}
            className="uppercase placeholder:normal-case sm:min-h-5 sm:py-0"
            onChange={onRename}
            onKeyDown={(event) => {
              const direction = event.altKey ? arrowKeys[event.key] : undefined;
              if (!direction) return;
              event.preventDefault();
              onMove(direction, `label-${field.id}`);
            }}
          />
        </div>
        <Marker field={field} />
      </Cell>
      <Cell dense className="relative flex items-center gap-0.5 py-0 pr-0.5">
        <span className="min-w-0 flex-1">
          <FieldValue field={field} />
        </span>
        <span className={cn('ml-auto flex shrink-0 items-center [@media(hover:hover)]:absolute [@media(hover:hover)]:inset-y-0 [@media(hover:hover)]:right-0.5 [@media(hover:hover)]:bg-white [@media(hover:hover)]:pl-1', reveal)}>
          <MoveMenu field={field} name={name} canMove={props.canMove} canShiftRow={props.canShiftRow} onMove={props.onMove} onShiftRow={props.onShiftRow} />
          <FieldSettings field={field} number={number} keyName={props.keyName} problem={problem} onUpdate={props.onUpdate} />
          {isEssential(field) ? null : (
            <Button variant="ghost" size="icon" className={cn(iconButton, 'text-danger')} aria-label={`Quitar el dato ${name}`} onClick={onRemove}>
              <Trash2 aria-hidden />
            </Button>
          )}
        </span>
      </Cell>
      {problem?.options ? (
        <p role="alert" className="col-span-full bg-danger-soft px-2 py-1 text-[12px] font-medium text-danger">
          Opciones de «{name}»: {problem.options}
        </p>
      ) : null}
    </div>
  );
}

/** El título de una sección en edición: se renombra en el sitio, sube, baja o se quita (los botones aparecen al pasar o enfocar). */
function SectionBar({ row, error, canUp, canDown, onRename, onShift, onRemove }: { row: Extract<DraftRow, { kind: 'section' }>; error: string | undefined; canUp: boolean; canDown: boolean; onRename: (title: string) => void; onShift: (step: -1 | 1) => void; onRemove: () => void }) {
  return (
    <Cell kind="head" dense className="flex items-start gap-0.5 p-0.5">
      <div className="min-w-0 flex-1">
        <EditableText
          label="Título de la sección"
          value={row.title}
          maxLength={80}
          placeholder="Título de la sección"
          error={error}
          focusKey={`title-${row.id}`}
          className="uppercase placeholder:normal-case sm:min-h-5 sm:py-0"
          onChange={onRename}
          onKeyDown={(event) => {
            const step = event.altKey ? sectionKeys[event.key] : undefined;
            if (step === undefined) return;
            event.preventDefault();
            onShift(step);
          }}
        />
      </div>
      <span className={cn('flex shrink-0 items-center', reveal)}>
        <Button variant="ghost" size="icon" className={iconButton} aria-label="Subir el título" disabled={!canUp} onClick={() => onShift(-1)}>
          <ArrowUp aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" className={iconButton} aria-label="Bajar el título" disabled={!canDown} onClick={() => onShift(1)}>
          <ArrowDown aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" className={cn(iconButton, 'text-danger')} aria-label="Quitar el título" onClick={onRemove}>
          <Trash2 aria-hidden />
        </Button>
      </span>
    </Cell>
  );
}

/** Dónde queda un dato, en palabras: la fila (sin contar los títulos) y su lugar en ella. */
function whereIs(rows: readonly DraftRow[], fieldId: string): string {
  const lines = rows.filter((row) => row.kind === 'row');
  const at = lines.findIndex((row) => row.fields.some((field) => field.id === fieldId));
  const row = lines[at];
  return row ? `la fila ${at + 1}, lugar ${row.fields.findIndex((field) => field.id === fieldId) + 1} de ${row.fields.length}` : 'su lugar';
}

/** Una fila o título, en palabras: «el título “X”» o «la fila N» (contando solo las filas de datos). */
function rowName(rows: readonly DraftRow[], id: string): string {
  const row = rows.find((item) => item.id === id);
  if (row?.kind === 'section') return `el título «${row.title.trim() || 'sin nombre'}»`;
  return `la fila ${rows.filter((item) => item.kind === 'row').findIndex((item) => item.id === id) + 1}`;
}

/**
 * La Sección I en edición (ADR 0023): títulos de sección y filas de 1 a 3 datos. Cada dato se reordena y pasa de una fila a
 * otra arrastrando su asa (dnd kit), con Espacio y las flechas en ella, con Alt + flechas en su etiqueta o con los botones
 * de sus ajustes; soltarlo sobre otro dato lo pone en esa fila (si le caben) y soltarlo entre filas le da una propia.
 * «Agregar dato» y los datos del sistema que se vuelven a agregar nacen en una fila propia. Es un borrador en pantalla:
 * solo «Publicar revisión» lo guarda. Tras agregar, quitar o mover, el foco vuelve a un control que sigue existiendo.
 */
export function FormRowsEditor({ rows, issues, onChange }: { rows: DraftRow[]; issues: FormIssues; onChange: (rows: DraftRow[]) => void }) {
  const root = useRef<HTMLElement>(null);
  const focusAfter = useRef<string | null>(null);
  const [status, setStatus] = useState('');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const fields = fieldsOf(rows);
  const keys = freeKeys(rows);
  const addable = canAddFree(rows);
  const removed = removedOptional(rows);
  // El asa arranca el arrastre a los 4 px (un toque no lo inicia); el teclado usa Espacio y las flechas.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    if (focusAfter.current === null) return;
    root.current?.querySelector<HTMLElement>(`[data-focus="${focusAfter.current}"]`)?.focus();
    focusAfter.current = null;
  });

  const nameOf = (id: string | number) => fields.find((field) => field.id === String(id))?.label.trim() || 'El dato';
  const announcements: Announcements = {
    onDragStart: ({ active }) => (kindOf(active) === 'row' ? `Tomaste ${rowName(rows, String(active.id))}, en el lugar ${rows.findIndex((row) => row.id === active.id) + 1} de ${rows.length}.` : `Tomaste ${nameOf(active.id)}, en ${whereIs(rows, String(active.id))}.`),
    onDragOver: ({ active, over }) => {
      if (kindOf(active) === 'row') return over ? `${rowName(rows, String(active.id))} pasa al lugar ${rows.findIndex((row) => row.id === over.id) + 1}.` : undefined;
      return kindOf(over) === 'gap' ? `${nameOf(active.id)} está entre filas: tendrá una fila propia.` : over ? `${nameOf(active.id)} está sobre ${nameOf(over.id)}.` : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const name = kindOf(active) === 'row' ? rowName(rows, String(active.id)) : nameOf(active.id);
      return over ? `${name} se soltó.` : `${name} quedó donde estaba.`;
    },
    onDragCancel: ({ active }) => (kindOf(active) === 'row' ? `Se canceló el movimiento. ${rowName(rows, String(active.id))} sigue en su lugar.` : `Se canceló el movimiento. ${nameOf(active.id)} sigue en ${whereIs(rows, String(active.id))}.`),
  };

  /** Aplica un cambio de la Sección I; si el foco debe volver a un control, `focus` lo nombra. */
  const apply = (next: DraftRow[], message: string, focus: string | null) => {
    focusAfter.current = focus;
    setStatus(message);
    onChange(next);
  };

  const move = (fieldId: string, direction: Direction, focus: string) => {
    const next = shiftField(rows, fieldId, direction);
    if (!next) {
      setStatus(`${nameOf(fieldId)} no puede ir más allá en esa dirección.`);
      return;
    }
    apply(next, `${nameOf(fieldId)} pasó a ${whereIs(next, fieldId)}.`, focus);
  };

  /** Pasa la fila entera un lugar arriba o abajo, también desde el menú «Mover» de uno de sus datos. */
  const shiftRow = (rowId: string, step: -1 | 1, focus: string) => {
    const next = shiftSection(rows, rowId, step);
    if (next) apply(next, `${rowName(next, rowId)} pasó al lugar ${next.findIndex((row) => row.id === rowId) + 1} de ${next.length}.`, focus);
  };

  const remove = (fieldId: string) => {
    const next = removeField(rows, fieldId);
    if (!next) return;
    const field = fields.find((item) => item.id === fieldId);
    apply(next, field?.kind === 'system' ? `Se quitó ${nameOf(fieldId)}. Puedes volver a agregarlo en «Datos del sistema».` : `Se quitó ${nameOf(fieldId)}.`, 'add');
  };

  const dropped = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    const target = over?.data.current;
    if (!over || !target || over.id === active.id) return;
    if (kindOf(active) === 'row') {
      const from = rows.findIndex((row) => row.id === id);
      const to = rows.findIndex((row) => row.id === String(over.id));
      if (from >= 0 && to >= 0) {
        const next = moveItem(rows, from, to);
        apply(next, `${rowName(next, id)} quedó en el lugar ${to + 1} de ${next.length}.`, `row-${id}`);
      }
      return;
    }
    const rowOf = rows.find((row) => row.kind === 'row' && row.fields.some((field) => field.id === String(over.id)));
    const next =
      target.type === 'gap'
        ? placeInNewRow(rows, id, Number(target.index))
        : rowOf?.kind === 'row'
          ? placeInRow(rows, id, rowOf.id, rowOf.fields.findIndex((field) => field.id === String(over.id)))
          : undefined;
    if (next) apply(next, `${nameOf(id)} quedó en ${whereIs(next, id)}.`, `move-${id}`);
    else setStatus(`Esa fila ya tiene ${FORM_MAX_PER_ROW} datos: no cabe otro.`);
  };

  const add = (type: FieldType) => {
    const field = newField(type);
    apply(addField(rows, field), '', `label-${field.id}`);
  };

  const addTitle = () => {
    const next = addSection(rows);
    const section = next[next.length - 1];
    apply(next, '', section ? `title-${section.id}` : null);
  };

  const shiftTitle = (id: string, step: -1 | 1) => {
    const next = shiftSection(rows, id, step);
    if (next) apply(next, '', `title-${id}`);
  };

  return (
    <section aria-label="Datos de la actividad" ref={root} className={sheetGrid}>
      <DndContext
        sensors={sensors}
        collisionDetection={collide}
        modifiers={[restrictToWindowEdges, verticalForRows]}
        accessibility={{ announcements, screenReaderInstructions: { draggable: instructions } }}
        onDragEnd={dropped}
      >
        <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          {rows.map((row, index) => (
            <RowShell
              key={row.id}
              id={row.id}
              label={row.kind === 'section' ? `el título «${row.title.trim() || 'sin nombre'}»` : `la fila ${rows.slice(0, index + 1).filter((item) => item.kind === 'row').length}`}
              index={index}
              last={index === rows.length - 1}
              reduceMotion={reduceMotion}
            >
              {row.kind === 'section' ? (
                <SectionBar
                  row={row}
                  error={issues.sections[row.id]}
                  canUp={index > 0}
                  canDown={index < rows.length - 1}
                  onRename={(title) => onChange(renameSection(rows, row.id, title))}
                  onShift={(step) => shiftTitle(row.id, step)}
                  onRemove={() => apply(removeSection(rows, row.id), 'Se quitó el título de la sección.', 'add')}
                />
              ) : (
                <SortableContext items={row.fields.map((field) => field.id)} strategy={rectSortingStrategy}>
                  <div className={dataRowGrid(row.fields.length)}>
                    {row.fields.map((field) => (
                      <FieldDatum
                        key={field.id}
                        field={field}
                        number={fields.indexOf(field) + 1}
                        keyName={keys.get(field.id)}
                        problem={issues.fields[field.id]}
                        reduceMotion={reduceMotion}
                        canMove={(direction) => shiftField(rows, field.id, direction) !== undefined}
                        canShiftRow={(step) => shiftSection(rows, row.id, step) !== undefined}
                        onRename={(label) => onChange(renameField(rows, field.id, label))}
                        onUpdate={(patch) => onChange(updateFree(rows, field.id, patch))}
                        onMove={(direction, focus) => move(field.id, direction, focus)}
                        onShiftRow={(step, focus) => shiftRow(row.id, step, focus)}
                        onRemove={() => remove(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </RowShell>
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-white px-1 py-0.5 print:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-11 sm:h-6" data-focus="add" disabled={!addable}>
              <Plus aria-hidden />
              Agregar dato
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            aria-label="Tipo del dato nuevo"
            // El foco pasa a la etiqueta del dato nuevo; si no se eligió ninguno, vuelve al botón.
            onCloseAutoFocus={(event) => {
              if (focusAfter.current !== null) event.preventDefault();
            }}
          >
            {fieldTypes.map((type) => {
              const Icon = typeIcons[type];
              return (
                <DropdownMenuItem key={type} className="h-11 sm:h-10" onSelect={() => add(type)}>
                  <Icon aria-hidden />
                  {typeLabels[type]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button className="h-11 sm:h-6" onClick={addTitle}>
          <Plus aria-hidden />
          Agregar título de sección
        </Button>
        {removed.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-11 sm:h-6">
                <Plus aria-hidden />
                Datos del sistema
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              aria-label="Datos del sistema que se quitaron"
              onCloseAutoFocus={(event) => {
                if (focusAfter.current !== null) event.preventDefault();
              }}
            >
              {removed.map((key) => (
                <DropdownMenuItem
                  key={key}
                  className="h-11 sm:h-10"
                  onSelect={() => apply(restoreSystemField(rows, key), '', `label-${key}`)}
                >
                  {SYSTEM_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {!addable ? <p className="text-[12px] text-ink-muted">El formato admite hasta {FORM_MAX_FREE_FIELDS} datos libres.</p> : null}
        <p role="status" className="min-w-0 flex-1 text-[12px] text-ink-muted">
          {status}
        </p>
      </div>
    </section>
  );
}
