import { Button, Select } from '@platlab/ui';
import { Trash2 } from 'lucide-react';
import { MaterialThumb } from './material-thumb';
import { lineProblem, positionChoices, type DraftLine } from './loan-draft';
import { QuantityStepper } from './quantity-stepper';

/** Una línea del vale en el mostrador: la imagen, el material, de dónde sale (si hay más de una ubicación) y la cantidad. */
export function LoanTicketLine({
  line,
  lines,
  onStep,
  onQuantity,
  onPosition,
  onRemove,
}: {
  line: DraftLine;
  lines: readonly DraftLine[];
  onStep: (delta: 1 | -1) => void;
  onQuantity: (text: string) => void;
  onPosition: (positionId: string) => void;
  onRemove: () => void;
}) {
  const problem = lineProblem(line);
  const choices = positionChoices(lines, line);
  const place = line.positions.find((position) => position.positionId === line.positionId);
  return (
    <li className="grid gap-2 rounded-panel bg-surface p-3 shadow-raised">
      <div className="flex items-center gap-3">
        <MaterialThumb name={line.name} materialClass="reusable_counted" className="size-11 [&>svg]:size-5" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{line.name}</p>
          {choices.length <= 1 ? <p className="truncate text-[13px] text-ink-muted">{place ? place.locationPath.join(' › ') : ''}</p> : null}
        </div>
        <Button variant="ghost" className="size-11 shrink-0 p-0 sm:size-9" aria-label={`Quitar ${line.name} del vale`} onClick={onRemove}>
          <Trash2 aria-hidden />
        </Button>
      </div>
      {choices.length > 1 ? (
        <Select
          value={line.positionId}
          onValueChange={onPosition}
          placeholder="Elige la ubicación"
          options={choices.map((position) => ({ value: position.positionId, label: position.locationPath.join(' › '), detail: `${position.available} ${position.unit}` }))}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <QuantityStepper value={line.quantity} label={line.name} onChange={onQuantity} onStep={onStep} invalid={problem !== null} />
        {problem ? <p role="alert" className="text-[13px] text-danger">{problem}</p> : null}
      </div>
    </li>
  );
}
