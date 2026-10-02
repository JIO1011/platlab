import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

/** Menú que nace de su disparador (ADR 0010): misma superficie y entrada que el Select. */
export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-control border border-line bg-surface p-1 shadow-overlay',
          'origin-[var(--radix-dropdown-menu-content-transform-origin)] data-[state=open]:animate-pop-in',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'flex h-10 cursor-default select-none items-center gap-2.5 rounded-[6px] px-2.5 text-sm text-ink outline-none',
        'data-[highlighted]:bg-action-soft [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-muted',
        className,
      )}
      {...props}
    />
  );
}
