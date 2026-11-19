import { subtractDecimals, type MaterialsDashboard } from '@platlab/contracts';
import { Quantity, ratioPercent } from '@platlab/ui';

/**
 * El material en el estante (ADR 0025): qué parte de lo que posee el espacio está en su sitio y cuánto anda
 * prestado. Un medidor de un solo dato: la pista es un tono más claro del mismo color.
 */
export function ShelfMeter({ shelf }: { shelf: MaterialsDashboard['shelf'] }) {
  const percent = ratioPercent(shelf.available, shelf.total);
  if (percent === null) return <p className="text-sm text-ink-muted">Aún no hay material con existencias.</p>;
  return (
    <div className="grid gap-3">
      <p className="text-metric-sm tabular-nums text-ink">{percent} %</p>
      <div role="img" aria-label={`En el estante: ${percent} %`} className="h-3 overflow-hidden rounded-full bg-action-soft">
        <div className="h-full rounded-full bg-action transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-[13px] text-ink-muted">
        <b className="font-semibold text-ink">
          <Quantity value={shelf.available} unit="u" />
        </b>{' '}
        de <Quantity value={shelf.total} unit="u" /> en el estante · <Quantity value={subtractDecimals(shelf.total, shelf.available)} unit="u" /> prestadas
      </p>
    </div>
  );
}
