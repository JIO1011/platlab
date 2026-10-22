import type { RequestLine } from '@platlab/contracts';
import { Badge, Quantity } from '@platlab/ui';
import { Check, TriangleAlert, X } from 'lucide-react';

const checks = {
  ok: { Icon: Check, label: 'Alcanza', tone: 'success' },
  short: { Icon: TriangleAlert, label: 'No alcanza', tone: 'warning' },
  unverified: { Icon: X, label: 'Sin verificar', tone: 'neutral' },
} as const;

/** Lo que dijo el servidor de una línea al guardar: ✔ alcanza, ⚠ no alcanza, ✖ sin inventario que lo verifique, con lo disponible. */
export function LineCheck({ line }: { line: RequestLine }) {
  const { Icon, label, tone } = checks[line.check];
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge tone={tone}>
        <Icon className="size-3.5" aria-hidden />
        {label}
      </Badge>
      {line.kind === 'reagent' && line.available !== null ? (
        <span className="text-[13px] text-ink-muted">
          Disponible: <Quantity value={line.available} unit={line.unit} />
        </span>
      ) : null}
      {line.kind === 'equipment' && line.available !== null ? <span className="text-[13px] text-ink-muted">Disponibles: {line.available}</span> : null}
    </span>
  );
}
