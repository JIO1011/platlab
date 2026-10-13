// Prototipo R-01D: solo interfaz
import { cn } from '@platlab/ui';
import { MapPin, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Combobox, type ComboOption } from './combobox';
import { FilledInput, fieldLabel } from './filled';
import { childrenOf, levelOneParent, type Place } from './wizard-model';

const LEVELS = 3;
const placeholders = ['Laboratorio, bodega…', 'Estante, armario…', 'Nivel, repisa…'];

/**
 * «Ubicación» por niveles: hasta tres campos en una fila (apilados en el móvil), cada uno con las
 * ubicaciones de ese nivel. Al inicio solo existe el primero; elegir o crear una abre el siguiente con
 * el foco puesto. El campo elegido muestra su nombre y una × que lo quita junto con los niveles que
 * cuelgan de él. Con una sola raíz (la sede) se omite. Basta un nivel; los demás son opcionales.
 * Quien administra el catálogo crea con el «+» del campo o con Enter; en el prototipo solo se añade
 * al estado local.
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
  /** Crea (simulado) una ubicación dentro de `parentId` y la devuelve. */
  onCreate: (name: string, parentId: string | null) => Place;
  error?: string | undefined;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const rootId = levelOneParent(places);
  const [chosen, setChosen] = useState<Array<{ id: string; name: string }>>([]);
  const [text, setText] = useState('');
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
  const optionsAt = (level: number): ComboOption[] => {
    const here = childrenOf(places, parentOf(level));
    const ordered = level === 0 ? [...recentIds.flatMap((recent) => here.filter((place) => place.id === recent)), ...here.filter((place) => !recentIds.includes(place.id))] : here;
    return ordered.map((place) => ({ id: place.id, label: place.name, leading: <MapPin className="size-4 shrink-0 text-ink-muted" aria-hidden /> }));
  };
  const options = optionsAt(chosen.length);

  const apply = (next: Array<{ id: string; name: string }>) => {
    setChosen(next);
    setText('');
    onChange(next.at(-1)?.id ?? '');
    // Elegir abre el siguiente nivel; en el último, el foco se queda donde está.
    setFocusLevel(next.length < LEVELS ? next.length : null);
  };
  const pick = (level: number, place: { id: string; name: string }) => apply([...chosen.slice(0, level), place]);
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5">
        {Array.from({ length: shown }, (_, level) => {
          const done = chosen[level];
          const common = {
            id: `${id}-${level}`,
            'aria-label': level === 0 ? undefined : `Ubicación, nivel ${level + 1}`,
            'aria-required': level === 0 ? (true as const) : undefined,
            'aria-invalid': level === 0 && error && chosen.length === 0 ? (true as const) : undefined,
            'aria-describedby': level === 0 && error ? errorId : undefined,
          };
          return (
            <div key={level} className="flex items-center gap-1.5 sm:min-w-0 sm:flex-1">
              {level > 0 ? (
                <span aria-hidden className="max-sm:hidden text-ink-subtle">
                  ›
                </span>
              ) : null}
              <div className="relative min-w-0 flex-1">
                {done ? (
                  <>
                    <FilledInput
                      {...common}
                      readOnly
                      tabIndex={-1}
                      value={done.name}
                      title={done.name}
                      className="truncate pr-11 font-medium text-ink read-only:text-ink sm:pr-10"
                      ref={(node) => {
                        inputs.current[level] = node;
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`Quitar «${done.name}»`}
                      title="Quitar"
                      onClick={() => clear(level)}
                      className="absolute inset-y-0 right-0 flex w-[44px] items-center justify-center rounded-r-control text-ink-muted transition-colors duration-150 hover:bg-action-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action sm:w-[36px]"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </>
                ) : (
                  <Combobox
                    value={text}
                    onChange={setText}
                    options={options}
                    onPick={(option) => pick(level, { id: option.id, name: option.label })}
                    canCreate={canCreate}
                    inlineCreate
                    openOnFocus
                    onCreate={(name) => {
                      const place = onCreate(name, parentOf(level));
                      pick(level, { id: place.id, name: place.name });
                    }}
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
