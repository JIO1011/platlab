import { activityType, type RequestOptions } from '@platlab/contracts';
import { Select, cn } from '@platlab/ui';
import { Plus, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Combobox, type ComboOption } from '../../app/combobox';
import { addDays, formatDate } from '../../app/format';
import { optionsOf, type DraftField } from './form-draft';
import { activityLabels, canAddDate, fieldKey, withDate, withoutDate, type RequestDraft, type RequestIssues } from './request-draft';

/**
 * Lo que un control de la hoja necesita para leer y cambiar la solicitud: el borrador, las listas del laboratorio, lo que el
 * servidor rechazó y lo obligatorio que quedó vacío al intentar enviar (`missing`, por clave de dato).
 */
export interface FillState {
  draft: RequestDraft;
  options: RequestOptions | undefined;
  /** Hoy en la zona del espacio, AAAA-MM-DD. */
  today: string;
  issues: RequestIssues;
  missing: ReadonlySet<string>;
  onChange: (patch: Partial<RequestDraft>) => void;
}

/**
 * Un control de celda: sin borde ni fondo, del alto de la fila en escritorio y táctil (44 px) en el móvil. La celda activa
 * se resalta suave (al pasar y al enfocar) y una celda por completar se marca con `aria-invalid`.
 */
export const bare =
  'block h-auto min-h-11 w-full min-w-0 rounded-[3px] border-0 bg-transparent px-1.5 py-1 text-[12px] leading-snug text-ink shadow-none outline-none transition-colors placeholder:text-ink-subtle sm:min-h-6 sm:py-0.5 ' +
  'hover:bg-action-soft/70 focus-visible:bg-action-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action aria-[invalid=true]:bg-danger-soft';

/** El control ocupa toda la celda de la hoja: se come su relleno (`px-1.5 py-0.5`) para que el resalte llegue a los bordes. */
export function Frame({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('-mx-1.5 -my-0.5 flex min-w-0 items-center', className)}>{children}</div>;
}

/** El aviso bajo el control: lo que rechazó el servidor o «Falta completar». No se imprime. */
export function CellNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="pt-0.5 text-[11px] font-medium leading-tight text-danger print:hidden">
      {children}
    </p>
  );
}

/** El borde del campo del servidor que corresponde a cada dato del sistema. */
const issueKeys: Record<string, string[]> = {
  titulo: ['title'],
  docente: ['teacherName'],
  tipo: ['activityType'],
  asignatura: ['subject'],
  carrera: ['career'],
  fecha: ['dates'],
  horario: ['endsAt', 'startsAt'],
  participantes: ['participants'],
  grupos: ['groups'],
};

const selectTrigger = cn(bare, 'flex items-center justify-between gap-1 rounded-[3px] border-0 text-left');
const names = (list: readonly string[]): ComboOption[] => list.map((name) => ({ id: name, label: name }));
const digits = (text: string) => text.replace(/\D/g, '');

function TextCell({ label, value, maxLength, invalid, onChange, inputMode }: { label: string; value: string; maxLength: number; invalid: boolean; onChange: (text: string) => void; inputMode?: 'numeric' }) {
  return (
    <Frame>
      <input
        aria-label={label}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        maxLength={maxLength}
        {...(inputMode ? { inputMode } : {})}
        value={value}
        onChange={(event) => onChange(inputMode === 'numeric' ? digits(event.target.value) : event.target.value)}
        className={bare}
      />
    </Frame>
  );
}

function ChoiceCell({ label, value, choices, invalid, onChange }: { label: string; value: string; choices: { value: string; label: string }[]; invalid: boolean; onChange: (value: string) => void }) {
  return (
    <Frame>
      <Select standalone aria-label={label} value={value || undefined} onValueChange={onChange} placeholder="Elegir" options={choices} triggerClassName={cn(selectTrigger, invalid && 'bg-danger-soft')} />
    </Frame>
  );
}

function ListedCell({ label, value, list, invalid, onChange }: { label: string; value: string; list: readonly string[]; invalid: boolean; onChange: (text: string) => void }) {
  return (
    <Frame className="[&>div]:w-full">
      <Combobox
        value={value}
        onChange={onChange}
        options={names(list)}
        onPick={(option) => onChange(option.label)}
        canCreate
        onCreate={onChange}
        openOnFocus
        placeholder="Elige o escribe"
        className={bare}
        menuClassName="min-w-56"
        inputProps={{ maxLength: 120, 'aria-label': label, 'aria-invalid': invalid || undefined, title: 'Si no está en la lista, escríbela: se agrega al guardar.' }}
      />
    </Frame>
  );
}

