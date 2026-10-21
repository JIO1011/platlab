import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FORM_MAX_FIELDS, type FormField } from '@platlab/contracts';
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
import { GripVertical, Plus, SlidersHorizontal, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMediaQuery } from '../../app/use-media-query';
import { assignKeys } from './field-keys';
import { hasTrailingGap } from './form-sheet';
import { moveField, newField, repeatsCore, typeLabels, type DraftField, type FormIssues } from './form-draft';
import { Cell, EditableText, FieldSummary, dataGrid, datumRoot, fieldTypes, typeIcons } from './form-parts';

const instructions =
  'Para mover el dato, pulsa Espacio, usa las flechas y vuelve a pulsar Espacio para soltarlo. Esc cancela. También puedes usar Alt con las flechas arriba y abajo en su etiqueta, que lo mueven una fila.';

/** Curva de salida del sistema (--ease-out-expo): los datos vecinos se abren paso al arrastrar y se asientan al soltar. */
const settle = { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };

/** Los controles de edición miden 44 px en el móvil; en escritorio, 24 px para no ensanchar la fila de la hoja. */
const iconButton = 'size-11 sm:size-6';

/** Los datos se acomodan de a dos por fila: subir o bajar una fila es moverse dos lugares. */
const ROW = 2;

interface RowProps {
  field: DraftField;
  index: number;
  keyName: string | undefined;
  problem: FormIssues['fields'][number] | undefined;
  reduceMotion: boolean;
  onUpdate: (patch: Partial<DraftField>) => void;
  onMove: (step: number, focus: string) => void;
  onRemove: () => void;
}

