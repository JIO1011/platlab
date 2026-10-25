import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDndContext,
  useDraggable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Activity, RequestSummary, ScheduleCheck } from '@platlab/contracts';
import { cn, toast } from '@platlab/ui';
import { createContext, useContext, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatDate } from '../../app/format';
import { useMediaQuery } from '../../app/use-media-query';
import { blockFace, blockTextClass } from './schedule-block';
import { useCareerTone } from './schedule-career-color';
import { blockText, toMinutes, type DayRange } from './schedule-grid';
import { blockingTexts, requestBlockText, startAtOffset } from './schedule-placement';

/**
 * Arrastrar en el Cronograma (ADR 0023, L-01c): una solicitud de «Por programar» o un bloque del mismo día se llevan a
 * un área y una hora de la tabla (dnd kit, como las filas de Formatos). Mientras se arrastra, la celda destino dice en
 * vivo si cabe (✔ / ✖ con el motivo) y si supera el aforo (⚠); soltar en un lugar válido lo guarda directamente, sin
 * ventana de confirmación (la pantalla marca el destino «Guardando» hasta que el servidor responde). Escape interrumpe y
 * el elemento vuelve a su sitio. Arrastrar es una comodidad del escritorio: «Programar…» y «Mover…» hacen lo mismo con
 * teclado y en el móvil, y con ellas se cambia el responsable.
 */

/** Lo que se arrastra: una fecha por programar o un bloque que se mueve ese mismo día. */
export type DragSource =
  | { kind: 'program'; request: RequestSummary; date: string; duration: number }
  | { kind: 'move'; activity: Activity; duration: number };

/** Dónde caería lo que se arrastra y qué dice `scheduleCheck` de ese lugar. */
export interface DragPreview {
  areaId: string;
  /** Inicio y fin, en minutos desde la medianoche. */
  start: number;
  end: number;
  check: ScheduleCheck;
  participants: number;
  capacity: number;
}

/** Los datos de una columna soltable: el rango del día que cubre. */
export interface ColumnData {
  range: DayRange;
}

interface DragState {
  source: DragSource;
  preview: DragPreview | null;
}

/** Lo que se está guardando tras soltar: el destino donde se marca «Guardando» hasta que el servidor responde. */
export interface SavingDrop {
  areaId: string;
  start: number;
  end: number;
}

const PreviewContext = createContext<DragState | null>(null);

/** Lo que se arrastra ahora y dónde caería; nulo si no hay arrastre. */
export function useDragPreview(): DragState | null {
  return useContext(PreviewContext);
}

/** Cómo se llama lo arrastrado, para el indicador junto al puntero: el mismo texto que tendrá su bloque. */
function sourceLabel(source: DragSource): string {
  return source.kind === 'move' ? blockText(source.activity) : requestBlockText(source.request);
}

/** La fecha o el código de lo arrastrado: lo que lo distingue de otros con el mismo texto. */
function sourceDetail(source: DragSource): string {
  return source.kind === 'move' ? source.activity.code : formatDate(source.date);
}

/** El horario que lleva lo arrastrado, para el indicador: el del bloque o el pedido. */
function sourceTimes(source: DragSource): string {
  const { startsAt, endsAt } = source.kind === 'move' ? source.activity : source.request;
  return startsAt && endsAt ? `${startsAt}–${endsAt}` : `${source.duration} min`;
}

/** La carrera de lo arrastrado, para dar al indicador el color de su bloque. */
const sourceGroup = (source: DragSource): string | null => (source.kind === 'move' ? source.activity.group : source.request.group);

