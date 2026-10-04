import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge con la escala tipográfica propia (styles.css): sin esto, `text-metric-sm` se toma
 * por un color y desaparece al combinarse con `text-ink`.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['display', 'metric', 'metric-sm', 'body-lg'] }] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
