import { entryList, type ListEntry } from '@platlab/contracts';
import { Button, Input, Select, cn, sectionLabel, sheetToasterId, toast } from '@platlab/ui';
import { Plus, Trash2, type LucideIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { commandErrorMessage, useArchiveEntry, useCommand } from './commands';
import { pillStyles } from './pills';

const listEntry = entryList.shape.items.element;

interface ChoiceFieldProps {
  workspaceId: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  options: ListEntry[];
  loading: boolean;
  value: string;
  onChange: (value: string) => void;
  /** El Administrador amplía y poda la lista desde la misma hoja (ADR 0012): «Agregar» y la papelera de cada etiqueta. */
  canAdd: boolean;
  /** Ruta y cuerpo del alta: `/reasons` con su tipo, `/destinations` o `/areas`. */
  addPath: '/reasons' | '/destinations' | '/areas';
  addBody: (name: string) => Record<string, string>;
  addLabel: string;
  /** Estilo del rótulo; por defecto, el de sección de las ventanas. */
  labelClassName?: string;
  /** Icono que acompaña a cada etiqueta (el destino lleva un pin). */
  icon?: LucideIcon;
  /**
   * `select` muestra la lista en un desplegable, con una papelera al lado que quita la elegida (el área
   * del ingreso); por omisión, botones de opción.
   */
  display?: 'pills' | 'select';
  /** Con `select`, el texto de la opción que deja el campo vacío (el campo es opcional). */
  noneLabel?: string;
  /** Con `select`, el aspecto del disparador. */
  selectClassName?: string;
}

/** Valor interno de la opción «sin elegir» del desplegable: un desplegable no admite el valor vacío. */
const NONE = '__none__';

/**
 * Motivo, destino o área elegido de la lista del laboratorio, como botones de opción (ADR 0012, lección
 * de ReactiLab). La operación guarda el texto elegido. Si la lista está vacía y la persona no
 * puede ampliarla, se escribe a mano: el motivo sigue siendo obligatorio.
 */
export function ChoiceField({
  workspaceId,
  label,
  hint,
  error,
  options,
  loading,
  value,
  onChange,
  canAdd,
  addPath,
  addBody,
  addLabel,
  labelClassName = sectionLabel,
  icon: Icon,
  display = 'pills',
  noneLabel,
  selectClassName,
}: ChoiceFieldProps) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const command = useCommand(workspaceId, addPath, listEntry);
  const archive = useArchiveEntry(workspaceId, addPath);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  async function add() {
    const name = draft.trim();
    if (!name) return;
    setAddError(null);
    try {
      const entry = await command.mutateAsync(addBody(name));
      onChange(entry.name);
      setDraft('');
      setAdding(false);
    } catch (failure) {
      setAddError(commandErrorMessage(failure));
    }
  }

  /** Archiva la etiqueta (clave nueva por clic) y avisa con «Deshacer», que la vuelve a agregar por nombre. */
  async function remove(option: ListEntry) {
    setAddError(null);
    setRemovingId(option.id);
    try {
      await archive.mutateAsync(option.id);
      const wasChosen = value === option.name;
      if (wasChosen) onChange('');
      toast.success(`Se quitó «${option.name}»`, {
        duration: 8000,
        toasterId: sheetToasterId,
        action: {
          label: 'Deshacer',
          onClick: () => {
            command
              .mutateAsync(addBody(option.name))
              .then(() => {
                if (wasChosen) onChange(option.name);
              })
              .catch((failure: unknown) => toast.error(commandErrorMessage(failure), { toasterId: sheetToasterId }));
          },
        },
      });
    } catch (failure) {
      setAddError(commandErrorMessage(failure));
    } finally {
      setRemovingId(null);
    }
  }

  const freeText = !loading && options.length === 0 && !canAdd;
  const selected = options.find((option) => option.name === value);

  return (
    <fieldset className="grid content-start gap-2" aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      {/* La leyenda va primero para nombrar el grupo; se ve la misma etiqueta junto a «Agregar». */}
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center justify-between gap-3">
        <span className={labelClassName} aria-hidden>
          {label}
        </span>
        {canAdd && !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="-mr-1.5 inline-flex h-7 items-center gap-1 rounded-[8px] px-1.5 text-[13px] font-semibold text-action transition-colors hover:bg-action-soft"
          >
            <Plus className="size-3.5" aria-hidden />
            Agregar
          </button>
        ) : null}
      </div>
      {freeText ? (
        <Input
          aria-label={label}
          autoComplete="off"
          value={value}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : display === 'select' ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select
              standalone
              aria-label={label}
              value={value || undefined}
              onValueChange={(next) => onChange(next === NONE ? '' : next)}
              options={[
                ...(noneLabel ? [{ value: NONE, label: noneLabel }] : []),
                ...options.map((option) => ({ value: option.name, label: option.name })),
              ]}
              placeholder={loading ? 'Cargando…' : options.length === 0 ? 'Sin opciones: agrega una' : 'Elige una opción'}
              {...(selectClassName ? { triggerClassName: selectClassName } : {})}
            />
          </div>
          {canAdd ? (
            <button
              type="button"
              aria-label={selected ? `Quitar «${selected.name}»` : 'Quitar la elegida'}
              title={selected ? 'Quitar de la lista' : 'Elige una para quitarla de la lista'}
              disabled={!selected || removingId !== null}
              onClick={() => selected && void remove(selected)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-subtle transition-colors hover:border-danger/40 hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {loading ? <span className="text-[13px] text-ink-muted">Cargando…</span> : null}
          {options.map((option) => (
            <div
              key={option.id}
              className={pillStyles(value === option.name)}
            >
              <label className={cn('inline-flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 pl-4', canAdd ? 'pr-1' : 'pr-4')}>
                <input
                  type="radio"
                  name={id}
                  className="sr-only"
                  checked={value === option.name}
                  onChange={() => onChange(option.name)}
                />
                {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
                {option.name}
              </label>
              {canAdd ? (
                <button
                  type="button"
                  aria-label={`Quitar «${option.name}»`}
                  disabled={removingId !== null}
                  onClick={() => void remove(option)}
                  className="mr-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-ink-subtle/70 transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action disabled:pointer-events-none disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="flex gap-2">
          <Input
            aria-label={addLabel}
            placeholder={addLabel}
            autoComplete="off"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void add();
              }
              if (event.key === 'Escape') {
                event.stopPropagation();
                setAdding(false);
              }
            }}
          />
          <Button type="button" onClick={() => void add()} loading={command.isPending} disabled={!draft.trim()}>
            Guardar
          </Button>
        </div>
      ) : null}
      {addError ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {addError}
        </p>
      ) : null}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
