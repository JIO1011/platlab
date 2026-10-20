import { cn } from '@platlab/ui';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, CircleDot, Scale } from 'lucide-react';
import { formatDateTime, formatShortDateTime } from './format';
import { MovementAmount } from './movement-amount';

const types: Record<string, { label: string; icon: typeof Scale }> = {
  receipt: { label: 'Ingreso', icon: ArrowDownToLine },
  issue: { label: 'Salida', icon: ArrowUpFromLine },
  adjustment: { label: 'Ajuste', icon: Scale },
  transfer: { label: 'Traslado', icon: ArrowLeftRight },
};

export interface ActivityRowProps {
  type: string;
  title: string;
  detail: string;
  quantity: string;
  unit: string;
  occurredAt: string;
  actor: string | null;
  timeZone: string;
  className?: string;
}

/**
 * Un movimiento leído como asiento de un libro: qué y dónde a la izquierda, la cantidad con signo
 * a la derecha, y quién y cuándo como dato secundario. El tipo se distingue por icono y texto.
 */
export function ActivityRow({ type, title, detail, quantity, unit, occurredAt, actor, timeZone, className }: ActivityRowProps) {
  const kind = types[type] ?? { label: type, icon: CircleDot };
  const Icon = kind.icon;
  return (
    <div className={cn('@container flex items-center gap-3.5', className)}>
      <span
        className={cn(
          // El círculo va siempre en el acento: el icono dice el tipo y el color de la cifra, el sentido.
          // Así una lista de salidas no es un muro rojo.
          'relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-action-soft text-action ring-4 ring-surface',
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      {/* Cantidad y tipo acompañan a sus líneas en lugar de ocupar una columna propia. Si la fila
          es estrecha (consulta de contenedor, no de ventana: sirve igual en una columna del Resumen
          que en el móvil; el umbral es holgado para que un detalle largo no se coma al responsable),
          quién y cuándo bajan a su propia línea. El responsable siempre va antes
          que la hora, para que un recorte nunca oculte quién movió el stock. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-bold text-ink">{title}</p>
          <MovementAmount type={type} quantity={quantity} unit={unit} className="shrink-0 text-sm" />
        </div>
        <div className="flex items-baseline justify-between gap-3 text-[13px] text-ink-muted">
          <p className="truncate">
            {detail}
            <span className="hidden @3xl:inline">
              {actor ? ` · ${actor}` : ''}
              {' · '}
              {formatDateTime(occurredAt, timeZone)}
            </span>
          </p>
          <span className="shrink-0 text-[12px]">{kind.label}</span>
        </div>
        <p className="truncate text-[13px] text-ink-muted @3xl:hidden">
          {actor ? `${actor} · ` : ''}
          {formatShortDateTime(occurredAt, timeZone)}
        </p>
      </div>
    </div>
  );
}
