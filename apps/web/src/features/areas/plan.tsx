import { Building2, Plus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * El contorno del croquis: la sede o el edificio como una pared gruesa sobre una cuadrícula de puntos, con su nombre
 * sobre el borde, como la leyenda de un plano. Los cuartos van dentro.
 */
export function Contour({ title, icon: Icon = Building2, count, muted = false, children }: { title: string; icon?: LucideIcon; count: string; muted?: boolean; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="relative rounded-card border-2 border-line-strong bg-surface-sunken/50 p-3 pt-7 sm:p-5 sm:pt-8"
      style={{ backgroundImage: 'radial-gradient(var(--color-line) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
    >
      <h2 className="absolute -top-4 left-4 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-canvas px-3 py-1 text-sm font-semibold sm:left-6">
        <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
        <span className={muted ? 'truncate text-ink-muted' : 'truncate text-ink'}>{title}</span>
        <span className="shrink-0 font-normal tabular-nums text-ink-subtle">{count}</span>
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3">{children}</ul>
    </section>
  );
}

/** El cuarto por construir: un cuadro punteado que invita a crear al administrador. */
export function NewRoom({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li className="grid">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-40 flex-col items-center justify-center gap-1.5 rounded-panel border-2 border-dashed border-ink-subtle px-4 text-sm font-medium text-ink-muted transition-colors duration-150 hover:border-action hover:bg-action-soft hover:text-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
      >
        <Plus className="size-5" aria-hidden />
        {label}
      </button>
    </li>
  );
}
