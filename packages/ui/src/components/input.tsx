import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { useFieldControl } from './field';

const control = [
  'w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink',
  'placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-150',
  'hover:border-ink-subtle focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15',
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle',
];

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...useFieldControl()} className={cn(control, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...useFieldControl()} className={cn(control, 'min-h-20 resize-y py-2 leading-relaxed', className)} {...props} />;
}
