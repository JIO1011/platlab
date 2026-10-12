import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

const chipStyles = cva('inline-flex shrink-0 items-center justify-center rounded-control', {
  variants: {
    // `accent` toma el color del módulo; los demás tonos son de estado (ADR 0010).
    tone: {
      accent: 'bg-action-soft text-action',
      neutral: 'bg-surface-sunken text-ink-subtle',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
    },
    size: {
      md: 'size-10 [&>svg]:size-5',
      sm: 'size-8 [&>svg]:size-4',
    },
  },
  defaultVariants: { tone: 'accent', size: 'md' },
});

export interface IconChipProps extends VariantProps<typeof chipStyles> {
  icon: LucideIcon;
  className?: string;
}

/**
 * Icono sobre un fondo suave. Decorativo: el significado siempre va en el texto de al lado, así
 * que queda oculto a los lectores de pantalla.
 */
export function IconChip({ icon: Icon, tone, size, className }: IconChipProps) {
  return (
    <span aria-hidden className={cn(chipStyles({ tone, size }), className)}>
      <Icon />
    </span>
  );
}
