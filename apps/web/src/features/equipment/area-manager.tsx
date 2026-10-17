import type { Area } from '@platlab/contracts';
import { Button } from '@platlab/ui';
import { Pencil } from 'lucide-react';
import { AssignAreaManager } from './sheets/area-manager-sheet';

/** Las dos primeras iniciales del nombre: «Ana María Pérez» es «AM». */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * El encargado de un área: avatar de iniciales y nombre, o «Sin encargado». Con `canManage`, un botón aparte
 * («Asignar», o el lápiz si ya hay uno) abre su hoja; en la tarjeta de área queda por encima del enlace que
 * cubre toda la tarjeta.
 */
export function AreaManagerLine({ area, canManage }: { area: Area; canManage: boolean }) {
  const { manager } = area;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {manager ? (
        <>
          <span
            aria-hidden
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-action-soft text-[12px] font-bold text-action"
          >
            {initialsOf(manager.name)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-ink" title={manager.name}>
            {manager.name}
          </span>
        </>
      ) : (
        <span className="flex-1 text-sm text-ink-muted">Sin encargado</span>
      )}
      {canManage ? (
        <AssignAreaManager area={area}>
          {(open) =>
            manager ? (
              <Button
                variant="ghost"
                aria-label={`Cambiar el encargado de ${area.name}`}
                title="Cambiar encargado"
                className="relative -my-1.5 size-11 shrink-0 sm:size-8"
                onClick={open}
              >
                <Pencil aria-hidden />
              </Button>
            ) : (
              <Button
                size="sm"
                aria-label={`Asignar encargado a ${area.name}`}
                className="relative -my-1.5 h-[44px] shrink-0 sm:h-8"
                onClick={open}
              >
                Asignar
              </Button>
            )
          }
        </AssignAreaManager>
      ) : null}
    </div>
  );
}
