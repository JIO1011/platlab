import { cn } from '@platlab/ui';
import { CalendarDays, Hash, ListChecks, ToggleLeft, Type, type LucideIcon } from 'lucide-react';
import { useId, type KeyboardEventHandler, type ReactNode } from 'react';
import { optionsOf, typeLabels, type DraftFreeField, type FieldType } from './form-draft';

/** El ícono de cada tipo de dato: el mismo en la elección al agregar, en los ajustes y en la hoja. */
export const typeIcons: Record<FieldType, LucideIcon> = {
  text: Type,
  number: Hash,
  date: CalendarDays,
  list: ListChecks,
  boolean: ToggleLeft,
};

export const fieldTypes = Object.keys(typeLabels) as FieldType[];

/** Las filas de la hoja son tablas de rejilla: el color de fondo asoma como línea fina entre las celdas (`gap-px`). */
export const sheetGrid = 'grid gap-px bg-line-strong';

/**
 * Las columnas de una fila de la Sección I según sus datos (1 a 3): cada dato es etiqueta y valor; con 2, la etiqueta
 * es algo más ancha y, con 3, el valor, que lleva sus controles. En el móvil, un dato por fila. Cada dato es una
 * subrejilla de dos columnas (`datumRoot`), para que las etiquetas de una fila queden alineadas con sus valores.
 */
const rowColumns = [
  'sm:grid-cols-[minmax(0,1fr)_minmax(0,4fr)]',
  'sm:grid-cols-[repeat(2,minmax(0,1.25fr)_minmax(0,1fr))]',
  'sm:grid-cols-[repeat(3,minmax(0,1fr)_minmax(0,1.25fr))]',
] as const;

export const dataRowGrid = (count: number) => cn(sheetGrid, 'grid-cols-[minmax(0,2fr)_minmax(0,3fr)]', rowColumns[Math.min(Math.max(count, 1), 3) - 1]);

/** La subrejilla de un dato; `gap-y-px` separa el aviso que a veces lleva debajo. */
export const datumRoot = 'col-span-2 grid grid-cols-subgrid gap-y-px';

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

/** La etiqueta de un dato, en cambio, no se recorta al imprimir: envuelve y la fila crece (4,5 mm como mínimo). */
const denseLabelCell = 'min-h-6 px-1.5 py-0.5 print:h-auto print:min-h-[4.5mm] print:px-1 print:py-0 print:text-[8pt] print:leading-[4.5mm]';

/** Una celda de la hoja; `dense` la deja del alto de una fila de la plantilla. */
export function Cell({ kind = 'value', dense = false, className, children }: { kind?: keyof typeof cellKinds; dense?: boolean; className?: string | undefined; children?: ReactNode }) {
  return <div className={cn('min-w-0 break-words px-2 py-1 leading-snug', cellKinds[kind], dense && (kind === 'label' ? denseLabelCell : denseCell), className)}>{children}</div>;
}

/**
 * Texto fantasma. Un ejemplo de lo que llenará el sistema o el docente deja su hueco en blanco al imprimir; una nota de
 * ayuda (`note`) se quita del papel, porque ahí no hay espacio para ella.
 */
export function Ghost({ note = false, className, children }: { note?: boolean; className?: string; children?: ReactNode }) {
  return <span className={cn('text-ink-subtle', note ? 'print:hidden' : 'print:invisible', className)}>{children}</span>;
}

/** Un dato de la Sección I: etiqueta | valor. */
export function Datum({ label, value, labelClassName }: { label: ReactNode; value: ReactNode; labelClassName?: string | undefined }) {
  return (
    <div className={datumRoot}>
      <Cell kind="label" dense className={labelClassName}>
        {label}
      </Cell>
      <Cell dense>{value}</Cell>
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
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  className?: string;
}) {
  const errorId = useId();
  return (
    <>
      <textarea
        rows={1}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-focus={focusKey}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value.replace(/[\r\n]+/g, ''))}
        onKeyDown={(event) => {
          // Es un campo de una línea que se ajusta al texto: Enter no abre otra.
          if (event.key === 'Enter') event.preventDefault();
          onKeyDown?.(event);
        }}
        className={cn(
          'block min-h-11 w-full resize-none overflow-hidden rounded-[4px] border-b border-dashed border-ink-subtle bg-transparent px-1.5 py-1 font-[inherit] leading-[inherit] text-inherit field-sizing-content placeholder:font-normal placeholder:text-ink-subtle sm:min-h-8',
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

/** Lo que el solicitante llenará en un dato libre, dicho con su ícono: el tipo, si es una lista sus opciones, y si es obligatorio. */
export function FieldSummary({ field, className }: { field: DraftFreeField; className?: string }) {
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
