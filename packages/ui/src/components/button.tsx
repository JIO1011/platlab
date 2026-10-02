import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const buttonStyles = cva(
  [
    'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium',
    'transition-[background-color,border-color,color,transform] duration-150 ease-out-expo motion-safe:active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-action text-on-action shadow-raised hover:bg-action-hover active:bg-action-pressed',
        secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-sunken',
        ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  /**
   * Mientras el servidor confirma: deshabilita, anuncia la espera (aria-busy) y muestra el cursor de
   * progreso, sin cambiar el ancho ni girar en bucle (ADR 0010).
   */
  loading?: boolean;
}

export function Button({ className, variant, size, loading = false, disabled, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size }), loading && 'cursor-progress', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {children}
    </button>
  );
}
