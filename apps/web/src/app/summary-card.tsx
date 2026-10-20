import { cn } from '@platlab/ui';
import { type LucideIcon } from 'lucide-react';

/** Color del icono del rótulo: el de su estado, o el tenue cuando no cuenta ninguno. */
const labelIconTone = { soft: 'text-ink-subtle', success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;

/**
 * Rótulo de una tarjeta del resumen: icono de 12 px en línea y el nombre en mayúsculas de 10 px. El propio
 * `dt` los agrupa: dentro de un `dl`, un `dt` no puede ir envuelto en otro elemento (axe). En el móvil, el
 * icono va sobre el rótulo para que quepan tres columnas.
 */
export function RowLabel({ children, icon: Icon, tone = 'soft' }: { children: string; icon: LucideIcon; tone?: keyof typeof labelIconTone }) {
  return (
    <dt className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase leading-none tracking-wider text-ink-muted max-sm:flex-col max-sm:items-start">
      <Icon className={cn('size-3 shrink-0', labelIconTone[tone])} aria-hidden />
      <span className="min-w-0">{children}</span>
    </dt>
  );
}
