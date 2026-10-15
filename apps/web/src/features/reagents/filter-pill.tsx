import type { ReactNode } from 'react';
import { countFormat, type FilterGroupId } from './movement-text';

/** Pastilla de una opción (Período y Tipo): casilla o radio nativos dentro; la elegida se rellena con el acento (no solo cambia de matiz). */
export function Pill({
  type,
  name,
  checked,
  onChange,
  count,
  toggleGroup,
  children,
}: {
  type: 'checkbox' | 'radio';
  name: string;
  checked: boolean;
  onChange: () => void;
  /** Cuántos movimientos tiene; sin dato mientras llegan los conteos. */
  count?: number | undefined;
  /** Marca la pastilla a la que lleva el foco una ficha de este grupo. */
  toggleGroup?: FilterGroupId | undefined;
  children: ReactNode;
}) {
  return (
    <label className="group relative inline-flex min-h-[44px] min-w-0 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-sunken has-[:checked]:border-action has-[:checked]:bg-action has-[:checked]:font-semibold has-[:checked]:text-on-action has-[:checked]:hover:bg-action-hover has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action sm:min-h-8">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        data-group-toggle={toggleGroup}
        className="absolute -inset-px m-0 cursor-pointer opacity-0"
      />
      <span className="min-w-0 truncate">{children}</span>
      {count === undefined ? null : (
        <span className="ml-auto shrink-0 pl-1 tabular-nums text-ink-muted group-has-[:checked]:text-on-action">
          {countFormat.format(count)}
          <span className="sr-only"> movimientos</span>
        </span>
      )}
    </label>
  );
}
