import { initialsOf } from './initials';

/** El encargado de un área: avatar de iniciales y nombre, o «Sin encargado». Solo se muestra. */
export function ManagerLine({ manager }: { manager: { name: string } | null }) {
  return (
    <div className="flex min-h-8 min-w-0 items-center gap-2.5">
      {manager ? (
        <>
          <span
            aria-hidden
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-action-soft text-xs font-bold text-action"
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
    </div>
  );
}
