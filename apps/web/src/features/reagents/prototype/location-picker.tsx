// Prototipo R-01D: solo interfaz
import { Button, Field, Select } from '@platlab/ui';
import { MapPin } from 'lucide-react';
import { useMemo, useState, type RefObject } from 'react';
import { Combobox, type ComboOption } from './combobox';
import { fieldLabel, filled } from './filled';
import type { Place } from './wizard-model';

/**
 * «Ubicación»: se escribe y se elige por su ruta («Sede central › Almacén»); las últimas usadas van
 * primero. Quien administra el catálogo puede crear una nueva dentro de otra; en el prototipo solo se
 * añade a la lista local y se elige.
 */
export function LocationPicker({
  places,
  recentIds,
  text,
  onChange,
  canCreate,
  onCreate,
  error,
  inputRef,
}: {
  places: Place[];
  recentIds: string[];
  /** Lo que se ve en el campo. */
  text: string;
  /** `placeId` vacío mientras lo escrito no es una ubicación elegida. */
  onChange: (placeId: string, text: string) => void;
  canCreate: boolean;
  onCreate: (name: string, parentId: string) => void;
  error?: string | undefined;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [creating, setCreating] = useState<string | null>(null);
  const [parentId, setParentId] = useState('');
  const realPlaces = places.filter((place) => !place.local);
  const options = useMemo<ComboOption[]>(() => {
    const recent = recentIds.flatMap((id) => places.filter((place) => place.id === id));
    return [...recent, ...places.filter((place) => !recentIds.includes(place.id))].map((place) => ({
      id: place.id,
      label: place.route,
      leading: <MapPin className="size-4 shrink-0 text-ink-muted" aria-hidden />,
    }));
  }, [places, recentIds]);

  return (
    <div className="grid content-start gap-3">
      <Field label="Ubicación" required labelClassName={fieldLabel} error={error}>
        <Combobox
          inputRef={inputRef}
          value={text}
          onChange={(next) => onChange('', next)}
          options={options}
          onPick={(option) => onChange(option.id, option.label)}
          canCreate={canCreate}
          onCreate={() => {
            setParentId(realPlaces[0]?.id ?? '');
            setCreating(text.trim());
          }}
          placeholder="Estante, laboratorio, almacén…"
        />
      </Field>
      {creating !== null ? (
        <div className="grid gap-3">
          <Field label={`Crear «${creating}» dentro de`} labelClassName={fieldLabel}>
            <Select
              value={parentId || undefined}
              onValueChange={setParentId}
              options={realPlaces.map((place) => ({ value: place.id, label: place.route }))}
              placeholder="Elige la ubicación de arriba"
              triggerClassName={filled}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              className="max-sm:h-[44px]"
              disabled={!parentId}
              onClick={() => {
                onCreate(creating, parentId);
                setCreating(null);
              }}
            >
              Crear y elegir
            </Button>
            <Button variant="ghost" className="max-sm:h-[44px]" onClick={() => setCreating(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
