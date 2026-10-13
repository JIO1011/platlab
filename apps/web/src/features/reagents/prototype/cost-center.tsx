// Prototipo R-01D: solo interfaz
import { Button, Input } from '@platlab/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { RadioPills } from './radio-pills';
import { defaultAreas } from './wizard-model';



/**
 * Área o departamento: píldoras con las opciones de ejemplo y «Añadir» para escribir otra.
 * La nota de la derecha explica la regla real y solo existe en el prototipo.
 */
export function CostCenter({
  value,
  extras,
  onChange,
  onAdd,
}: {
  value: string;
  extras: string[];
  onChange: (value: string) => void;
  onAdd: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const options = [...defaultAreas, ...extras].map((name) => ({ value: name, label: name }));

  const save = () => {
    const name = draft.trim();
    if (!name) return;
    onAdd(name);
    onChange(name);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="grid gap-2">
      <RadioPills
        legend="Área o departamento"
        optional
        value={value}
        options={options}
        onChange={onChange}
        onClear={() => onChange('')}
        hint={
          <span className="inline-block rounded-[6px] border border-dashed border-line-strong px-2 py-0.5 text-[12px]">
            Prototipo: aparece solo si el espacio define áreas
          </span>
        }
        action={
          !adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-[6px] px-1.5 text-[13px] font-medium text-action transition-colors hover:bg-action-soft sm:min-h-7"
            >
              <Plus className="size-3.5" aria-hidden />
              Añadir
            </button>
          ) : null
        }
      />
      {adding ? (
        <div className="flex gap-2">
          <Input
            aria-label="Nueva área o departamento"
            placeholder="Nombre del área"
            autoComplete="off"
            autoFocus
            className="max-sm:h-[44px]"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                save();
              }
              if (event.key === 'Escape') {
                event.stopPropagation();
                setAdding(false);
              }
            }}
          />
          <Button type="button" className="max-sm:h-[44px]" onClick={save} disabled={!draft.trim()}>
            Guardar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
