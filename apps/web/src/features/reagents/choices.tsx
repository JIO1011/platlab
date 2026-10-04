import { entryList, type ListEntry } from '@platlab/contracts';
import { Button, Input, cn } from '@platlab/ui';
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { commandErrorMessage, useCommand } from './commands';

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
  /** El Administrador amplía la lista desde la misma hoja (ADR 0012). */
  canAdd: boolean;
  /** Ruta y cuerpo del alta: `/reasons` con su tipo, o `/destinations`. */
  addPath: '/reasons' | '/destinations';
  addBody: (name: string) => Record<string, string>;
  addLabel: string;
}

/**
 * Motivo o destino elegido de la lista del laboratorio, como botones de opción (ADR 0012, lección
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
}: ChoiceFieldProps) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const command = useCommand(workspaceId, addPath, listEntry);
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

  const freeText = !loading && options.length === 0 && !canAdd;

  return (
    <fieldset className="grid content-start gap-2" aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      {/* La leyenda va primero para nombrar el grupo; se ve la misma etiqueta junto a «Agregar». */}
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink" aria-hidden>
          {label}
        </span>
        {canAdd && !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[13px] font-medium text-action transition-colors hover:bg-action-soft"
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
      ) : (
        <div className="flex flex-wrap gap-2">
          {loading ? <span className="text-[13px] text-ink-muted">Cargando…</span> : null}
          {options.map((option) => (
            <label
              key={option.id}
              className={cn(
                'inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 text-sm font-medium transition-colors',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action',
                value === option.name
                  ? 'border-action/40 bg-action-soft text-action'
                  : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink',
              )}
            >
              <input
                type="radio"
                name={id}
                className="sr-only"
                checked={value === option.name}
                onChange={() => onChange(option.name)}
              />
              {option.name}
            </label>
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
