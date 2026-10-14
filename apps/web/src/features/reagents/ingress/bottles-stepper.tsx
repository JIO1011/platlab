import { Input, cn } from '@platlab/ui';
import { Minus, Plus } from 'lucide-react';
import { useId, type RefObject } from 'react';
import { ErrorBalloon } from './balloon';
import { MAX_BOTTLES, countOf } from './model';

const step =
  'inline-flex h-full w-11 shrink-0 items-center justify-center text-ink transition-colors duration-150 hover:bg-action-soft disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action';

/**
 * Número de frascos (ADR 0015, ajuste del 13-10-2026): `[− N +]` en el pie de la hoja, unido al botón
 * principal y de su misma altura (h-14). Pastilla clara de 1 a 50; su error, si lo hay, flota encima.
 */
export function BottlesStepper({
  value,
  onChange,
  error,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const errorId = useId();
  const count = countOf(value);
  const move = (delta: number) => onChange(String(Math.min(MAX_BOTTLES, Math.max(1, (count ?? 1) + delta))));
  return (
    <div className="relative shrink-0">
      <div
        role="group"
        aria-label="Número de frascos"
        className={cn(
          'flex h-14 items-stretch overflow-hidden rounded-2xl border border-line bg-white/70 transition-[border-color,box-shadow] duration-150 hover:border-line-strong',
          'focus-within:border-action focus-within:ring-3 focus-within:ring-action/20 has-[[aria-invalid=true]]:border-danger',
        )}
      >
        <button type="button" aria-label="Un frasco menos" disabled={(count ?? 1) <= 1} onClick={() => move(-1)} className={step}>
          <Minus className="size-4" aria-hidden />
        </button>
        <Input
          ref={inputRef}
          inputMode="numeric"
          autoComplete="off"
          aria-label="Frascos"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full w-10 rounded-none border-0 bg-transparent px-0 text-center text-base font-bold tabular-nums hover:border-0 focus-visible:ring-0 aria-[invalid=true]:ring-0 sm:w-12"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" aria-label="Un frasco más" disabled={(count ?? 1) >= MAX_BOTTLES} onClick={() => move(1)} className={step}>
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      {error ? (
        <ErrorBalloon id={errorId} above>
          {error}
        </ErrorBalloon>
      ) : null}
    </div>
  );
}