/** Los ajustes de un dato extra en un popover: tipo, opciones de la lista, obligatorio y quitar. */
function FieldSettings({ field, name, keyName, problem, onUpdate, onRemove }: Pick<RowProps, 'field' | 'keyName' | 'problem' | 'onUpdate' | 'onRemove'> & { name: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn(iconButton, problem?.options && 'text-danger')} aria-label={`Ajustes del dato ${name}`}>
          <SlidersHorizontal aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-80 gap-3 p-3">
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
        <Button variant="ghost" className="h-11 justify-start text-danger sm:h-9" onClick={onRemove}>
          <Trash2 aria-hidden />
          Quitar dato
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/** Un dato extra de la Sección I: etiqueta que se renombra en el sitio, lo que se pedirá y, al lado, el asa y los ajustes. */
function FieldDatum({ field, index, keyName, problem, reduceMotion, onUpdate, onMove, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    transition: reduceMotion ? null : settle,
  });
  const name = field.label.trim() || `${index + 1}`;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn(datumRoot('half'), 'relative', isDragging && 'z-10 shadow-float')}>
      <Cell kind="label" dense className="p-0.5">
        <EditableText
          label={`Etiqueta del dato ${index + 1}`}
          value={field.label}
          maxLength={80}
          placeholder="Etiqueta del dato"
          error={problem?.label}
          focusKey={`label-${field.id}`}
          className="uppercase placeholder:normal-case sm:min-h-5 sm:py-0"
          onChange={(label) => onUpdate({ label })}
          onKeyDown={(event) => {
            if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
            event.preventDefault();
            onMove(event.key === 'ArrowUp' ? -ROW : ROW, `label-${field.id}`);
          }}
        />
      </Cell>
      <Cell dense className="flex items-center gap-0.5 py-0 pr-0.5">
        <FieldSummary field={field} className="flex-1" />
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Mover el dato ${name}`}
          className={cn(
            'flex shrink-0 touch-none items-center justify-center rounded-control text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action',
            iconButton,
            isDragging ? 'cursor-grabbing text-ink' : 'cursor-grab',
          )}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <FieldSettings field={field} name={name} keyName={keyName} problem={problem} onUpdate={onUpdate} onRemove={onRemove} />
      </Cell>
      {repeatsCore(keyName) ? (
        <p className="col-span-full flex items-center gap-1.5 bg-warning-soft px-2 py-1 text-[12px] font-medium text-warning">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          Ya es un dato del sistema
        </p>
      ) : null}
      {problem?.options ? (
        <p role="alert" className="col-span-full bg-danger-soft px-2 py-1 text-[12px] font-medium text-danger">
          Opciones de «{name}»: {problem.options}
        </p>
      ) : null}
    </div>
  );
}

/**
 * La rejilla de la Sección I con sus datos extra editables, intercalados entre los del sistema (`lead` va antes, `tail`
 * después). Se reordenan arrastrando el asa, con Espacio y las flechas en ella o con Alt + flecha arriba o abajo en la
 * etiqueta; «Agregar dato», la última celda, elige primero el tipo. Es un borrador en pantalla: solo «Publicar versión» lo
 * guarda. Tras agregar, quitar o mover, el foco vuelve a un control que sigue existiendo.
 */
export function ExtraFields({
  fields,
  issues,
  onChange,
  lead,
  tail,
}: {
  fields: DraftField[];
  issues: FormIssues['fields'];
  onChange: (fields: DraftField[]) => void;
  lead: ReactNode;
  tail: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<string | null>(null);
  const [status, setStatus] = useState('');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const keys = assignKeys(fields);
  const ids = fields.map((field) => field.id);
  const full = fields.length >= FORM_MAX_FIELDS;
  // El asa arranca el arrastre a los 4 px (un toque no lo inicia); el teclado usa Espacio y las flechas.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    if (focusAfter.current === null) return;
    root.current?.querySelector<HTMLElement>(`[data-focus="${focusAfter.current}"]`)?.focus();
    focusAfter.current = null;
  });

  const nameOf = (id: string | number) => {
    const at = ids.indexOf(String(id));
    return fields[at]?.label.trim() || `El dato ${at + 1}`;
  };
  const positionOf = (id: string | number) => `${ids.indexOf(String(id)) + 1} de ${ids.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${nameOf(active.id)}, en la posición ${positionOf(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} está sobre la posición ${positionOf(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} quedó en la posición ${positionOf(over.id)}.` : `${nameOf(active.id)} quedó donde estaba.`),
    onDragCancel: ({ active }) => `Se canceló el movimiento. ${nameOf(active.id)} sigue en la posición ${positionOf(active.id)}.`,
  };

  const update = (id: string, patch: Partial<DraftField>) => onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  const add = (type: FormField['type']) => {
    const field = newField(type);
    focusAfter.current = `label-${field.id}`;
    onChange([...fields, field]);
  };
  const remove = (index: number) => {
    focusAfter.current = 'add';
    setStatus(`Se quitó el dato ${fields[index]?.label.trim() || index + 1}.`);
    onChange(fields.filter((_, at) => at !== index));
  };
  const move = (index: number, step: number, focus: string) => {
    const field = fields[index];
    const target = Math.min(Math.max(index + step, 0), fields.length - 1);
    if (!field || target === index) return;
    focusAfter.current = focus;
    setStatus(`${field.label.trim() || `El dato ${index + 1}`} pasó a la posición ${target + 1} de ${fields.length}.`);
    onChange(moveField(fields, index, target));
  };
  const dropped = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(moveField(fields, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <div ref={root} className={dataGrid}>
      {lead}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToParentElement]}
        accessibility={{ announcements, screenReaderInstructions: { draggable: instructions } }}
        onDragEnd={dropped}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          {fields.map((field, index) => (
            <FieldDatum
              key={field.id}
              field={field}
              index={index}
              keyName={keys[index]}
              problem={issues[index]}
              reduceMotion={reduceMotion}
              onUpdate={(patch) => update(field.id, patch)}
              onMove={(step, focus) => move(index, step, focus)}
              onRemove={() => remove(index)}
            />
          ))}
        </SortableContext>
      </DndContext>
      {tail}
      <p role="status" className="sr-only">
        {status}
      </p>
      <div className={cn('col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 bg-white px-1 py-0.5', hasTrailingGap(fields.length) ? 'sm:col-span-2' : 'sm:col-span-4')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-11 sm:h-6" data-focus="add" disabled={full}>
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
        {full ? <p className="text-[12px] text-ink-muted">El formato admite hasta {FORM_MAX_FIELDS} datos extra.</p> : null}
      </div>
    </div>
  );
}
