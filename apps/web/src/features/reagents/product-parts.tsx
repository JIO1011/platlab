import { cn } from '@platlab/ui';
import { Box, Droplet, Wind, type LucideIcon } from 'lucide-react';

export const physicalStateLabel: Record<string, string> = { solid: 'Sólido', liquid: 'Líquido', gas: 'Gas' };

/** El icono lo da el estado físico, un dato que ya existe; sin él, el matraz del módulo. */
export const physicalStateIcon: Record<string, LucideIcon> = { solid: Box, liquid: Droplet, gas: Wind };

/** Interruptor «mostrar vacíos» de ReactiLab: lo que no tiene saldo se oculta, pero no desaparece. */
export function EmptyToggle({ count, shown, onToggle, noun }: { count: number; shown: boolean; onToggle: () => void; noun: string }) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={onToggle}
      className={cn(
        'inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors',
        shown ? 'bg-action-soft text-action' : 'bg-surface-sunken text-ink-muted hover:text-ink',
      )}
    >
      {shown ? 'Ocultar' : 'Mostrar'} {noun} ({count})
    </button>
  );
}