/** El punto de la pantalla donde empezó el gesto, con ratón o con el dedo. */
function pointOf(event: Event | null): { x: number; y: number } | null {
  if (!event) return null;
  if ('touches' in event) {
    const touch = (event as TouchEvent).touches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  return 'clientY' in event ? { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY } : null;
}

const sourceOf = (data: { current?: Record<string, unknown> | undefined }): DragSource | undefined => data.current?.source as DragSource | undefined;

const announcements: Announcements = {
  onDragStart: ({ active }) => {
    const source = sourceOf(active.data);
    return source ? `Tomaste ${sourceLabel(source)}.` : undefined;
  },
  onDragOver: () => undefined,
  onDragEnd: () => 'Soltaste. Si el lugar era válido, se guarda.',
  onDragCancel: () => 'Se canceló: nada cambió.',
};

/** El indicador que sigue al puntero: qué se lleva y su horario. */
function Ghost() {
  const { active } = useDndContext();
  const toneOf = useCareerTone();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const source = active ? sourceOf(active.data) : undefined;
  return (
    <DragOverlay dropAnimation={reduceMotion ? null : { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
      {source ? (
        <div className={cn('w-fit max-w-64 cursor-grabbing px-3 py-1.5 shadow-overlay', blockFace, toneOf(sourceGroup(source)))}>
          <p className={cn('text-sm', blockTextClass)}>{sourceLabel(source)}</p>
          <p className="text-[13px] tabular-nums text-ink-muted">
            {sourceDetail(source)} · {sourceTimes(source)}
          </p>
        </div>
      ) : null}
    </DragOverlay>
  );
}

/**
 * Envuelve la tabla y «Por programar». `previewOf` dice, con los datos cargados, qué pasaría al soltar en esa área a esa hora;
 * `onDrop` recibe un lugar válido y lo guarda. Un lugar que no cabe se explica y no hace nada.
 */
export function ScheduleDnd({
  previewOf,
  onDrop,
  children,
}: {
  previewOf: (source: DragSource, areaId: string, start: number) => DragPreview | null;
  onDrop: (source: DragSource, preview: DragPreview) => void;
  children: ReactNode;
}) {
  // El ratón arranca a los 6 px (un clic no es un arrastre); el dedo, tras una pausa, para no quitarle el desplazamiento.
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }));
  const [state, setState] = useState<DragState | null>(null);
  // Dónde del elemento se agarró (px bajo su borde superior): el bloque no salta al puntero.
  const grab = useRef(0);

  const start = ({ active, activatorEvent }: DragStartEvent) => {
    const source = sourceOf(active.data);
    if (!source) return;
    const point = pointOf(activatorEvent);
    const top = active.rect.current.initial?.top;
    grab.current = source.kind === 'move' && point && top !== undefined ? Math.max(point.y - top, 0) : 0;
    setState({ source, preview: null });
  };

  const move = ({ active, over, delta, activatorEvent }: DragMoveEvent) => {
    const source = sourceOf(active.data);
    const point = pointOf(activatorEvent);
    const column = over?.data.current as ColumnData | undefined;
    let next: DragPreview | null = null;
    if (source && over && column && point) {
      const offset = point.y + delta.y - grab.current - over.rect.top;
      next = previewOf(source, String(over.id), startAtOffset({ offset, height: over.rect.height, range: column.range, duration: source.duration }));
    }
    setState((current) => {
      if (!current) return current;
      const same = current.preview?.areaId === next?.areaId && current.preview?.start === next?.start;
      return same ? current : { ...current, preview: next };
    });
  };

  const end = ({ active }: DragEndEvent) => {
    const source = sourceOf(active.data);
    const preview = state?.preview ?? null;
    setState(null);
    if (!source || !preview) return;
    if (preview.check.blocking.length > 0) {
      toast.error('Ahí no se puede programar', { description: blockingTexts(preview.check)[0] });
      return;
    }
    if (source.kind === 'move' && preview.areaId === source.activity.areaId && preview.start === toMinutes(source.activity.startsAt)) return;
    onDrop(source, preview);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      accessibility={{ announcements, screenReaderInstructions: { draggable: 'Arrastrar es opcional: usa «Programar…» o «Mover…» para hacerlo con el teclado.' } }}
      onDragStart={start}
      onDragMove={move}
      onDragEnd={end}
      onDragCancel={() => setState(null)}
    >
      <PreviewContext.Provider value={state}>{children}</PreviewContext.Provider>
      <Ghost />
    </DndContext>
  );
}

/** Lo que una pieza arrastrable necesita pintar: su ref, sus escuchas y si es la que se lleva. */
export function useSourceDrag(id: string, source: DragSource | null, disabled: boolean) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id, data: { source }, disabled: disabled || source === null });
  return { setNodeRef, listeners, isDragging };
}

/**
 * Un bloque de la tabla que el Administrador puede llevar a otra área u hora el mismo día (el clic sigue abriéndolo: el
 * arrastre empieza a los 6 px). Sin arrastre (otro rol o pantalla estrecha) es un contenedor simple. Mientras se lleva
 * queda atenuado en su sitio.
 */
export function DraggableBlock({ activity, enabled, style, children }: { activity: Activity; enabled: boolean; style: CSSProperties; children: ReactNode }) {
  const duration = toMinutes(activity.endsAt) - toMinutes(activity.startsAt);
  const { setNodeRef, listeners, isDragging } = useSourceDrag(`move:${activity.id}`, { kind: 'move', activity, duration }, !enabled);
  return (
    <div
      ref={setNodeRef}
      {...(enabled ? listeners : {})}
      className={cn('absolute inset-x-0.5 touch-manipulation', enabled && 'select-none', isDragging && 'opacity-40')}
      style={style}
    >
      {children}
    </div>
  );
}
