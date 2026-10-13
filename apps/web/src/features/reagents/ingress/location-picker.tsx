import { cn } from '@platlab/ui';
import { MapPin, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Combobox, type ComboOption } from './combobox';
import { fieldLabel } from './filled';
import { childrenOf, levelOneParent, recentFirst, type Place } from './model';

const LEVELS = 3;
const placeholders = ['Laboratorio, bodega…', 'Estante, armario…', 'Nivel, repisa… (opcional)'];

/**
 * «Ubicación» por niveles (ADR 0015): hasta tres campos en una fila (apilados en el móvil), cada uno
 * con las hijas del anterior en el árbol de Core. Al inicio solo existe el primero; elegir o crear una
 * abre el siguiente con el foco puesto. El elegido muestra su nombre y una × que lo quita junto con los
 * niveles que cuelgan de él. Con una sola raíz (la sede) se omite. Basta un nivel. Quien administra el
 * catálogo crea con el «+» del campo o con Enter; la ubicación se crea en el servidor al momento.
 */
export function LocationPicker({
  places,
  recentIds,
  onChange,
  canCreate,
  onCreate,
  error,
  className,
}: {
  places: Place[];
  recentIds: string[];
  /** La ubicación más profunda elegida; vacío mientras no hay ninguna. */
  onChange: (placeId: string) => void;
  canCreate: boolean;
  /** Crea una ubicación dentro de `parentId` y la devuelve; null si no se pudo (el error lo dice la hoja). */
  onCreate: (name: string, parentId: string | null) => Promise<Place | null>;
  error?: string | undefined;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const rootId = levelOneParent(places);
  const [chosen, setChosen] = useState<Array<{ id: string; name: string }>>([]);
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const [focusLevel, setFocusLevel] = useState<number | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const shown = Math.min(LEVELS, chosen.length + 1);

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
  const create = async (level: number, name: string) => {
    if (creating) return;
    setCreating(true);
    const place = await onCreate(name, parentOf(level));
    setCreating(false);
    if (place) pick(level, place);
  };

  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={`${id}-0`} className={fieldLabel}>
        Ubicación
        <span aria-hidden className="ml-0.5">
          *
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {Array.from({ length: shown }, (_, level) => {
          const done = chosen[level];
          const common = {
            id: `${id}-${level}`,
            'aria-label': level === 0 ? undefined : `Ubicación, nivel ${level + 1}`,
            'aria-required': level === 0 ? (true as const) : undefined,
            'aria-invalid': level === 0 && error && chosen.length === 0 ? (true as const) : undefined,
            'aria-describedby': level === 0 && error ? errorId : undefined,
            'aria-busy': creating && !done ? (true as const) : undefined,
          };
          return (
            <div key={level} className={cn('flex items-center gap-1.5', done ? 'max-w-full' : 'min-w-40 flex-1')}>
              {level > 0 ? (
                <span aria-hidden className="text-ink-subtle max-sm:hidden">
                  ›
                </span>
              ) : null}
              <div className={cn('relative min-w-0', done ? 'max-w-full' : 'flex-1')}>
                {done ? (
                  // El nombre elegido se lee entero: si no cabe, baja de línea en vez de cortarse.
                  <div
                    role="group"
                    aria-label={`Ubicación, nivel ${level + 1}: ${done.name}`}
                    className="flex min-h-[44px] max-w-full items-stretch rounded-control bg-surface-sunken text-sm font-medium text-ink sm:min-h-[36px]"
                  >
                    <span className="min-w-0 self-center break-words py-1 pl-3 pr-1">{done.name}</span>
                    <button
                      type="button"
                      aria-label={`Quitar «${done.name}»`}
                      title="Quitar"
                      onClick={() => clear(level)}
                      className="flex w-[44px] shrink-0 items-center justify-center rounded-r-control text-ink-muted transition-colors duration-150 hover:bg-action-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action sm:w-[36px]"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <Combobox
                    value={text}
                    onChange={setText}
                    options={options}
                    onPick={(option) => pick(level, { id: option.id, name: option.label })}
                    canCreate={canCreate}
                    inlineCreate
                    openOnFocus
                    readOnly={creating}
                    onCreate={(name) => void create(level, name)}
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
    </div>
  );
}
