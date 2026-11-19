import { Button, Input } from '@platlab/ui';
import { Minus, Plus } from 'lucide-react';

/** Cantidad con − y +: se toca para ajustar de uno en uno o se escribe cuando son muchas. */
export function QuantityStepper({
  value,
  label,
  onChange,
  onStep,
  invalid = false,
}: {
  value: string;
  label: string;
  onChange: (text: string) => void;
  onStep: (delta: 1 | -1) => void;
  invalid?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button variant="ghost" className="size-11 p-0 sm:size-9" aria-label={`Una menos de ${label}`} onClick={() => onStep(-1)}>
        <Minus aria-hidden />
      </Button>
      <Input
        inputMode="decimal"
        autoComplete="off"
        aria-label={`Cantidad de ${label}`}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-14 px-1 text-center tabular-nums sm:h-9"
      />
      <Button variant="ghost" className="size-11 p-0 sm:size-9" aria-label={`Una más de ${label}`} onClick={() => onStep(1)}>
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
