import { cn } from '@platlab/ui';

/**
 * Pastilla de filtro de una lista (Reactivos, Materiales): el texto, la cuenta si se conoce y, activa, el color suave
 * del módulo. Con `hideWhenEmpty` se oculta si no hay nada que filtrar y no está activa, para poder quitarla.
 */
export function FilterPill({
  label,
  count,
  active,
  onToggle,
  hideWhenEmpty = false,
}: {
  label: string;
  count?: number | undefined;
  active: boolean;
  onToggle: () => void;
  hideWhenEmpty?: boolean;
}) {
  if (hideWhenEmpty && count === 0 && !active) return null;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
        active ? 'bg-action-soft text-action' : 'bg-surface-sunken text-ink-muted hover:text-ink',
      )}
    >
      {label}
      {count === undefined ? null : <span className="tabular-nums">({count})</span>}
    </button>
  );
}
