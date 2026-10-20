import { Button, Input, Skeleton } from '@platlab/ui';
import { useId } from 'react';

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
