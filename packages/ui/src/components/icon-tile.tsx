import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

const tileStyles = cva('inline-flex shrink-0 items-center justify-center', {
  variants: {
    // `md` es el de la cabecera de las ventanas; `lg`, el de la ficha; `sm`, el de las tarjetas del resumen.
    size: {
      md: 'size-12 rounded-2xl [&>svg]:size-6',
      lg: 'size-14 rounded-[18px] [&>svg]:size-7',
      sm: 'size-9 rounded-xl [&>svg]:size-[18px]',
    },
    // `solid`: degradado del acento del módulo. Los suaves llevan un tinte claro y el icono en su color;
    // el color acompaña al texto, nunca lo sustituye.
    tone: {
      solid: 'bg-linear-to-br from-action to-action-deep text-on-action shadow-lg shadow-action/25',
      soft: 'bg-action-soft text-action',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
    },
  },
  defaultVariants: { size: 'md', tone: 'solid' },
});

/** Cuadro con su icono (degradado del acento del módulo o tinte suave); decorativo, el nombre va al lado. */
export function IconTile({ icon: Icon, size, tone, className }: VariantProps<typeof tileStyles> & { icon: LucideIcon; className?: string }) {
  return (
    <span aria-hidden className={cn(tileStyles({ size, tone }), className)}>
      <Icon />
    </span>
  );
}
