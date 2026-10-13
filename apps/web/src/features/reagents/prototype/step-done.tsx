// Prototipo R-01D: solo interfaz
import { Button } from '@platlab/ui';
import { Check, Printer } from 'lucide-react';

/**
 * Éxito (simulado): una marca sobria que se dibuja una vez (con movimiento reducido, ya dibujada) y
 * tres salidas. El aviso de que nada se guardó va discreto, al pie.
 */
export function StepDone({
  summary,
  onPrint,
  onAnother,
  onFicha,
}: {
  summary: string;
  onPrint: () => void;
  onAnother: () => void;
  /** Solo hay ficha que ver si el reactivo ya existía. */
  onFicha: (() => void) | null;
}) {
  return (
    <div className="grid justify-items-center gap-5 px-2 py-6 text-center sm:py-10">
      <span aria-hidden className="inline-flex size-20 items-center justify-center rounded-full bg-success-soft text-success motion-safe:animate-check-ring">
        <svg viewBox="0 0 24 24" className="size-10 fill-none stroke-current" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} className="motion-safe:animate-check-draw" />
        </svg>
      </span>
      <div role="status" className="grid gap-1.5">
        <h3 className="text-balance text-2xl font-bold tracking-tight text-ink">¡Listo! {summary}</h3>
        <p className="text-sm text-ink-muted">Cada frasco tendrá su código y su QR para etiquetarlo.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" className="max-sm:h-[44px]" onClick={onPrint}>
          <Printer aria-hidden />
          Imprimir etiquetas
        </Button>
        <Button className="max-sm:h-[44px]" onClick={onAnother}>
          Ingresar otro reactivo
        </Button>
        {onFicha ? (
          <Button variant="ghost" className="max-sm:h-[44px]" onClick={onFicha}>
            Ver ficha
          </Button>
        ) : null}
      </div>
      <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
        <Check className="size-3.5" aria-hidden />
        Vista previa: aún no se guarda nada.
      </p>
    </div>
  );
}
