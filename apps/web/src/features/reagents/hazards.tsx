import type { hazard } from '@platlab/contracts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from '@platlab/ui';
import { Bomb, Check, Cylinder, Fish, Flame, FlameKindling, HeartPulse, Plus, Skull, TestTube, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import type { z } from 'zod';

export type Hazard = z.infer<typeof hazard>;

/**
 * Excepción de color: el rojo del borde del rombo es normativo del SGA (pictogramas de peligro),
 * no un color de estado ni de acento. El significado va siempre en el texto contiguo.
 */
const SGA_RED = '#e30613';

/** Los nueve pictogramas SGA (ADR 0015), en su orden. Lucide no los trae: se aproxima el símbolo. */
const hazards: ReadonlyArray<{ id: Hazard; label: string; icon: LucideIcon }> = [
  { id: 'GHS01', label: 'Explosivo', icon: Bomb },
  { id: 'GHS02', label: 'Inflamable', icon: Flame },
  { id: 'GHS03', label: 'Comburente', icon: FlameKindling },
  { id: 'GHS04', label: 'Gas a presión', icon: Cylinder },
  { id: 'GHS05', label: 'Corrosivo', icon: TestTube },
  { id: 'GHS06', label: 'Toxicidad aguda', icon: Skull },
  { id: 'GHS07', label: 'Irritante o nocivo', icon: TriangleAlert },
  { id: 'GHS08', label: 'Peligro para la salud', icon: HeartPulse },
  { id: 'GHS09', label: 'Peligro para el medio ambiente', icon: Fish },
];

/** Rombo del SGA con su símbolo dentro; decorativo, el nombre va aparte. */
function Pictogram({ icon: Icon, className }: { icon: LucideIcon; className?: string | undefined }) {
  return (
    <span aria-hidden className={cn('relative inline-flex size-5 shrink-0 items-center justify-center', className)}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full!">
        <polygon points="20,2.5 37.5,20 20,37.5 2.5,20" fill="var(--color-surface)" stroke={SGA_RED} strokeWidth="3.2" strokeLinejoin="miter" />
      </svg>
      <Icon className="relative size-2.5 text-ink" strokeWidth={2} />
    </span>
  );
}

/**
 * Selección múltiple de peligros: los elegidos se ven como pictogramas con su nombre (un toque los
 * quita) y «Añadir» abre un menú con los nueve, cada uno con su casilla.
 */
export function HazardSelect({ value, onChange }: { value: Hazard[]; onChange: (next: Hazard[]) => void }) {
  // Se guardan en el orden del SGA, como los muestra la ficha.
  const toggle = (id: Hazard) =>
    onChange(hazards.map((entry) => entry.id).filter((entry) => (entry === id ? !value.includes(id) : value.includes(entry))));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hazards
        .filter((entry) => value.includes(entry.id))
        .map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => toggle(entry.id)}
            aria-label={`Quitar ${entry.label}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-surface-sunken py-1 pl-1.5 pr-2.5 text-[13px] text-ink transition-colors duration-150 hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-[36px]"
          >
            <Pictogram icon={entry.icon} />
            {entry.label}
            <X className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
          </button>
        ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-dashed border-line-strong px-3 text-[13px] font-medium text-action transition-colors duration-150 hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-[36px]"
          >
            <Plus className="size-3.5" aria-hidden />
            Añadir
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] min-w-64 overflow-y-auto">
          {hazards.map((entry) => {
            const checked = value.includes(entry.id);
            return (
              <DropdownMenuItem
                key={entry.id}
                role="menuitemcheckbox"
                aria-checked={checked}
                onSelect={(event) => {
                  event.preventDefault();
                  toggle(entry.id);
                }}
                className="max-sm:h-[44px]"
              >
                <span
                  aria-hidden
                  className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border', checked ? 'border-action bg-action' : 'border-line-strong bg-surface')}
                >
                  {checked ? <Check className="size-3! text-on-action!" strokeWidth={3} /> : null}
                </span>
                <Pictogram icon={entry.icon} />
                <span className="text-ink">{entry.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Pictogramas en fila; los nombres van en texto para lectores y en el `title`. `large` en la ficha. */
export function HazardGlyphs({ ids, large = false, className }: { ids: readonly Hazard[]; large?: boolean; className?: string }) {
  const found = hazards.filter((entry) => ids.includes(entry.id));
  if (found.length === 0) return null;
  const names = found.map((entry) => entry.label).join(', ');
  return (
    <span className={cn('inline-flex items-center gap-1', className)} title={names}>
      {found.map((entry) => (
        <Pictogram key={entry.id} icon={entry.icon} className={large ? 'size-7 [&>svg:last-child]:size-3.5' : undefined} />
      ))}
      <span className="sr-only">Peligros: {names}</span>
    </span>
  );
}
