import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const Tabs = TabsPrimitive.Root;

/**
 * Pestañas subrayadas (ADR 0021): una línea fina como base y, bajo la activa, un indicador grueso en el color del
 * módulo; las demás van solo en texto. La línea es una sombra interior, no un borde, para no desbordar la tira
 * cuando se desplaza en horizontal.
 */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('flex gap-1 shadow-[inset_0_-1px_0_0_var(--color-line)]', className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-[44px] items-center justify-center border-b-[3px] border-transparent px-3.5 text-sm font-medium text-ink-muted',
        'transition-[color,border-color] duration-150 ease-out-expo focus-visible:-outline-offset-2',
        'hover:text-ink data-[state=active]:border-action data-[state=active]:text-ink',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-5 outline-none', className)} {...props} />;
}
