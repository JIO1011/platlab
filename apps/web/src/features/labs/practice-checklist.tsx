import { formatDecimal } from '@platlab/ui';
import { useState } from 'react';
import { isApiError } from '../../app/api';
import { labsErrorMessage, useVersionConflict } from './commands';
import { lineCodes } from './practice-assets';
import { useSaveChecklist } from './practice-commands';
import { toggleLine } from './practice-stage';
import type { RequestView } from './request-draft';

type Block = RequestView['blocks'][number];
type Line = RequestView['lines'][number];

/** Lo que el recurso pide o, en un equipo apartado, sus códigos: lo que quien prepara tiene a mano para marcarlo. */
function lineDetail(line: Line, block: Block, number: number): string {
  if (line.kind === 'equipment') return [`${line.quantity}`, lineCodes(block, number)].filter(Boolean).join(' · ');
  return line.kind === 'reagent' ? `${formatDecimal(line.quantity)} ${line.unit}`.trim() : formatDecimal(line.quantity);
}

/**
 * La lista de chequeo de un bloque (L-01e): una casilla por línea de la solicitud, mientras el bloque no empieza. Cada
 * casilla guarda al marcarse y cambia solo con lo que el servidor confirma; mientras guarda, las demás esperan para no
 * pisar la versión del bloque. No bloquea «Marcar lista».
 */
export function PracticeChecklist({ workspaceId, request, block }: { workspaceId: string; request: RequestView; block: Block }) {
  const save = useSaveChecklist(workspaceId, block.activityId);
  const conflict = useVersionConflict(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (number: number, checked: boolean) => {
    setError(null);
    try {
      await save.mutateAsync({ expectedVersion: block.version, lines: toggleLine(block.preparedLines, number, checked) });
    } catch (failure) {
      if (isApiError(failure, 'VERSION_CONFLICT')) void conflict('este bloque');
      else setError(labsErrorMessage(failure));
    }
  };

  if (request.lines.length === 0) return null;
  return (
    <fieldset className="grid min-w-0 gap-1" aria-busy={save.isPending}>
      <legend className="mb-1 text-sm font-semibold text-ink">Lista de chequeo</legend>
      <ul className="grid">
        {request.lines.map((line, at) => {
          const number = at + 1;
          const detail = lineDetail(line, block, number);
          return (
            <li key={number}>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm text-ink sm:min-h-9 sm:py-1.5">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 cursor-pointer accent-action sm:mt-px sm:size-4"
                  checked={block.preparedLines.includes(number)}
                  disabled={save.isPending}
                  onChange={(event) => void toggle(number, event.target.checked)}
                />
                <span className="min-w-0 break-words">
                  {line.name}
                  {detail ? <span className="tabular-nums text-ink-muted"> · {detail}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
