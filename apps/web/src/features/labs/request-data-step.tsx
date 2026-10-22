import { FORM_ESSENTIAL_KEYS, activityType, type FormFreeField, type FormLayout, type FormSystemField, type RequestOptions, type Space } from '@platlab/contracts';
import { Button, Field, Select, Textarea, cn } from '@platlab/ui';
import { Plus, X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Combobox, type ComboOption } from '../../app/combobox';
import { filled, FilledInput } from '../../app/filled';
import { addDays, formatDate } from '../../app/format';
import { activityLabels, canAddDate, withDate, withoutDate, type RequestDraft, type RequestIssues } from './request-draft';

/** Lo que el paso Datos necesita para dibujar y cambiar la solicitud. */
export interface DataStepProps {
  draft: RequestDraft;
  layout: FormLayout;
  /** Las listas de asignaturas y carreras; mientras cargan, vacías (se puede escribir igual). */
  options: RequestOptions | undefined;
  /** Los espacios habilitados, para el área. */
  spaces: readonly Space[];
  issues: RequestIssues;
  /** Hoy en la zona del espacio, AAAA-MM-DD. */
  today: string;
  onChange: (patch: Partial<RequestDraft>) => void;
}

const essential: readonly string[] = FORM_ESSENTIAL_KEYS;
/** Filas de 1 a 3 datos; en el móvil, un dato por fila. */
const columns = ['sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3'] as const;
const NO_AREA = 'none';

