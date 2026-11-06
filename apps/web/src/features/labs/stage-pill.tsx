import type { ActivityStage } from '@platlab/contracts';
import { stageLabels, stageMarks, stageTones } from './practice-stage';
import { Pill } from './request-status';

/** La etapa de un bloque en su pastilla (L-01e): su ícono y su texto, igual en la solicitud y en «Reservas»; «Programada» lleva el punto de siempre. */
export function StagePill({ stage }: { stage: ActivityStage }) {
  const Mark = stage === 'scheduled' ? null : stageMarks[stage];
  return (
    <Pill tone={stageTones[stage]} icon={Mark ? <Mark aria-hidden className="size-3.5" /> : undefined}>
      {stageLabels[stage]}
    </Pill>
  );
}
