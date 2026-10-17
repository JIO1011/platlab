import { Button, cn } from '@platlab/ui';
import { Printer } from 'lucide-react';

/**
 * Barra fija de las etiquetas (ADR 0010): cuántas se eligieron, «Todas» / «Ninguna» (de lo que se ve), «Listo»
 * e «Imprimir N». Sale y entra desde abajo; cerrada, queda inerte y fuera de la vista.
 */
export function LabelBar({
  open,
  count,
  allPicked,
  onToggleAll,
  onDone,
  onPrint,
}: {
  open: boolean;
  count: number;
  allPicked: boolean;
  onToggleAll: () => void;
  onDone: () => void;
  onPrint: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Elegir etiquetas"
      inert={!open}
      className={cn(
        'fixed inset-x-3 bottom-4 z-30 mx-auto md:left-72 flex max-w-2xl flex-wrap items-center gap-2 rounded-3xl border border-white/70 bg-white/85 p-2.5 shadow-overlay backdrop-blur-xl not-supports-[backdrop-filter]:bg-surface',
        'transition-[opacity,translate] duration-200 ease-out-expo starting:translate-y-6 starting:opacity-0',
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0 motion-reduce:translate-y-0',
      )}
    >
      <p aria-live="polite" className="basis-full px-2 text-sm font-semibold tabular-nums text-ink sm:mr-auto sm:basis-auto">
        {count === 1 ? '1 elegida' : `${count} elegidas`}
      </p>
      <Button variant="ghost" size="sm" onClick={onToggleAll}>
        {allPicked ? 'Ninguna' : 'Todas'}
      </Button>
      <Button variant="secondary" size="sm" onClick={onDone}>
        Listo
      </Button>
      <Button variant="primary" size="sm" className="ml-auto sm:ml-0" disabled={count === 0} onClick={onPrint}>
        <Printer aria-hidden />
        Imprimir {count}
      </Button>
    </div>
  );
}
