import { cn } from '@platlab/ui';
import { MapPin, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Combobox, type ComboOption } from './combobox';
import { fieldLabel } from './filled';
import { childrenOf, levelOneParent, pathTo, recentFirst, type Place } from './places';

const LEVELS = 3;
const defaultPlaceholders = ['Laboratorio o bodega', 'Estante o armario', 'Nivel o repisa (opcional)'];
/** Nombre accesible de los niveles que siguen; el primero lo nombra el rótulo «Ubicación». */
const levelNames = ['Ubicación', 'Estante o armario', 'Nivel o repisa'];

/**
 * «Ubicación» por niveles (ADR 0015): tres campos siempre visibles, en fila en escritorio y apilados en
 * el móvil, cada uno con las hijas del anterior en el árbol de Core y su texto guía. El segundo se
 * habilita al elegir el primero y el tercero al elegir el segundo, con el foco puesto. El elegido
 * muestra su nombre y una × que lo quita junto con los niveles que cuelgan de él. Basta un nivel; el
 * tercero es opcional. Solo elige (ADR 0024): las ubicaciones se crean en Áreas, y si falta una el
 * campo lo dice.
 */
export function LocationPicker({
  places,
  recentIds,
  onChange,
  error,
  className,
  placeholders = defaultPlaceholders,
  initialId,
}: {
  places: Place[];
  recentIds: string[];
  /** La ubicación más profunda elegida; vacío mientras no hay ninguna. */
  onChange: (placeId: string) => void;
  error?: string | undefined;
  className?: string;
  /** Texto guía de los tres niveles; por omisión, el de un almacén de reactivos. */
  placeholders?: readonly string[];
  /** Ubicación con la que arranca, ya elegida con sus niveles (el alta desde un área). */
  initialId?: string | undefined;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const rootId = levelOneParent(places);
  const [chosen, setChosen] = useState<Array<{ id: string; name: string }>>(() => {
    const path = initialId ? pathTo(places, initialId) : [];
    return path.length <= LEVELS ? path.map(({ id: placeId, name }) => ({ id: placeId, name })) : [];
  });
  const [text, setText] = useState('');
  const [focusLevel, setFocusLevel] = useState<number | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  // El foco pasa al campo recién abierto cuando ya está en el documento.
  useEffect(() => {
    if (focusLevel === null) return;
    inputs.current[focusLevel]?.focus();
    setFocusLevel(null);
  }, [focusLevel, chosen]);

  const parentOf = (level: number): string | null => (level === 0 ? rootId : (chosen[level - 1]?.id ?? null));
  const here = childrenOf(places, parentOf(chosen.length));
  const options: ComboOption[] = (chosen.length === 0 ? recentFirst(here, recentIds) : here).map((place) => ({
    id: place.id,
    label: place.name,
    leading: <MapPin className="size-4 shrink-0 text-ink-muted" aria-hidden />,
  }));

  const pick = (level: number, place: { id: string; name: string }) => {
    const next = [...chosen.slice(0, level), place];
    setChosen(next);
    setText('');
    onChange(place.id);
    // Elegir abre el siguiente nivel; en el último, el foco se queda donde está.
    setFocusLevel(next.length < LEVELS ? next.length : null);
  };
  const clear = (level: number) => {
    setChosen(chosen.slice(0, level));
    setText('');
    onChange(chosen[level - 1]?.id ?? '');
    setFocusLevel(level);
  };

  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={`${id}-0`} className={fieldLabel}>
        Ubicación
        <span aria-hidden className="ml-0.5">
          *
        </span>
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        {Array.from({ length: LEVELS }, (_, level) => {
          const done = chosen[level];
          // Solo el nivel que sigue al último elegido se puede usar; los de más abajo esperan.
          const waiting = level > chosen.length;
          const common = {
            id: `${id}-${level}`,
            'aria-label': level === 0 ? undefined : levelNames[level],
            disabled: waiting || undefined,
            'aria-required': level === 0 ? (true as const) : undefined,
            'aria-invalid': level === 0 && error && chosen.length === 0 ? (true as const) : undefined,
            'aria-describedby': level === 0 && error ? errorId : undefined,
          };
          return (
            <div key={level} className="min-w-0">
              <div className="relative min-w-0">
                {done ? (
                  // El nombre elegido se lee entero: si no cabe, baja de línea en vez de cortarse.
                  <div
                    role="group"
                    aria-label={`Ubicación, nivel ${level + 1}: ${done.name}`}
                    className="flex min-h-11 items-stretch rounded-xl border border-action bg-action-soft text-sm font-medium text-action"
                  >
                    <span className="min-w-0 self-center break-words py-1 pl-3 pr-1">{done.name}</span>
                    <button
                      type="button"
                      aria-label={`Quitar «${done.name}»`}
                      title="Quitar"
                      onClick={() => clear(level)}
                      className="flex w-11 shrink-0 items-center justify-center rounded-r-xl text-action transition-colors duration-150 hover:bg-action/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <Combobox
                    value={waiting ? '' : text}
                    onChange={setText}
                    options={waiting ? [] : options}
                    onPick={(option) => pick(level, { id: option.id, name: option.label })}
                    openOnFocus
                    placeholder={placeholders[level] ?? ''}
                    menuClassName="min-w-56"
                    inputProps={common}
                    inputRef={{
                      get current() {
                        return inputs.current[level] ?? null;
                      },
                      set current(node) {
                        inputs.current[level] = node;
                      },
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-[13px] text-ink-muted">¿Falta un lugar? Pide al Administrador que lo cree en Áreas.</p>
    </div>
  );
}
