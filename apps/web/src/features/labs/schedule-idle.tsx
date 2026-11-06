import { Popover, PopoverContent, PopoverTrigger } from '@platlab/ui';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router';
import { countText } from '../../app/format';
import type { BoardColumn } from './schedule-grid';

/**
 * El aviso de las áreas del Núcleo que aún no tienen horario, en el encabezado del Cronograma: no ocupan columnas en la
 * tabla. «2 áreas sin horario · Habilitar» abre su lista; quien administra espacios (`enableHref`) trae el enlace a Áreas
 * de cada una, y los demás solo ven cuáles son.
 */
export function IdleAreas({ columns, enableHref }: { columns: readonly BoardColumn[]; enableHref: ((areaId: string) => string) | undefined }) {
  if (columns.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action sm:min-h-9"
        >
          {countText(columns.length, 'área sin horario', 'áreas sin horario')}
          {enableHref ? <span className="font-semibold text-action">· Habilitar</span> : null}
          <ChevronDown aria-hidden className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="px-2 pb-1 pt-1.5 text-[13px] text-ink-muted">No aparecen en la tabla hasta que tengan horario.</p>
        <ul>
          {columns.map((column) => (
            <li key={column.areaId} className="flex min-h-11 items-center justify-between gap-3 px-2 text-sm">
              <span className="min-w-0 font-medium text-ink [overflow-wrap:anywhere]">
                {column.areaName}
                {column.groupName ? <span className="block text-xs font-normal text-ink-muted">{column.groupName}</span> : null}
              </span>
              {enableHref ? (
                <Link
                  to={enableHref(column.areaId)}
                  className="inline-flex h-9 shrink-0 items-center rounded-control px-2.5 font-semibold text-action transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action"
                >
                  Habilitar<span className="sr-only"> {column.areaName}</span>
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
