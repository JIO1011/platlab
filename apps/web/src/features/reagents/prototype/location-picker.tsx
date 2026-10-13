// Prototipo R-01D: solo interfaz
import { Button, Select, cn } from '@platlab/ui';
import { MapPin, Plus } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import { fold, type Place } from './wizard-model';

const MAX_RESULTS = 4;

/**
 * «Ubicación»: la ubicación se escribe y se elige por su ruta («Sede central › Almacén»).
 * Las últimas usadas van como fichas. Quien administra el catálogo puede crear una nueva dentro de
 * otra; en el prototipo solo se añade a la lista local y se elige.
 */
export function LocationPicker({
  places,
  recents,
  value,
  onChange,
  canCreate,
  onCreate,
  error,
  inputRef,
}: {
  places: Place[];
  recents: Place[];
  value: string;
  onChange: (id: string) => void;
  canCreate: boolean;
  onCreate: (name: string, parentId: string) => void;
  error?: string | undefined;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState<string | null>(null);
  const [parentId, setParentId] = useState('');
  const text = query.trim();
  const chosen = places.find((place) => place.id === value);
  const realPlaces = places.filter((place) => !place.local);

  const matches = useMemo(() => {
    const needle = fold(text);
    return places.filter((place) => !needle || fold(place.route).includes(needle)).slice(0, MAX_RESULTS);
  }, [places, text]);
  const offerNew = canCreate && text !== '' && !places.some((place) => fold(place.name) === fold(text));
  const total = matches.length + (offerNew ? 1 : 0);
  const activeIndex = Math.min(active, Math.max(total - 1, 0));

  const pick = (placeId: string) => {
    onChange(placeId);
    setQuery('');
  };
  const choose = (index: number) => {
    const place = matches[index];
    if (place) pick(place.id);
    else if (offerNew) {
      setParentId(realPlaces[0]?.id ?? '');
      setCreating(text);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (total > 0) setActive((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + total) % total);
    } else if (event.key === 'Enter' && total > 0 && (text !== '' || !chosen)) {
      // Con algo escrito (o sin elegir), Enter elige la opción activa y no avanza el paso.
      event.preventDefault();
      choose(activeIndex);
    }
  };

  const labelId = `${id}-label`;
  return (
    <div className="grid grid-cols-1 content-start gap-1.5">
      <span id={labelId} className="text-[13px] font-semibold text-ink">
        Ubicación
        <span aria-hidden className="ml-0.5">
          *
        </span>
      </span>

      {chosen ? (
        <div className="flex items-center gap-2 rounded-control border border-action/40 bg-action-soft py-1.5 pl-3 pr-1.5">
          <MapPin className="size-4 shrink-0 text-action" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">{chosen.name}</span>
            <span className="block truncate text-[13px] text-ink-muted">{chosen.route}</span>
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 max-sm:h-[44px]"
            onClick={() => {
              onChange('');
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            Cambiar
          </Button>
        </div>
      ) : (
        <>
          {recents.length > 0 && text === '' ? (
            <ul aria-label="Ubicaciones recientes" className="flex flex-wrap gap-2">
              {recents.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => pick(place.id)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors duration-150 hover:border-line-strong hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-8"
                  >
                    <MapPin className="size-3 text-ink-muted" aria-hidden />
                    {place.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {creating === null ? (
            <>
              <input
                ref={inputRef}
                role="combobox"
                aria-labelledby={labelId}
                aria-expanded
                aria-controls={`${id}-list`}
                aria-autocomplete="list"
                aria-activedescendant={total > 0 ? `${id}-${activeIndex}` : undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                autoComplete="off"
                spellCheck={false}
                placeholder="Estante, laboratorio, almacén…"
                className="h-[44px] w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-subtle hover:border-ink-subtle focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20 aria-[invalid=true]:border-danger sm:h-9"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
              />
              <ul id={`${id}-list`} role="listbox" aria-label="Ubicaciones" className="max-h-48 overflow-y-auto rounded-control border border-line bg-surface p-1">
                {matches.map((place, index) => (
                  <li
                    key={place.id}
                    id={`${id}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(index)}
                    className={cn('flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-1 text-[13px] sm:min-h-9', index === activeIndex && 'bg-action-soft')}
                  >
                    <MapPin className="size-4 shrink-0 text-ink-muted" aria-hidden />
                    <span className="min-w-0 break-words text-ink">{place.route}</span>
                  </li>
                ))}
                {offerNew ? (
                  <li
                    id={`${id}-${matches.length}`}
                    role="option"
                    aria-selected={matches.length === activeIndex}
                    onMouseMove={() => setActive(matches.length)}
                    onClick={() => choose(matches.length)}
                    className={cn('flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-1 text-[13px] sm:min-h-9 font-medium text-action', matches.length === activeIndex && 'bg-action-soft')}
                  >
                    <Plus className="size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 break-words">Crear «{text}» dentro de…</span>
                  </li>
                ) : null}
              </ul>
              {total === 0 ? <p className="px-1 text-sm text-ink-muted">Ninguna ubicación coincide con «{text}».</p> : null}
            </>
          ) : (
            <div className="grid gap-3 rounded-control bg-surface-sunken p-3">
              <p className="text-[13px] font-semibold text-ink">
                Crear «{creating}» dentro de
              </p>
              <Select
                value={parentId || undefined}
                onValueChange={setParentId}
                options={realPlaces.map((place) => ({ value: place.id, label: place.route }))}
                placeholder="Elige la ubicación de arriba"
                triggerClassName="max-sm:h-[44px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  className="max-sm:h-[44px]"
                  onClick={() => {
                    onCreate(creating, parentId);
                    setCreating(null);
                    setQuery('');
                  }}
                  disabled={!parentId}
                >
                  Crear y elegir
                </Button>
                <Button variant="ghost" className="max-sm:h-[44px]" onClick={() => setCreating(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
