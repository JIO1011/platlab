import { useDndContext, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, cn } from '@platlab/ui';
import { ArrowDown, ArrowUp, GripVertical, Lock, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { isEssential, type DraftField, type DraftRow } from './form-draft';
import type { Direction } from './form-edit';
import { ESSENTIAL_NOTE, FieldSettings, MoveMenu, iconButton, type FieldProps } from './form-field-menus';
import { kindOf } from './form-rows-drag';
import { FieldValue } from './form-rows';
import { Cell, EditableText, datumRoot, reveal } from './form-parts';

/** Curva de salida del sistema (--ease-out-expo): los vecinos se abren paso al arrastrar y se asientan al soltar. */
const settle = { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };

const arrowKeys: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const sectionKeys: Record<string, -1 | 1> = { ArrowUp: -1, ArrowDown: 1 };

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
      {isOver ? <span className="absolute left-2 top-1/2 -translate-y-full rounded-[4px] bg-action px-1.5 text-[11px] font-medium leading-4 text-on-action">Fila nueva aquí</span> : null}
    </div>
  );
}

/**
 * Una fila o título de la Sección I con su asa en el margen izquierdo de la hoja: se arrastra (o se mueve con Espacio y las
 * flechas) y los demás se abren paso. Aloja las franjas de destino de los datos que se suelten entre filas.
 */
export function RowShell({ id, label, index, last, reduceMotion, children }: { id: string; label: string; index: number; last: boolean; reduceMotion: boolean; children: ReactNode }) {
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
export function FieldDatum(props: FieldProps) {
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
      {isOver && !isDragging ? <span aria-hidden className="pointer-events-none absolute -top-2.5 left-2 z-10 rounded-[4px] bg-action px-1.5 text-[11px] font-medium leading-4 text-on-action">Soltar aquí</span> : null}
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
export function SectionBar({ row, error, canUp, canDown, onRename, onShift, onRemove }: { row: Extract<DraftRow, { kind: 'section' }>; error: string | undefined; canUp: boolean; canDown: boolean; onRename: (title: string) => void; onShift: (step: -1 | 1) => void; onRemove: () => void }) {
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
