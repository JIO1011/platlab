import { IconChip, cn, type StatCardProps } from '@platlab/ui';

const hintTones = {
  neutral: 'text-ink-muted',
  accent: 'text-action',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

/**
 * Cifra de una pantalla que filtra la lista de su misma pantalla (hermana de `StatLink`, que navega): el botón es la
 * tarjeta y `aria-pressed` dice cuál filtro está puesto. Es más compacta que `StatCard`: el rótulo arriba a la izquierda,
 * el ícono en un cuadro teñido arriba a la derecha y, debajo, la cifra con su pista a la derecha. El tono tiñe solo el
 * cuadro y la pista, y la cifra siempre va con su rótulo y su pista escritos: ese es su nombre accesible.
 */
export function StatButton({
  pressed,
  onPress,
  label,
  value,
  hint,
  hintTone = 'neutral',
  icon,
  tone,
}: { pressed: boolean; onPress: () => void } & Pick<StatCardProps, 'label' | 'value' | 'hint' | 'hintTone' | 'icon' | 'tone'>) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      className="grid min-w-0 content-between gap-3 rounded-card bg-surface p-4 text-left shadow-raised transition-shadow duration-150 hover:shadow-float focus-visible:outline-offset-4 aria-pressed:ring-2 aria-pressed:ring-action"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-sm font-medium text-ink-muted">{label}</span>
        <IconChip icon={icon} tone={tone} size="sm" className="rounded-lg" />
      </span>
      <span className="flex items-end justify-between gap-3">
        <span className="text-[1.75rem] font-bold leading-none tracking-tight text-ink tabular-nums">{value}</span>
        {hint ? <span className={cn('min-w-0 text-right text-xs font-medium', hintTones[hintTone])}>{hint}</span> : null}
      </span>
    </button>
  );
}
