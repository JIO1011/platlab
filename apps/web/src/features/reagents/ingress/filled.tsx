import { Input, Select, cn } from '@platlab/ui';
import type { ComponentProps, RefObject } from 'react';
import { fieldHeight } from '../../../app/filled';

/**
 * Cantidad con su unidad en un solo grupo: el campo y, unido a su derecha, el desplegable de unidad
 * (g, kg, mL, L). Con `onUnit` ausente la unidad es de un reactivo del catálogo: texto fijo.
 */
export function QuantityInput({
  unit,
  units,
  onUnit,
  inputRef,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'> & {
  unit: string;
  units: ReadonlyArray<string>;
  onUnit?: ((unit: string) => void) | undefined;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-xl border border-line bg-white/60 transition-[border-color,box-shadow] duration-150 hover:border-line-strong',
        'focus-within:border-action focus-within:ring-3 focus-within:ring-action/20 has-[[aria-invalid=true]]:border-danger',
        fieldHeight,
        className,
      )}
    >
      <Input
        ref={inputRef}
        inputMode="decimal"
        autoComplete="off"
        className="h-full min-w-0 flex-1 border-0 bg-transparent tabular-nums hover:border-0 focus-visible:ring-0 aria-[invalid=true]:ring-0"
        {...props}
      />
      {onUnit ? (
        <Select
          standalone
          aria-label="Unidad"
          value={unit}
          onValueChange={onUnit}
          options={units.map((entry) => ({ value: entry, label: entry }))}
          placeholder="Unidad"
          triggerClassName="h-full w-[4.75rem] shrink-0 rounded-none border-0 border-l border-line bg-white/50 px-3 font-medium text-ink hover:border-line-strong hover:bg-action-soft focus-visible:ring-0"
        />
      ) : (
        <span className="flex shrink-0 items-center border-l border-line px-3 text-sm font-medium text-ink-muted">{unit}</span>
      )}
    </div>
  );
}
