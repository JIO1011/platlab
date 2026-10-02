import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const badgeStyles = cva('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium', {
  variants: {
    tone: {
      neutral: 'bg-surface-sunken text-ink-muted',
      info: 'bg-action-soft text-action',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

/** Estado siempre con texto, nunca solo con color (01 «Dirección visual»). */
export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeStyles>) {
  return <span className={cn(badgeStyles({ tone }), className)} {...props} />;
}
