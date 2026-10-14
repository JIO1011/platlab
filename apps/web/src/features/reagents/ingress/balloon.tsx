import type { ReactNode } from 'react';

/**
 * Globo de error anclado a un campo (ADR 0015, ajuste del 13-10-2026): fondo de peligro suave, borde
 * y una flecha hacia el campo. Va dentro del envoltorio `relative` del campo y flota debajo de él, sin
 * empujar el diseño. El campo lo enlaza con `aria-describedby`; se anuncia al aparecer.
 */
export function ErrorBalloon({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      id={id}
      role="alert"
      className="absolute inset-x-0 top-full z-20 mt-2.5 origin-top-left animate-pop-in rounded-xl border border-danger/35 bg-danger-soft px-3 py-2 text-[13px] font-medium leading-snug text-danger shadow-float"
    >
      <span aria-hidden className="absolute -top-[6px] left-5 size-2.5 rotate-45 border-l border-t border-danger/35 bg-danger-soft" />
      {children}
    </div>
  );
}