/** Fechas sueltas, una o varias, con un mismo horario: nunca un rango. Cada una es un chip; «+» agrega la elegida. */
function DatesCell({ label, state, invalid }: { label: string; state: FillState; invalid: boolean }) {
  const { draft, today, onChange } = state;
  const [picked, setPicked] = useState('');
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      {draft.dates.map((date) => (
        <span key={date} className="inline-flex min-h-8 items-center gap-0.5 rounded-full bg-action-soft pl-2 pr-0.5 text-[11.5px] tabular-nums text-ink sm:min-h-5">
          {formatDate(date)}
          <button
            type="button"
            aria-label={`Quitar ${formatDate(date)}`}
            onClick={() => onChange({ dates: withoutDate(draft.dates, date) })}
            className="flex size-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-action sm:size-5"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <input
        type="date"
        aria-label="Fecha por agregar"
        aria-invalid={invalid || undefined}
        min={addDays(today, 1)}
        value={picked}
        onChange={(event) => setPicked(event.target.value)}
        className={cn(bare, 'w-auto min-w-0 flex-1 basis-28 border border-line bg-white sm:basis-24')}
      />
      <button
        type="button"
        aria-label="Agregar la fecha"
        disabled={picked === '' || !canAddDate(draft.dates)}
        onClick={() => {
          onChange({ dates: withDate(draft.dates, picked) });
          setPicked('');
        }}
        className="flex size-11 shrink-0 items-center justify-center rounded-[3px] bg-action-soft text-action transition-colors hover:bg-action hover:text-on-action focus-visible:outline-2 focus-visible:outline-action disabled:pointer-events-none disabled:opacity-40 sm:size-6"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Horario de inicio y fin: una hora por control, el mismo para todas las fechas. */
function TimesCell({ state, invalid }: { state: FillState; invalid: boolean }) {
  const { draft, onChange } = state;
  return (
    <Frame>
      <input type="time" aria-label="Hora de inicio" aria-invalid={invalid || undefined} value={draft.startsAt} onChange={(event) => onChange({ startsAt: event.target.value })} className={bare} />
      <span aria-hidden className="text-ink-subtle">
        –
      </span>
      <input type="time" aria-label="Hora de fin" aria-invalid={invalid || undefined} value={draft.endsAt} onChange={(event) => onChange({ endsAt: event.target.value })} className={bare} />
    </Frame>
  );
}

/** Un dato libre según su tipo; su respuesta se guarda por su clave. */
function FreeCell({ field, state, invalid }: { field: Extract<DraftField, { kind: 'free' }>; state: FillState; invalid: boolean }) {
  const { draft, onChange } = state;
  const key = fieldKey(field);
  const value = draft.answers[key] ?? '';
  const set = (text: string) => onChange({ answers: { ...draft.answers, [key]: text } });
  if (field.type === 'list' || field.type === 'boolean') {
    const choices =
      field.type === 'list'
        ? optionsOf(field.options).map((option) => ({ value: option, label: option }))
        : [
            { value: 'true', label: 'Sí' },
            { value: 'false', label: 'No' },
          ];
    return <ChoiceCell label={field.label} value={value} choices={choices} invalid={invalid} onChange={set} />;
  }
  return (
    <Frame>
      <input
        aria-label={field.label}
        aria-invalid={invalid || undefined}
        type={field.type}
        autoComplete="off"
        maxLength={field.type === 'text' ? 500 : undefined}
        step={field.type === 'number' ? 'any' : undefined}
        value={value}
        onChange={(event) => set(event.target.value)}
        className={cn(bare, field.type === 'number' && '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none')}
      />
    </Frame>
  );
}

/**
 * El valor de un dato de la Sección I al llenar la hoja: el control que le toca dentro de su celda, con su etiqueta
 * accesible (la visible está en la celda de al lado), el aviso del servidor y la marca de «falta» al intentar enviar.
 */
export function FillValue({ field, state }: { field: DraftField; state: FillState }) {
  const { draft, options, issues, missing, onChange } = state;
  const key = fieldKey(field);
  const serverNote = field.kind === 'system' ? issueKeys[field.key]?.map((name) => issues.fields[name]).find((note) => note !== undefined) : undefined;
  const absent = missing.has(key);
  const invalid = absent || serverNote !== undefined;
  const control = (() => {
    if (field.kind === 'free') return <FreeCell field={field} state={state} invalid={invalid} />;
    switch (field.key) {
      case 'titulo':
        return <TextCell label={field.label} value={draft.title} maxLength={200} invalid={invalid} onChange={(title) => onChange({ title })} />;
      case 'docente':
        return <TextCell label={field.label} value={draft.teacherName} maxLength={120} invalid={invalid} onChange={(teacherName) => onChange({ teacherName })} />;
      case 'tipo':
        return (
          <ChoiceCell
            label={field.label}
            value={draft.activityType ?? ''}
            choices={activityType.options.map((value) => ({ value, label: activityLabels[value] }))}
            invalid={invalid}
            onChange={(value) => onChange({ activityType: activityType.parse(value) })}
          />
        );
      case 'asignatura':
        return <ListedCell label={field.label} value={draft.subject} list={options?.subjects ?? []} invalid={invalid} onChange={(subject) => onChange({ subject })} />;
      case 'carrera':
        return <ListedCell label={field.label} value={draft.career} list={options?.careers ?? []} invalid={invalid} onChange={(career) => onChange({ career })} />;
      case 'fecha':
        return <DatesCell label={field.label} state={state} invalid={invalid} />;
      case 'horario':
        return <TimesCell state={state} invalid={invalid} />;
      case 'participantes':
        return <TextCell label={field.label} value={draft.participants} maxLength={4} inputMode="numeric" invalid={invalid} onChange={(participants) => onChange({ participants })} />;
      case 'grupos':
        return <TextCell label={field.label} value={draft.groups} maxLength={3} inputMode="numeric" invalid={invalid} onChange={(groups) => onChange({ groups })} />;
    }
  })();
  return (
    <>
      {control}
      <CellNote>{serverNote ?? (absent ? 'Falta completar.' : undefined)}</CellNote>
    </>
  );
}
