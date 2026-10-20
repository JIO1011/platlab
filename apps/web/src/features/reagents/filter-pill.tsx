import type { ReactNode } from 'react';

/** Pastilla de un atajo del periodo: radio nativo dentro; la elegida se rellena con el acento (no solo cambia de matiz). */
export function Pill({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="relative inline-flex min-h-[44px] min-w-0 cursor-pointer items-center rounded-full border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-sunken has-[:checked]:border-action has-[:checked]:bg-action has-[:checked]:font-semibold has-[:checked]:text-on-action has-[:checked]:hover:bg-action-hover has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action sm:min-h-8">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="absolute -inset-px m-0 cursor-pointer opacity-0" />
      <span className="min-w-0 truncate">{children}</span>
    </label>
  );
}