/** Un dato que se llena con varios controles (las fechas, el horario): su rótulo, su ayuda y su error van en el grupo. */
function GroupField({ label, required, hint, error, children }: { label: string; required: boolean; hint?: string; error: string | undefined; children: ReactNode }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="grid grid-cols-1 content-start gap-1.5">
      <span id={labelId} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5">
            *
          </span>
        ) : null}
      </span>
      {children}
      {hint && !error ? <p className="text-[13px] text-ink-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Fechas sueltas, una o varias, con un mismo horario: nunca un rango. */
function DatesField({ label, props }: { label: string; props: DataStepProps }) {
  const { draft, issues, today, onChange } = props;
  const [picked, setPicked] = useState('');
  return (
    <GroupField label={label} required hint="Cada fecha va suelta, con el mismo horario para todas." error={issues.fields['dates']}>
      {draft.dates.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {draft.dates.map((date) => (
            <li key={date} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-action-soft pl-3 pr-1 text-sm tabular-nums text-ink sm:min-h-8">
              {formatDate(date)}
              <Button variant="ghost" size="icon" className="size-9 rounded-full sm:size-7" aria-label={`Quitar ${formatDate(date)}`} onClick={() => onChange({ dates: withoutDate(draft.dates, date) })}>
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <FilledInput type="date" aria-label="Fecha por agregar" min={addDays(today, 1)} className="min-w-0 flex-1" value={picked} onChange={(event) => setPicked(event.target.value)} />
        <Button
          className="h-11"
          disabled={picked === '' || !canAddDate(draft.dates)}
          onClick={() => {
            onChange({ dates: withDate(draft.dates, picked) });
            setPicked('');
          }}
        >
          <Plus aria-hidden />
          Agregar
        </Button>
      </div>
    </GroupField>
  );
}

function TimesField({ label, props }: { label: string; props: DataStepProps }) {
  const { draft, issues, onChange } = props;
  return (
    <GroupField label={label} required error={issues.fields['endsAt'] ?? issues.fields['startsAt']}>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[13px] text-ink-muted">
          Inicio
          <FilledInput type="time" value={draft.startsAt} onChange={(event) => onChange({ startsAt: event.target.value })} />
        </label>
        <label className="grid gap-1 text-[13px] text-ink-muted">
          Fin
          <FilledInput type="time" value={draft.endsAt} onChange={(event) => onChange({ endsAt: event.target.value })} />
        </label>
      </div>
    </GroupField>
  );
}

const names = (list: readonly string[]): ComboOption[] => list.map((name) => ({ id: name, label: name }));

/** Asignatura o carrera: se elige de la lista del laboratorio o se escribe una nueva, que entra a la lista al usarla. */
function ListedField({ label, value, list, maxLength, error, onChange, required }: {
  label: string;
  value: string;
  list: readonly string[];
  maxLength: number;
  error: string | undefined;
  onChange: (text: string) => void;
  required: boolean;
}) {
  return (
    <Field label={label} required={required} optional={!required} error={error} hint="Si no está en la lista, escríbela: se agrega al guardar.">
      <Combobox value={value} onChange={onChange} options={names(list)} onPick={(option) => onChange(option.label)} canCreate onCreate={onChange} openOnFocus inputProps={{ maxLength }} />
    </Field>
  );
}

/** Un dato del sistema, con el control que le toca y la etiqueta con que lo presenta la revisión. */
function SystemField({ field, props }: { field: FormSystemField; props: DataStepProps }) {
  const { draft, options, issues, onChange } = props;
  const required = essential.includes(field.key);
  const base = { label: field.label, required, optional: !required };
  switch (field.key) {
    case 'titulo':
      return (
        <Field {...base} error={issues.fields['title']}>
          <FilledInput maxLength={200} autoComplete="off" value={draft.title} onChange={(event) => onChange({ title: event.target.value })} />
        </Field>
      );
    case 'docente':
      return (
        <Field {...base} error={issues.fields['teacherName']}>
          <FilledInput maxLength={120} autoComplete="off" value={draft.teacherName} onChange={(event) => onChange({ teacherName: event.target.value })} />
        </Field>
      );
    case 'tipo':
      return (
        <Field {...base} error={issues.fields['activityType']}>
          <Select
            value={draft.activityType ?? undefined}
            onValueChange={(value) => onChange({ activityType: activityType.parse(value) })}
            placeholder="Elige el tipo"
            triggerClassName={filled}
            options={activityType.options.map((value) => ({ value, label: activityLabels[value] }))}
          />
        </Field>
      );
    case 'asignatura':
      return <ListedField label={field.label} required={required} value={draft.subject} list={options?.subjects ?? []} maxLength={120} error={issues.fields['subject']} onChange={(subject) => onChange({ subject })} />;
    case 'carrera':
      return <ListedField label={field.label} required={required} value={draft.career} list={options?.careers ?? []} maxLength={120} error={issues.fields['career']} onChange={(career) => onChange({ career })} />;
    case 'fecha':
      return <DatesField label={field.label} props={props} />;
    case 'horario':
      return <TimesField label={field.label} props={props} />;
    case 'participantes':
      return (
        <Field {...base} error={issues.fields['participants']}>
          <FilledInput type="number" inputMode="numeric" min={1} max={1000} step={1} value={draft.participants} onChange={(event) => onChange({ participants: event.target.value })} />
        </Field>
      );
    case 'grupos':
      return (
        <Field {...base} error={issues.fields['groups']}>
          <FilledInput type="number" inputMode="numeric" min={1} max={100} step={1} value={draft.groups} onChange={(event) => onChange({ groups: event.target.value })} />
        </Field>
      );
  }
}

/** Un dato libre según su tipo y si es obligatorio; su respuesta se guarda por su clave. */
function FreeField({ field, props }: { field: FormFreeField; props: DataStepProps }) {
  const { draft, onChange } = props;
  const value = draft.answers[field.key] ?? '';
  const set = (text: string) => onChange({ answers: { ...draft.answers, [field.key]: text } });
  const base = { label: field.label, required: field.required, optional: !field.required };
  if (field.type === 'list' || field.type === 'boolean') {
    const choices = field.type === 'list' ? field.options.map((option) => ({ value: option, label: option })) : [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }];
    return (
      <Field {...base}>
        <Select value={value || undefined} onValueChange={set} placeholder="Elige una opción" triggerClassName={filled} options={choices} />
      </Field>
    );
  }
  return (
    <Field {...base}>
      <FilledInput
        type={field.type}
        maxLength={field.type === 'text' ? 500 : undefined}
        step={field.type === 'number' ? 'any' : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => set(event.target.value)}
      />
    </Field>
  );
}

/**
 * Paso «Datos»: los datos de la actividad en el orden y con las etiquetas de la revisión (filas de 1 a 3 y títulos de
 * sección), cada uno con el control que le toca; después el área, opcional, y Observaciones si la revisión las tiene.
 */
export function DataStep(props: DataStepProps) {
  const { draft, layout, spaces, issues, onChange } = props;
  const areas = spaces.filter((space) => space.archivedAt === null && !space.areaArchived);
  return (
    <div className="grid gap-5 rounded-card bg-surface px-4 py-5 shadow-raised sm:px-5">
      {layout.rows.map((row, at) =>
        row.kind === 'section' ? (
          <h2 key={`section-${at}`} className="text-lg font-semibold text-ink">
            {row.title}
          </h2>
        ) : (
          <div key={`row-${at}`} className={cn('grid grid-cols-1 gap-4', columns[row.fields.length - 1])}>
            {row.fields.map((field) => ('type' in field ? <FreeField key={field.key} field={field} props={props} /> : <SystemField key={field.key} field={field} props={props} />))}
          </div>
        ),
      )}
      <Field label="Área" optional error={issues.fields['areaId']} hint="Dónde se hará la actividad, entre las áreas habilitadas para prácticas.">
        <Select
          value={draft.areaId ?? NO_AREA}
          onValueChange={(value) => onChange({ areaId: value === NO_AREA ? null : value })}
          placeholder="Sin área"
          triggerClassName={filled}
          options={[{ value: NO_AREA, label: 'Sin área' }, ...areas.map((space) => ({ value: space.areaId, label: space.areaName, ...(space.groupName ? { detail: space.groupName } : {}) }))]}
        />
      </Field>
      {layout.notes ? (
        <Field label="Observaciones" optional error={issues.fields['notes']} hint="Un equipo o material especial que no está en las listas va aquí.">
          <Textarea className={cn(filled, 'h-auto min-h-24 py-2')} maxLength={2000} value={draft.notes} onChange={(event) => onChange({ notes: event.target.value })} />
        </Field>
      ) : null}
    </div>
  );
}
