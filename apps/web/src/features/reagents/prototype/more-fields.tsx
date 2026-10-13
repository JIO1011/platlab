// Prototipo R-01D: solo interfaz
import { Field, Input } from '@platlab/ui';
import { CostCenter } from './cost-center';
import type { BottlesForm } from './wizard-model';

const label = 'text-[13px] font-semibold';

/** «Más datos» (opcional): marca con sugerencias, lote del fabricante y área o departamento. */
export function MoreFields({
  form,
  onForm,
  brandSuggestions,
  areas,
  onAddArea,
}: {
  form: BottlesForm;
  onForm: (patch: Partial<BottlesForm>) => void;
  brandSuggestions: string[];
  areas: string[];
  onAddArea: (name: string) => void;
}) {
  const input = 'max-sm:h-[44px] sm:h-9';
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Marca" optional labelClassName={label}>
          <Input autoComplete="off" className={input} value={form.brand} onChange={(event) => onForm({ brand: event.target.value })} />
        </Field>
        <Field label="Lote del fabricante" optional labelClassName={label}>
          <Input autoComplete="off" spellCheck={false} className={input} value={form.supplierLot} onChange={(event) => onForm({ supplierLot: event.target.value })} />
        </Field>
      </div>
      {brandSuggestions.length > 0 ? (
        <ul aria-label="Marcas ya usadas" className="-mt-1.5 flex flex-wrap gap-1.5">
          {brandSuggestions.map((brand) => (
            <li key={brand}>
              <button
                type="button"
                onClick={() => onForm({ brand })}
                className="inline-flex min-h-[44px] items-center rounded-full border border-line px-3 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-8"
              >
                {brand}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <CostCenter value={form.area} extras={areas} onChange={(area) => onForm({ area })} onAdd={onAddArea} />
    </div>
  );
}
