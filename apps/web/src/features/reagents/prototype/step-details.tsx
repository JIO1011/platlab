// Prototipo R-01D: solo interfaz
import { Field, Input } from '@platlab/ui';
import type { RefObject } from 'react';
import { CostCenter } from './cost-center';
import type { BottlesForm } from './wizard-model';
import { WeightSection } from './weight-section';
import type { ReceiptWeight } from './weight';

/** Paso 3, «¿Algo más?»: todo opcional. Marca con sugerencias, lote, área y control por peso. */
export function StepDetails({
  form,
  onForm,
  brandSuggestions,
  areas,
  onAddArea,
  knownDensity,
  weight,
  brandRef,
}: {
  form: BottlesForm;
  onForm: (patch: Partial<BottlesForm>) => void;
  brandSuggestions: string[];
  areas: string[];
  onAddArea: (name: string) => void;
  knownDensity: string | null;
  weight: ReceiptWeight;
  brandRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="grid gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-ink">¿Algo más?</h3>
        <p className="text-sm text-ink-muted">Todo esto es opcional; sirve para encontrar y reportar mejor después.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Marca" optional>
          <Input ref={brandRef} autoComplete="off" className="max-sm:h-[44px]" value={form.brand} onChange={(event) => onForm({ brand: event.target.value })} />
        </Field>
        <Field label="Lote del fabricante" optional>
          <Input autoComplete="off" spellCheck={false} className="max-sm:h-[44px]" value={form.supplierLot} onChange={(event) => onForm({ supplierLot: event.target.value })} />
        </Field>
      </div>
      {brandSuggestions.length > 0 ? (
        <ul aria-label="Marcas ya usadas" className="-mt-3 flex flex-wrap gap-2">
          {brandSuggestions.map((brand) => (
            <li key={brand}>
              <button
                type="button"
                onClick={() => onForm({ brand })}
                className="inline-flex min-h-[44px] items-center rounded-full border border-line px-3.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-8"
              >
                {brand}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <CostCenter value={form.area} extras={areas} onChange={(area) => onForm({ area })} onAdd={onAddArea} />

      <WeightSection
        open={form.weightOpen}
        onToggle={() => onForm({ weightOpen: !form.weightOpen })}
        full={form.fullWeight}
        onFull={(fullWeight) => onForm({ fullWeight })}
        density={form.density}
        onDensity={(density) => onForm({ density })}
        knownDensity={knownDensity}
        result={weight}
      />
    </div>
  );
}
