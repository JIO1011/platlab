import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

const tileStyles = cva(
  'inline-flex shrink-0 items-center justify-center bg-linear-to-br from-action to-action-deep text-on-action shadow-lg shadow-action/25',
  {
    variants: {
      // `md` es el de la cabecera de las ventanas; `lg`, el de la ficha.
      size: {
        md: 'size-12 rounded-2xl [&>svg]:size-6',
        lg: 'size-14 rounded-[18px] [&>svg]:size-7',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** Cuadro en degradado del acento del módulo con su icono; decorativo, el nombre va al lado. */
export function IconTile({ icon: Icon, size, className }: VariantProps<typeof tileStyles> & { icon: LucideIcon; className?: string }) {
  return (
    <span aria-hidden className={cn(tileStyles({ size }), className)}>
      <Icon />
    </span>
  );
}
