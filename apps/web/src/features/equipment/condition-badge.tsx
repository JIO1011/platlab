import type { AssetCondition } from '@platlab/contracts';
import { Badge } from '@platlab/ui';
import { conditionLabel, conditionTone } from './asset-text';

/** La condición del equipo como insignia: el color cuenta el estado y el texto lo dice (ADR 0010). */
export function ConditionBadge({ condition, className }: { condition: AssetCondition; className?: string }) {
  return (
    <Badge tone={conditionTone[condition]} className={className}>
      {conditionLabel[condition]}
    </Badge>
  );
}
