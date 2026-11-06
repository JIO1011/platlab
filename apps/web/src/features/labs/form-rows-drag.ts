import {
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DroppableContainer,
  type Modifier,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { FORM_MAX_PER_ROW } from '@platlab/contracts';
import { useEffect, useRef, useState } from 'react';
import { fieldsOf, newField, type DraftRow, type FieldType } from './form-draft';
import { addField, addSection, moveItem, placeInNewRow, placeInRow, removeField, shiftField, shiftSection, type Direction } from './form-edit';

/** El tipo de lo que se arrastra: un dato, o una fila o título de sección completos. */
export const kindOf = (item: { data: { current?: Record<string, unknown> | undefined } } | null | undefined) => item?.data.current?.type;

/** Soltar entre dos elementos de la hoja (o en sus extremos) saca el dato a una fila propia. */
const isGap = (container: DroppableContainer) => kindOf(container) === 'gap';

/**
 * Una fila o título solo se ordena entre filas. Un dato, con puntero: una franja entre filas gana si el puntero está sobre
 * ella; si no, el dato más cercano. Con el teclado no hay puntero y cuentan todos los datos y franjas.
 */
export const collide: CollisionDetection = (args) => {
  if (kindOf(args.active) === 'row') return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((container) => kindOf(container) === 'row') });
  const targets = args.droppableContainers.filter((container) => kindOf(container) !== 'row');
  if (!args.pointerCoordinates) return closestCenter({ ...args, droppableContainers: targets });
  const gap = pointerWithin({ ...args, droppableContainers: targets.filter(isGap) });
  return gap.length > 0 ? gap : closestCenter({ ...args, droppableContainers: targets.filter((container) => !isGap(container)) });
};

/** Una fila arrastrada sube y baja, sin irse de lado. */
export const verticalForRows: Modifier = ({ transform, active }) => (kindOf(active) === 'row' ? { ...transform, x: 0 } : transform);

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

export const instructions =
  'Para mover, pulsa Espacio en el asa, usa las flechas y vuelve a pulsar Espacio para soltar. Esc cancela. También puedes usar el botón Mover de cada dato, o Alt con las flechas en su etiqueta.';

/**
 * El estado y los manejadores de la Sección I en edición: arrastre, anuncios, mover, quitar y agregar. Tras cada cambio, el
 * foco vuelve a un control que sigue existiendo (`root` es la hoja donde se busca).
 */
export function useRowsEditor(rows: DraftRow[], onChange: (rows: DraftRow[]) => void) {
  const root = useRef<HTMLElement>(null);
  const focusAfter = useRef<string | null>(null);
  const [status, setStatus] = useState('');
  const fields = fieldsOf(rows);
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

  return { root, focusAfter, status, fields, sensors, announcements, apply, move, shiftRow, remove, dropped, add, addTitle, shiftTitle };
}
