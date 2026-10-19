import { Button, Input, Skeleton, cn, sectionLabel } from '@platlab/ui';
import { ChevronDown, X } from 'lucide-react';
import { useId, type ReactNode } from 'react';

/** «1 elegido» / «3 elegidos»: lo que dice cada fila plegada con algo marcado. */
const chosenText = (count: number): string => `${new Intl.NumberFormat('es-EC').format(count)} ${count === 1 ? 'elegido' : 'elegidos'}`;

/** Cuántas fichas se ven bajo un grupo plegado; el resto se cuenta en «+N». */
const CHIPS_SHOWN = 3;

export interface ChosenOption {
  key: string;
  label: string;
}

/**
 * Las opciones elegidas de un grupo plegado, como fichas pequeñas bajo su rótulo: cada una con su «×» para
 * quitarla sin abrir el grupo. Con más de tres se ven las tres primeras y «+N», que abre el grupo.
 */
function ChosenChips({ title, chosen, onRemove, onOpen }: { title: string; chosen: readonly ChosenOption[]; onRemove: (key: string) => void; onOpen: () => void }) {
  const hidden = chosen.length - CHIPS_SHOWN;
  return (
    <ul aria-label={`${title}: opciones elegidas`} className="flex flex-wrap gap-1 px-2 pb-1.5 pt-0.5">
      {chosen.slice(0, CHIPS_SHOWN).map((option) => (
        <li key={option.key} className="inline-flex h-7 min-w-0 max-w-full items-center rounded-full bg-action-soft text-xs font-medium text-action sm:h-6">
          <span className="min-w-0 truncate pl-2.5" title={option.label}>
            {option.label}
          </span>
          <button
            type="button"
            onClick={() => onRemove(option.key)}
            aria-label={`Quitar «${option.label}» de ${title.toLowerCase()}`}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-action/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action sm:size-6"
          >
            <X className="size-3" aria-hidden />
          </button>
        </li>
      ))}
      {hidden > 0 ? (
        <li className="inline-flex">
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Ver ${hidden === 1 ? 'la otra opción elegida' : `las otras ${hidden} opciones elegidas`} de ${title.toLowerCase()}`}
            className="inline-flex h-7 items-center rounded-full px-2 text-xs font-semibold tabular-nums text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action sm:h-6"
          >
            +{hidden}
          </button>
        </li>
      ) : null}
    </ul>
  );
}

/** Un grupo plegable: `fieldset` con su rótulo como `legend`, fila con cuántos hay elegidos. Solo uno abierto a la vez. */
export function FilterGroup({
  id,
  title,
  marked,
  chosen,
  open,
  onToggle,
  onRemove,
  children,
}: {
  id: string;
  title: string;
  marked: number;
  /** Lo elegido, con su nombre: se ve bajo el rótulo mientras el grupo está plegado. */
  chosen: readonly ChosenOption[];
  open: boolean;
  onToggle: () => void;
  onRemove: (key: string) => void;
  children: ReactNode;
}) {
  const bodyId = useId();
  return (
    <fieldset className="min-w-0 border-t border-line py-1">
      <legend className="w-full p-0">
        <button
          type="button"
          data-group-toggle={id}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-control px-2 text-left transition-colors hover:bg-surface-sunken sm:min-h-8"
        >
          <span className={sectionLabel}>{title}</span>
          <span className="flex min-w-0 items-center gap-2">
            {marked > 0 ? <span className="whitespace-nowrap rounded-full bg-action-soft px-2 text-xs font-semibold tabular-nums text-action">{chosenText(marked)}</span> : null}
            <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-ink-muted transition-transform duration-150', open && 'rotate-180')} />
          </span>
        </button>
      </legend>
      {!open && chosen.length > 0 ? <ChosenChips title={title} chosen={chosen} onRemove={onRemove} onOpen={onToggle} /> : null}
      <div id={bodyId} hidden={!open} className="pb-1.5 pt-0.5">
        {/* Montado solo abierto: al abrir el grupo, lo marcado sube arriba. */}
        {open ? children : null}
      </div>
    </fieldset>
  );
}

/**
 * «Limpiar filtros» en la cabecera del panel lateral, solo con filtros puestos: con el panel a la vista no se
 * muestran las fichas (E-01d), así que quitar todo de una vez vive aquí.
 */
export function FilterPanelClear({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex justify-end px-1 pb-1">
      <Button variant="ghost" size="sm" className="h-[44px] sm:h-8" onClick={onClear}>
        Limpiar filtros
      </Button>
    </div>
  );
}

/** Opciones de un filtro mientras cargan. */
export function OptionsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-2 px-2 py-1.5" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
}

/** Opciones de un filtro que no cargaron, con «Reintentar». */
export function OptionsError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="grid justify-items-start gap-1 px-2 py-1.5">
      <p role="alert" className="text-[13px] text-ink-muted">
        No se pudieron cargar {what}.
      </p>
      <Button variant="ghost" size="sm" className="h-[44px] sm:h-8" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/** Un campo de fecha del periodo; con `errorId`, queda marcado y apunta a su aviso. */
export function DateField({ label, value, onChange, errorId }: { label: string; value: string; onChange: (value: string) => void; errorId?: string | undefined }) {
  const id = useId();
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2">
      <label htmlFor={id} className="text-[13px] text-ink-muted">
        {label}
      </label>
      <Input
        id={id}
        type="date"
        value={value}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        onChange={(event) => onChange(event.target.value)}
        className="h-[44px] min-w-0 px-2 text-[13px] sm:h-9"
      />
    </div>
  );
}
