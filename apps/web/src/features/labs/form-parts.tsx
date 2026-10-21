import type { FormField } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { CalendarDays, Hash, ListChecks, Lock, ToggleLeft, Type, type LucideIcon } from 'lucide-react';
import { useId, type KeyboardEventHandler, type ReactNode } from 'react';
import { optionsOf, typeLabels, type DraftField } from './form-draft';

/** El ícono de cada tipo de campo: el mismo en la elección al agregar, en los ajustes y en la hoja. */
export const typeIcons: Record<FormField['type'], LucideIcon> = {
  text: Type,
  number: Hash,
  date: CalendarDays,
  list: ListChecks,
  boolean: ToggleLeft,
};

export const fieldTypes = Object.keys(typeLabels) as Array<FormField['type']>;

/** Las filas de la hoja son tablas de rejilla: el color de fondo asoma como línea fina entre las celdas (`gap-px`). */
export const sheetGrid = 'grid gap-px bg-line-strong';

/**
 * La rejilla de la Sección I: dos datos por fila (etiqueta, valor, etiqueta, valor); en el móvil, uno por fila. Cada dato
 * es una subrejilla que ocupa su mitad (`half`) o la fila entera (`full`, solo el título de la práctica), para que las etiquetas queden alineadas.
 */
export const dataGrid = cn(
  sheetGrid,
  'grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.5fr)]',
);

type Span = 'half' | 'full';

/** La subrejilla de un dato; `gap-y-px` separa el aviso que a veces lleva debajo. */
export const datumRoot = (span: Span) => cn('grid grid-cols-subgrid gap-y-px', span === 'full' ? 'col-span-2 sm:col-span-4' : 'col-span-2');

/** La celda del valor de un dato a lo ancho ocupa lo que la etiqueta no. */
const datumValue = (span: Span) => (span === 'full' ? 'sm:col-span-3' : undefined);

export const cellKinds = {
  /** La etiqueta de un dato: fondo gris suave, mayúsculas y negrita como en la plantilla. */
  label: 'bg-surface-sunken text-[11px] font-semibold uppercase tracking-wide text-ink',
  /** El valor: en blanco, a llenar. */
  value: 'bg-white text-ink',
  /** Un encabezado de la hoja (barra de sección, tabla de recursos): el color suave del módulo con su tono profundo. */
  head: 'bg-action-soft text-[11px] font-bold uppercase tracking-wide text-action-deep',
} as const;

/**
 * Una fila compacta de la hoja: en pantalla, 24 px; en papel, 4,5 mm a 8 pt, de una sola línea (lo que no cabe se recorta,
 * porque la hoja cuenta con ese alto para que todo entre en una A4).
 */
export const denseCell = 'min-h-6 px-1.5 py-0.5 print:h-[4.5mm] print:min-h-0 print:overflow-hidden print:whitespace-nowrap print:px-1 print:py-0 print:text-[8pt] print:leading-[4.5mm]';

/** Una celda de la hoja; `dense` la deja del alto de una fila de la plantilla. */
export function Cell({ kind = 'value', dense = false, className, children }: { kind?: keyof typeof cellKinds; dense?: boolean; className?: string | undefined; children?: ReactNode }) {
  return <div className={cn('min-w-0 break-words px-2 py-1 leading-snug', cellKinds[kind], dense && denseCell, className)}>{children}</div>;
}

/**
 * Texto fantasma. Un ejemplo de lo que llenará el sistema o el docente deja su hueco en blanco al imprimir; una nota de
 * ayuda (`note`) se quita del papel, porque ahí no hay espacio para ella.
 */
export function Ghost({ note = false, className, children }: { note?: boolean; className?: string; children?: ReactNode }) {
  return <span className={cn('text-ink-subtle', note ? 'print:hidden' : 'print:invisible', className)}>{children}</span>;
}

/** Un dato del sistema: etiqueta con candado (solo al editar; en papel no va) y su valor de ejemplo. */
export function SystemDatum({ span = 'half', editable, label, example }: { span?: Span; editable: boolean; label: string; example: string }) {
  return (
    <Datum
      span={span}
      label={
        <span className="flex items-center gap-1">
          {editable ? <Lock className="size-3 shrink-0 text-ink-subtle print:hidden" aria-hidden /> : null}
          {label}
        </span>
      }
      value={<Ghost>{example}</Ghost>}
    />
  );
}

/** Un dato de la Sección I: etiqueta | valor. */
export function Datum({
  span = 'half',
  label,
  value,
  labelClassName,
}: {
  span?: Span;
  label: ReactNode;
  value: ReactNode;
  labelClassName?: string | undefined;
}) {
  return (
    <div className={datumRoot(span)}>
      <Cell kind="label" dense className={labelClassName}>
        {label}
      </Cell>
      <Cell dense className={datumValue(span)}>
        {value}
      </Cell>
    </div>
  );
}

/**
 * Texto que se edita en la hoja misma: se ve como la etiqueta o el título y se renombra con un clic. La línea punteada
 * avisa de que se puede cambiar; `label` es su nombre accesible, porque el texto visible es el valor.
 */
export function EditableText({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  error,
  focusKey,
  onKeyDown,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  error?: string | undefined;
  focusKey?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  className?: string;
}) {
  const errorId = useId();
  return (
    <>
      <input
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-focus={focusKey}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          'block min-h-11 w-full rounded-[4px] border-b border-dashed border-ink-subtle bg-transparent px-1.5 py-1 font-[inherit] text-inherit placeholder:font-normal placeholder:text-ink-subtle sm:min-h-8',
          'transition-colors hover:bg-action-soft focus-visible:bg-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action',
          className,
        )}
      />
      {error ? (
        <p id={errorId} role="alert" className="px-1.5 pt-0.5 text-[11.5px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

/** Lo que el solicitante llenará en un dato extra, dicho con su ícono: el tipo, si es una lista sus opciones, y si es obligatorio. */
export function FieldSummary({ field, className }: { field: DraftField; className?: string }) {
  const Icon = typeIcons[field.type];
  const options = field.type === 'list' ? optionsOf(field.options).join(', ') : '';
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5 text-ink-subtle print:invisible', className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">
        {typeLabels[field.type]}
        {field.type === 'list' ? `: ${options || 'sin opciones'}` : ''}
        {' · '}
        {field.required ? 'Obligatorio' : 'Opcional'}
      </span>
    </span>
  );
}
